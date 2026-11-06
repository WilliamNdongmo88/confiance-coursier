package com.confiancecoursier.backend.course.service;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Offres des coursiers (TICK-058) et acceptation par le client (TICK-059).
 *
 * <p>Une offre ne se crée que depuis le chat ({@link #submitOffer}). L'ancien
 * {@code POST /api/courses/{id}/offers}, qui contournait le minimum et l'arrondi, est supprimé.
 */
@Service
public class OfferService {

    private final CourseOfferRepository offerRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CommissionService commissionService;
    private final com.confiancecoursier.backend.review.service.ReviewGate reviewGate;

    public OfferService(CourseOfferRepository offerRepository,
                        CourseRepository courseRepository,
                        UserRepository userRepository,
                        NotificationService notificationService,
                        CommissionService commissionService,
                        com.confiancecoursier.backend.review.service.ReviewGate reviewGate) {
        this.reviewGate = reviewGate;
        this.offerRepository = offerRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.commissionService = commissionService;
    }

    /** Un utilisateur peut-il proposer des offres (rôle COURIER, compte actif, KYC APPROVED) ? */
    public static boolean canMakeOffers(User user) {
        return user != null
                && "COURIER".equalsIgnoreCase(user.getRole())
                && user.isActive()
                && "APPROVED".equals(user.getKycStatus());
    }

    /**
     * Crée ou remplace l'offre ACTIVE du coursier sur la course.
     * Règles : coursier KYC APPROVED, course PUBLISHED (sous verrou de ligne), montant entier XAF ≥ tarif minimum.
     * L'ancienne offre ACTIVE passe en SUPERSEDED avant l'insertion de la nouvelle.
     */
    @Transactional
    public CourseOffer submitOffer(Long courseId, Long courierId, BigDecimal amount, String details) {
        User courier = userRepository.findById(courierId)
                .orElseThrow(() -> new NotFoundException("Coursier non trouvé."));
        if (!canMakeOffers(courier)) {
            throw new ForbiddenException("Votre identité doit être vérifiée (KYC) avant de pouvoir proposer un tarif.");
        }
        reviewGate.requireNoPendingReview(courierId, "proposer un nouveau tarif"); // TICK-073
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Montant de l'offre invalide.");
        }
        BigDecimal rounded = amount.setScale(0, RoundingMode.HALF_UP);
        BigDecimal tarifMin = commissionService.getCommissionSettings().getTarifMinimumCoursier();
        if (tarifMin != null && rounded.compareTo(tarifMin) < 0) {
            throw new BusinessException("Le montant minimum est de "
                    + tarifMin.setScale(0, RoundingMode.HALF_UP).toPlainString() + " XAF.");
        }

        // Verrou de ligne : une acceptation concurrente ne peut pas se croiser avec une nouvelle offre
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));
        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new ConflictException("Cette course n'accepte plus d'offres.");
        }

        offerRepository.findByCourseIdAndCourierIdAndStatus(courseId, courierId, "ACTIVE")
                .ifPresent(prev -> {
                    prev.setStatus("SUPERSEDED");
                    // flush immédiat : l'index UNIQUE partiel (une seule ACTIVE) refuserait sinon l'INSERT suivant,
                    // exécuté tout de suite à cause de l'IDENTITY alors que l'UPDATE serait différé.
                    offerRepository.saveAndFlush(prev);
                });

        return offerRepository.save(CourseOffer.builder()
                .courseId(courseId)
                .courierId(courierId)
                .amount(rounded)
                .details(details == null || details.isBlank() ? null : details)
                .status("ACTIVE")
                .build());
    }

    public List<CourseOffer> getOffersForCourse(Long courseId) {
        return offerRepository.findByCourseId(courseId);
    }

    /**
     * Le client propriétaire accepte une offre ACTIVE : course ASSIGNED, coursier et montant fixés,
     * autres offres ACTIVE rejetées. Sous verrou de ligne : un double clic ne produit qu'une acceptation.
     */
    @Transactional
    public void acceptOffer(Long courseId, Long offerId, Long clientId) {
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
        }
        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new ConflictException("Cette course ne peut plus être attribuée (statut : " + course.getStatus() + ").");
        }

        CourseOffer offerToAccept = offerRepository.findById(offerId)
                .orElseThrow(() -> new NotFoundException("Offre non trouvée."));
        if (!offerToAccept.getCourseId().equals(courseId)) {
            throw new BusinessException("Cette offre ne correspond pas à la course.");
        }
        if (!"ACTIVE".equals(offerToAccept.getStatus())) {
            throw new ConflictException("Cette offre n'est plus active.");
        }
        // Le coursier doit toujours remplir les conditions (KYC révoqué, compte suspendu…)
        User courier = userRepository.findById(offerToAccept.getCourierId()).orElse(null);
        if (!canMakeOffers(courier)) {
            throw new ConflictException("Ce coursier ne peut plus être retenu (compte ou KYC non valide).");
        }

        offerToAccept.setStatus("ACCEPTED");
        offerRepository.save(offerToAccept);

        for (CourseOffer offer : offerRepository.findByCourseIdAndStatus(courseId, "ACTIVE")) {
            if (!offer.getId().equals(offerId)) {
                offer.setStatus("REJECTED");
                offerRepository.save(offer);
                notificationService.notifyCourierNotRetained(offer.getCourierId(), courseId);
            }
        }

        course.setCourierId(offerToAccept.getCourierId());
        course.setAcceptedOfferId(offerToAccept.getId());
        course.setCourseAmount(offerToAccept.getAmount().setScale(0, RoundingMode.HALF_UP));
        course.setStatus("ASSIGNED");
        courseRepository.save(course);

        notificationService.notifyCourseAssigned(offerToAccept.getCourierId(), courseId);
    }
}
