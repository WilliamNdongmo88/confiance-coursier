package com.confiancecoursier.backend.payment.service;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateRequest;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateResponse;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service de paiement et de validation des courses.
 *
 * <p>Les taux de commission sont lus dynamiquement depuis {@code platform_settings} :
 * <ul>
 *   <li>{@code commission_rate_client}  — % ajouté au total payé par le client (défaut 0 %)</li>
 *   <li>{@code commission_rate_courier} — % déduit du tarif reversé au coursier (défaut 20 %)</li>
 * </ul>
 *
 * <p>Calcul au moment du paiement initial :
 * <pre>
 *   base               = fraisReels + tarifCoursier
 *   fraisServiceClient = base × commissionRateClient / 100
 *   total              = base + fraisServiceClient          ← ce que paie le client
 * </pre>
 *
 * <p>Calcul au moment de la libération (validation) :
 * <pre>
 *   commissionCoursier = tarifCoursier × commissionRateCourier / 100
 *   montantCoursier    = tarifCoursier - commissionCoursier  ← ce que reçoit le coursier
 *   gainsPlateforme    = fraisServiceClient + commissionCoursier ← gains du système
 * </pre>
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final CourseRepository courseRepository;
    private final EscrowRepository escrowRepository;
    private final NotificationService notificationService;
    private final CommissionService commissionService;
    private final EscrowService escrowService;

    public PaymentService(CourseRepository courseRepository,
                          EscrowRepository escrowRepository,
                          NotificationService notificationService,
                          CommissionService commissionService,
                          EscrowService escrowService) {
        this.courseRepository    = courseRepository;
        this.escrowRepository    = escrowRepository;
        this.notificationService = notificationService;
        this.commissionService   = commissionService;
        this.escrowService       = escrowService;
    }

    // ─── Initiation du paiement ───────────────────────────────────────────────

    @Transactional
    public PaymentInitiateResponse initiate(PaymentInitiateRequest req, Long clientId) {

        // ── Idempotence : si la clé existe déjà, renvoyer la réponse sans double débit ──
        Optional<EscrowEntry> existing = escrowRepository.findByIdempotencyKey(req.getIdempotencyKey());
        if (existing.isPresent()) {
            EscrowEntry existingEntry = existing.get();
            Course existingCourse = courseRepository.findById(existingEntry.getCourseId())
                    .orElseThrow(() -> new BusinessException("Course introuvable"));
            // Une clé rejouée n'est valable que pour le même client et la même course
            if (!existingCourse.getClientId().equals(clientId)
                    || !existingEntry.getCourseId().equals(req.getCourseId())) {
                throw new ConflictException("Cette clé d'idempotence est déjà utilisée pour un autre paiement.");
            }
            log.info("[PAYMENT IDEMPOTENT] courseId={} ref={}", existingEntry.getCourseId(), existingEntry.getProviderRef());
            return PaymentInitiateResponse.builder()
                    .paymentRef(existingEntry.getProviderRef())
                    .totalAmount(existingEntry.getAmount())
                    .status(existingEntry.getStatus())
                    .courseId(existingEntry.getCourseId())
                    .build();
        }

        // ── Verrou pessimiste — empêche le double paiement concurrent ──────────
        Course course = courseRepository.findByIdForUpdate(req.getCourseId())
                .orElseThrow(() -> new BusinessException("Course introuvable"));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Cette course ne vous appartient pas");
        }

        // Préconditions strictes (TICK-060)
        if (!"ASSIGNED".equals(course.getStatus())) {
            throw new ConflictException(
                    "Le paiement n'est possible qu'après acceptation d'une offre (statut actuel : "
                    + course.getStatus() + ").");
        }
        if (course.getCourierId() == null) {
            throw new BusinessException("Aucun coursier assigné à cette course.");
        }
        if (course.getCourseAmount() == null) {
            throw new BusinessException("Le montant de l'offre acceptée est introuvable.");
        }

        // ── Tarif lu du serveur — jamais du frontend ───────────────────────────
        BigDecimal tarifCoursier = course.getCourseAmount().setScale(0, RoundingMode.HALF_UP);
        BigDecimal fraisReels    = req.getFraisReels().setScale(0, RoundingMode.HALF_UP);

        // ── Lire les taux dynamiquement depuis platform_settings ──────────────
        var settings = commissionService.getCommissionSettings();
        BigDecimal clientRate  = settings.getCommissionRateClient();   // ex. 5.00
        BigDecimal courierRate = settings.getCommissionRateCourier();  // ex. 20.00

        // ── Calcul côté serveur ───────────────────────────────────────────────
        BigDecimal base               = fraisReels.add(tarifCoursier);
        BigDecimal fraisServiceClient = base.multiply(clientRate)
                                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        BigDecimal total              = base.add(fraisServiceClient);

        BigDecimal commissionCoursier = tarifCoursier
                                            .multiply(courierRate)
                                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        BigDecimal montantCoursier    = tarifCoursier.subtract(commissionCoursier).add(fraisReels);
        BigDecimal gainsPlateforme    = fraisServiceClient.add(commissionCoursier);

        // ── Persistance ───────────────────────────────────────────────────────
        String ref = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        course.setStatus("IN_PROGRESS");
        course.setPaidAt(LocalDateTime.now());
        course.setRealCosts(fraisReels);
        course.setCommissionRate(clientRate);
        course.setCommissionAmount(fraisServiceClient);
        course.setTotalAmount(total);
        course.setCommissionRateCourier(courierRate);
        course.setCourierAmount(montantCoursier);
        course.setPlatformFeeAmount(gainsPlateforme);
        course.setIdempotencyKey(req.getIdempotencyKey());
        courseRepository.save(course);

        // HOLD écrit par EscrowService (seul autorisé à toucher au séquestre — TICK-061)
        escrowService.hold(course, total, req.getPaymentMethod().toUpperCase(), ref, req.getIdempotencyKey());

        log.info("[PAYMENT] courseId={} total={} XAF (fraisReels={} + tarif={} + fraisClient={}) | " +
                 "coursier recevra={} XAF | gainsPlateforme={} XAF | method={} ref={}",
                req.getCourseId(), total, fraisReels, tarifCoursier, fraisServiceClient,
                montantCoursier, gainsPlateforme, req.getPaymentMethod(), ref);

        notificationService.notifyPaymentReceived(course.getClientId(), course.getCourierId(), total);

        return PaymentInitiateResponse.builder()
                .paymentRef(ref)
                .totalAmount(total)
                .status("CONFIRMED")
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
        // Verrou de ligne : empêche une double libération (clic + scheduler 72 h)
        Course course = courseRepository.findByIdForUpdate(courseId)
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

        // Notification email au coursier
        notificationService.notifyCourseValidated(course.getCourierId(), courseId);

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
        var candidates = courseRepository.findByStatusOrderByCreatedAtDesc("PROOFS_SUBMITTED")
                .stream()
                .filter(c -> c.getAutoValidateAt() != null && !c.getAutoValidateAt().isAfter(now))
                .map(Course::getId)
                .toList();

        int count = 0;
        for (Long id : candidates) {
            // Rechargée sous verrou : une validation manuelle concurrente a pu passer avant
            Course course = courseRepository.findByIdForUpdate(id).orElse(null);
            if (course == null || !"PROOFS_SUBMITTED".equals(course.getStatus())) {
                continue;
            }
            applyValidation(course);
            notificationService.notifyAutoValidation(course.getClientId(), course.getCourierId(), course.getId());
            log.info("[AUTO-VALIDATION] courseId={} validée automatiquement (autoValidateAt={})",
                    course.getId(), course.getAutoValidateAt());
            count++;
        }
        return count;
    }

    // ─── Logique de validation commune ────────────────────────────────────────

    /**
     * Délègue la libération de l'escrow à {@link EscrowService} (TICK-061).
     * EscrowService écrit les entrées COURIER_PAYOUT + PLATFORM_FEE et passe la course en COMPLETED.
     */
    private void applyValidation(Course course) {
        course.setCompletedAt(LocalDateTime.now());
        escrowService.release(course);
        log.info("[VALIDATION] courseId={} → COMPLETED via EscrowService", course.getId());
    }
}
