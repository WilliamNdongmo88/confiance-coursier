package com.confiancecoursier.backend.review.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.review.api.dto.ReviewResponse;
import com.confiancecoursier.backend.review.api.dto.SubmitReviewRequest;
import com.confiancecoursier.backend.review.domain.Review;
import com.confiancecoursier.backend.review.repository.ReviewRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service gérant les avis et notations post-course.
 *
 * <h3>Règles métier :</h3>
 * <ul>
 *   <li>La course doit être en statut {@code COMPLETED}.</li>
 *   <li>Un utilisateur ne peut noter qu'une seule fois par course.</li>
 *   <li>Le CLIENT note le COURIER ; le COURIER note le CLIENT.</li>
 *   <li>Le {@code trustScore} de la cible est recalculé en moyenne glissante après chaque note.</li>
 *   <li>Si le COURIER reçoit 2 notes ≤ 2⭐ sur les 30 derniers jours → suspension automatique.</li>
 * </ul>
 */
@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    /** Seuil : 2 mauvaises notes (≤ 2⭐) en 30 jours → suspension automatique du coursier. */
    private static final int BAD_RATING_THRESHOLD   = 2;
    private static final int BAD_RATING_WINDOW_DAYS = 30;
    private static final int BAD_RATING_MAX_STARS   = 2;

    private final ReviewRepository  reviewRepository;
    private final CourseRepository  courseRepository;
    private final UserRepository    userRepository;
    private final NotificationService notificationService;

    public ReviewService(ReviewRepository reviewRepository,
                         CourseRepository courseRepository,
                         UserRepository userRepository,
                         NotificationService notificationService) {
        this.reviewRepository = reviewRepository;
        this.courseRepository = courseRepository;
        this.userRepository   = userRepository;
        this.notificationService = notificationService;
    }

    // ─── Soumission d'un avis ─────────────────────────────────────────────────

    /**
     * Soumet un avis sur une course.
     *
     * @param courseId identifiant de la course
     * @param authorId identifiant de l'utilisateur authentifié
     * @param request  corps de la requête (stars + comment)
     * @return         l'avis créé
     */
    @Transactional
    public ReviewResponse submitReview(Long courseId, Long authorId, SubmitReviewRequest request) {

        // ── Chargement et vérifications ──────────────────────────────────────
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        if (!"COMPLETED".equals(course.getStatus())) {
            throw new BusinessException(
                "La notation n'est possible que pour une course terminée (COMPLETED). "
                + "Statut actuel : " + course.getStatus());
        }

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable."));

        // Vérifie que l'auteur est bien participant à la course
        boolean isClient  = course.getClientId().equals(authorId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(authorId);
        if (!isClient && !isCourier) {
            throw new BusinessException("Vous n'êtes pas participant à cette course.");
        }

        // Double notation interdite
        reviewRepository.findByCourseIdAndAuthorId(courseId, authorId).ifPresent(existing -> {
            throw new BusinessException("Vous avez déjà noté cette course.");
        });

        // ── Détermination de la cible ─────────────────────────────────────────
        String reviewerRole;
        Long   targetId;

        if (isClient) {
            // Le client note le coursier
            if (course.getCourierId() == null) {
                throw new BusinessException("Aucun coursier assigné à cette course.");
            }
            reviewerRole = "CLIENT";
            targetId     = course.getCourierId();
        } else {
            // Le coursier note le client
            reviewerRole = "COURIER";
            targetId     = course.getClientId();
        }

        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new BusinessException("Utilisateur cible introuvable."));

        // ── Sauvegarde de l'avis ──────────────────────────────────────────────
        Review review = Review.builder()
                .courseId(courseId)
                .authorId(authorId)
                .targetId(targetId)
                .reviewerRole(reviewerRole)
                .stars(request.stars())
                .comment(request.comment())
                .build();

        Review saved = reviewRepository.save(review);
        log.info("Avis soumis : courseId={} authorId={} targetId={} stars={}",
                courseId, authorId, targetId, request.stars());

        // ── Notification de la note reçue (coursier uniquement) ──────────────
        if ("COURIER".equals(target.getRole())) {
            notificationService.notifyBadRating(targetId, request.stars());
        }

        // ── Mise à jour du trustScore de la cible ────────────────────────────
        updateTrustScore(target);

        // ── Règle de suspension automatique (coursiers uniquement) ───────────
        if ("COURIER".equals(target.getRole())) {
            checkAndSuspendIfNeeded(target);
        }

        return ReviewResponse.from(saved);
    }

    // ─── Lecture des avis ─────────────────────────────────────────────────────

    /**
     * Retourne tous les avis d'une course.
     * Accessible par le client ET le coursier participant.
     */
    public List<ReviewResponse> getReviewsByCourse(Long courseId, Long requesterId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        boolean isClient  = course.getClientId().equals(requesterId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(requesterId);
        if (!isClient && !isCourier) {
            throw new BusinessException("Vous n'avez pas accès aux avis de cette course.");
        }

        return reviewRepository.findByCourseId(courseId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    // ─── Logique interne ──────────────────────────────────────────────────────

    /**
     * Recalcule le {@code trustScore} d'un utilisateur comme moyenne glissante
     * de toutes les notes reçues.
     */
    private void updateTrustScore(User target) {
        List<Review> allReviews = reviewRepository.findByTargetId(target.getId());
        if (allReviews.isEmpty()) return;

        double average = allReviews.stream()
                .mapToInt(Review::getStars)
                .average()
                .orElse(0.0);

        target.setTrustScore(BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP));
        userRepository.save(target);
        log.info("trustScore mis à jour : userId={} score={}", target.getId(), target.getTrustScore());
    }

    /**
     * Règle de qualité : si un coursier reçoit ≥ 2 notes ≤ 2⭐ sur 30 jours glissants,
     * son compte est suspendu automatiquement.
     */
    private void checkAndSuspendIfNeeded(User courier) {
        LocalDateTime since = LocalDateTime.now().minusDays(BAD_RATING_WINDOW_DAYS);

        long badRecentRatings = reviewRepository.findByTargetId(courier.getId())
                .stream()
                .filter(r -> r.getStars() <= BAD_RATING_MAX_STARS)
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isAfter(since))
                .count();

        if (badRecentRatings >= BAD_RATING_THRESHOLD) {
            courier.setStatus("SUSPENDED");
            userRepository.save(courier);
            log.warn("[SUSPENSION AUTO] courierId={} suspendu après {} notes ≤ {}⭐ en {} jours.",
                    courier.getId(), badRecentRatings, BAD_RATING_MAX_STARS, BAD_RATING_WINDOW_DAYS);

            // Notification suspension au coursier + admin
            notificationService.notifySuspension(courier.getId());
        }
    }
}
