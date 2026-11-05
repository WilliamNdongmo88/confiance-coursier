package com.confiancecoursier.backend.payment.service;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Point d'entrée unique pour le séquestre (TICK-061) : c'est le seul code qui écrit dans
 * {@code escrow_ledger} et qui modifie {@code courses.escrow_status}.
 *
 * <h3>Convention de signe</h3>
 * <pre>
 *   HOLD            +total      (encaissement)
 *   COURIER_PAYOUT  −y          (versement coursier)
 *   PLATFORM_FEE    −z          (gains plateforme)
 *   REFUND_CLIENT   −x          (remboursement client)
 * </pre>
 * <b>Invariant</b> : pour toute course clôturée, x + y + z = total, donc la somme du ledger vaut 0.
 * Il est vérifié après chaque clôture ; en cas d'écart la transaction est annulée.
 *
 * <p>Les méthodes de clôture supposent que l'appelant a chargé la course avec
 * {@code CourseRepository.findByIdForUpdate} (verrou de ligne) dans la même transaction.
 */
@Service
public class EscrowService {

    private static final Logger log = LoggerFactory.getLogger(EscrowService.class);

    private final EscrowRepository  escrowRepository;
    private final CourseRepository  courseRepository;
    private final CommissionService commissionService;

    public EscrowService(EscrowRepository escrowRepository,
                         CourseRepository courseRepository,
                         CommissionService commissionService) {
        this.escrowRepository  = escrowRepository;
        this.courseRepository  = courseRepository;
        this.commissionService = commissionService;
    }

    // ─── Encaissement ─────────────────────────────────────────────────────────

    /** Écrit le HOLD (+total) et place les fonds en séquestre. */
    @Transactional(propagation = Propagation.MANDATORY)
    public EscrowEntry hold(Course course, BigDecimal total, String provider, String providerRef, String idempotencyKey) {
        if (course.getEscrowStatus() != null || escrowRepository.existsByCourseIdAndEntryType(course.getId(), "HOLD")) {
            throw new ConflictException("Cette course a déjà été payée.");
        }
        EscrowEntry entry = escrowRepository.save(EscrowEntry.builder()
                .courseId(course.getId())
                .entryType("HOLD")
                .amount(xaf(total))
                .provider(provider)
                .providerRef(providerRef)
                .status("CONFIRMED")
                .idempotencyKey(idempotencyKey)
                .build());
        course.setEscrowStatus("HELD");
        courseRepository.save(course);
        return entry;
    }

