package com.confiancecoursier.backend.payment.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateRequest;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateResponse;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service de paiement et de validation des courses.
 *
 * <p>Taux de commission client par défaut : 5 %
 * (sera lu depuis {@code platform_settings} quand l'admin sera implémenté — TICK-038)
 *
 * <p>Calcul du total lors du paiement initial :
 * <pre>
 *   base          = fraisReels + tarifCoursier
 *   fraisService  = base × 5 / 100
 *   total         = base + fraisService
 * </pre>
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** Taux de frais de service côté client (5 %). Configurable via platform_settings (TICK-038). */
    private static final BigDecimal CLIENT_FEE_RATE = new BigDecimal("5.00");

    private final CourseRepository courseRepository;
    private final EscrowRepository escrowRepository;

    public PaymentService(CourseRepository courseRepository, EscrowRepository escrowRepository) {
        this.courseRepository = courseRepository;
        this.escrowRepository = escrowRepository;
    }

    // ─── Initiation du paiement ───────────────────────────────────────────────

    @Transactional
    public PaymentInitiateResponse initiate(PaymentInitiateRequest req, Long clientId) {
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new BusinessException("Course introuvable"));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Cette course ne vous appartient pas");
        }

        if ("IN_PROGRESS".equals(course.getStatus()) || "COMPLETED".equals(course.getStatus())) {
            throw new BusinessException("Cette course a déjà été payée");
        }

        // Calcul côté serveur (ne pas faire confiance au frontend)
        BigDecimal base         = req.getFraisReels().add(req.getTarifCoursier());
        BigDecimal fraisService = base.multiply(CLIENT_FEE_RATE)
                                      .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total        = base.add(fraisService);

        course.setStatus("IN_PROGRESS");
        course.setEscrowStatus("HELD");
        course.setCourseAmount(req.getTarifCoursier());
        course.setCommissionRate(CLIENT_FEE_RATE);
        course.setCommissionAmount(fraisService);
        course.setTotalAmount(total);
        courseRepository.save(course);

        String ref = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        EscrowEntry entry = EscrowEntry.builder()
                .courseId(req.getCourseId())
                .entryType("HOLD")
                .amount(total)
                .provider(req.getPaymentMethod().toUpperCase())
                .providerRef(ref)
                .status("PENDING")
                .build();
        escrowRepository.save(entry);

        log.info("[PAYMENT SIMULÉ] courseId={} total={} XAF method={} ref={}",
                req.getCourseId(), total, req.getPaymentMethod(), ref);

        return PaymentInitiateResponse.builder()
                .paymentRef(ref)
                .totalAmount(total)
                .status("PENDING")
                .courseId(req.getCourseId())
                .build();
    }

    // ─── Validation manuelle par le client ────────────────────────────────────

    /**
     * Valide une course après examen des preuves par le client.
     *
     * <ul>
     *   <li>Statut requis : {@code PROOFS_SUBMITTED}</li>
     *   <li>Seul le client propriétaire peut valider</li>
     *   <li>Met la course en {@code COMPLETED}, libère l'escrow (simulé)</li>
     * </ul>
     */
    @Transactional
    public void validateCourse(Long courseId, Long clientId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Vous n'êtes pas le propriétaire de cette course.");
        }

        if (!"PROOFS_SUBMITTED".equals(course.getStatus())) {
            throw new BusinessException(
                "La validation n'est possible qu'après soumission des preuves. "
                + "Statut actuel : " + course.getStatus());
        }

        applyValidation(course);
        log.info("[VALIDATION CLIENT] courseId={} validé par clientId={}", courseId, clientId);
    }

    // ─── Auto-validation (appelée par le scheduler) ────────────────────────────

    /**
     * Applique la validation automatique sur toutes les courses dont
     * {@code auto_validate_at <= now} et dont le statut est {@code PROOFS_SUBMITTED}.
     *
     * @return nombre de courses auto-validées
     */
    @Transactional
    public int autoValidateExpiredCourses() {
        LocalDateTime now = LocalDateTime.now();
        var courses = courseRepository.findByStatusOrderByCreatedAtDesc("PROOFS_SUBMITTED")
                .stream()
                .filter(c -> c.getAutoValidateAt() != null && !c.getAutoValidateAt().isAfter(now))
                .toList();

        for (Course course : courses) {
            applyValidation(course);
            log.info("[AUTO-VALIDATION] courseId={} validée automatiquement (autoValidateAt={})",
                    course.getId(), course.getAutoValidateAt());
        }
        return courses.size();
    }

    // ─── Logique de validation commune ────────────────────────────────────────

    /**
     * Transition COMPLETED + RELEASED sur la course et entrée RELEASE en escrow.
     */
    private void applyValidation(Course course) {
        course.setStatus("COMPLETED");
        course.setEscrowStatus("RELEASED");
        course.setCompletedAt(LocalDateTime.now());
        courseRepository.save(course);

        BigDecimal releaseAmount = course.getTotalAmount() != null
                ? course.getTotalAmount()
                : BigDecimal.ZERO;

        String ref = "REL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        EscrowEntry release = EscrowEntry.builder()
                .courseId(course.getId())
                .entryType("RELEASE")
                .amount(releaseAmount)
                .provider("SIMULATED")
                .providerRef(ref)
                .status("CONFIRMED")
                .build();
        escrowRepository.save(release);

        log.info("[ESCROW SIMULÉ] RELEASE courseId={} montant={} XAF ref={}",
                course.getId(), releaseAmount, ref);
    }
}