    /** Gèle le séquestre pendant un litige. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void markDisputed(Course course) {
        assertHeld(course);
        course.setEscrowStatus("DISPUTED");
        courseRepository.save(course);
    }

    // ─── Libération (validation client, 72 h, litige en faveur du coursier) ──

    /** COURIER_PAYOUT −(tarif − commission + frais réels), PLATFORM_FEE −(frais client + commission). Course COMPLETED. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void release(Course course) {
        assertHeld(course);
        BigDecimal total   = heldTotal(course);
        BigDecimal courier = xaf(course.getCourierAmount());
        BigDecimal platform = total.subtract(courier);
        if (courier.signum() < 0 || platform.signum() < 0) {
            throw new IllegalStateException("Montants incohérents pour la course " + course.getId()
                    + " : total=" + total + " coursier=" + courier);
        }
        if (course.getPlatformFeeAmount() != null && xaf(course.getPlatformFeeAmount()).compareTo(platform) != 0) {
            log.warn("[ESCROW] courseId={} platformFeeAmount={} ≠ total−coursier={} : la valeur équilibrée est utilisée",
                    course.getId(), course.getPlatformFeeAmount(), platform);
        }

        write(course.getId(), "COURIER_PAYOUT", courier, "CPO");
        write(course.getId(), "PLATFORM_FEE",   platform, "PFE");

        course.setStatus("COMPLETED");
        course.setEscrowStatus("RELEASED");
        if (course.getCompletedAt() == null) course.setCompletedAt(LocalDateTime.now());
        close(course);
        log.info("[ESCROW RELEASE] courseId={} coursier={} plateforme={} XAF", course.getId(), courier, platform);
    }

    // ─── Remboursement total ──────────────────────────────────────────────────

    /**
     * Remboursement total. {@code refundPlatformFees = false} : le client récupère tarif + frais réels,
     * la plateforme garde ses frais de service client. {@code true} : le client récupère le total.
     * Le paramètre appliqué est figé sur la course. Course REFUNDED.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void refundTotal(Course course, boolean refundPlatformFees) {
        assertHeld(course);
        BigDecimal total = heldTotal(course);
        BigDecimal clientFee = refundPlatformFees ? BigDecimal.ZERO : xaf(course.getCommissionAmount()).min(total);
        BigDecimal refund = total.subtract(clientFee);

        write(course.getId(), "REFUND_CLIENT", refund, "RFC");
        if (clientFee.signum() > 0) {
            write(course.getId(), "PLATFORM_FEE", clientFee, "PFE");
        }

        course.setRefundPlatformFees(refundPlatformFees);
        course.setStatus("REFUNDED");
        course.setEscrowStatus("REFUNDED");
        if (course.getCompletedAt() == null) course.setCompletedAt(LocalDateTime.now());
        close(course);
        log.info("[ESCROW REFUND] courseId={} client={} plateforme={} XAF (refundFees={})",
                course.getId(), refund, clientFee, refundPlatformFees);
    }

    // ─── Partage (litige) ─────────────────────────────────────────────────────

    /**
     * Partage décidé par l'admin : {@code refundAmount} (x) au client, avec 0 &lt; x &lt; total.
     * La plateforme perçoit ses frais dans la limite de ce qui reste : z = min(frais plateforme, total − x).
     * Le coursier reçoit le solde : y = total − x − z. Course COMPLETED, séquestre SPLIT.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void split(Course course, BigDecimal refundAmount) {
        assertHeld(course);
        BigDecimal total = heldTotal(course);
        if (refundAmount == null) {
            throw new BusinessException("Le montant remboursé au client est obligatoire pour un partage.");
        }
        BigDecimal x = xaf(refundAmount);
        if (x.signum() <= 0 || x.compareTo(total) >= 0) {
            throw new BusinessException("Le montant remboursé au client doit être compris strictement entre 0 et "
                    + total.toPlainString() + " XAF.");
        }
        BigDecimal platformFee = total.subtract(xaf(course.getCourierAmount())).max(BigDecimal.ZERO);
        BigDecimal z = platformFee.min(total.subtract(x));
        BigDecimal y = total.subtract(x).subtract(z);

        write(course.getId(), "REFUND_CLIENT", x, "RFC");
        if (y.signum() > 0) write(course.getId(), "COURIER_PAYOUT", y, "CPO");
        if (z.signum() > 0) write(course.getId(), "PLATFORM_FEE",   z, "PFE");

        course.setStatus("COMPLETED");
        course.setEscrowStatus("SPLIT");
        if (course.getCompletedAt() == null) course.setCompletedAt(LocalDateTime.now());
        close(course);
        log.info("[ESCROW SPLIT] courseId={} client={} coursier={} plateforme={} XAF", course.getId(), x, y, z);
    }

    // ─── Paramètres ───────────────────────────────────────────────────────────

    /** {@code refund_platform_fees_on_full_refund} (défaut : false). */
    public boolean shouldRefundPlatformFeesOnFullRefund() {
        return commissionService.getBooleanSetting("refund_platform_fees_on_full_refund", false);
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private void assertHeld(Course course) {
        if (!"HELD".equals(course.getEscrowStatus()) && !"DISPUTED".equals(course.getEscrowStatus())) {
            throw new ConflictException("Les fonds de cette course ne sont pas en séquestre (escrowStatus="
                    + course.getEscrowStatus() + ").");
        }
    }

    /** Montant réellement encaissé, lu du ledger (source de vérité), à défaut de la course. */
    private BigDecimal heldTotal(Course course) {
        BigDecimal held = xaf(escrowRepository.sumByCourseId(course.getId()));
        if (held.signum() <= 0) {
            throw new IllegalStateException("Aucun montant en séquestre pour la course " + course.getId());
        }
        return held;
    }

    /** Écrit une sortie de séquestre (montant négatif). */
    private void write(Long courseId, String type, BigDecimal amount, String refPrefix) {
        escrowRepository.save(EscrowEntry.builder()
                .courseId(courseId)
                .entryType(type)
                .amount(amount.negate())
                .provider("SIMULATED")
                .providerRef(refPrefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("CONFIRMED")
                .build());
    }

    /** Sauvegarde la course et vérifie l'invariant « somme du ledger = 0 ». */
    private void close(Course course) {
        courseRepository.save(course);
        escrowRepository.flush();
        BigDecimal balance = escrowRepository.sumByCourseId(course.getId());
        if (balance.signum() != 0) {
            throw new IllegalStateException("Ledger déséquilibré pour la course " + course.getId() + " : " + balance);
        }
    }

    private static BigDecimal xaf(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(0, RoundingMode.HALF_UP);
    }
}
