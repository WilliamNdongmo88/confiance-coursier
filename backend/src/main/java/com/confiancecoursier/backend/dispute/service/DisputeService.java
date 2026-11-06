package com.confiancecoursier.backend.dispute.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.dispute.api.dto.OpenDisputeRequest;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Service de gestion des litiges.
 *
 * <h3>Règles métier :</h3>
 * <ul>
 *   <li>Un seul litige OPEN par course à la fois (verrou + index UNIQUE partiel V14).</li>
 *   <li>Seuls le client propriétaire et le coursier assigné peuvent ouvrir un litige,
 *       en IN_PROGRESS ou PROOFS_SUBMITTED, avec un motif de leur rôle (TICK-062).</li>
 *   <li>L'ouverture gèle les fonds : {@code course.escrowStatus = DISPUTED}.</li>
 *   <li>La résolution (admin) passe par {@link EscrowService} : COMPLETED, REFUNDED ou partage.</li>
 * </ul>
 */
@Service
public class DisputeService {

    private static final Logger log = LoggerFactory.getLogger(DisputeService.class);

    private static final Set<String> VALID_DECISIONS =
        Set.of("REMBOURSEMENT_TOTAL", "REMBOURSEMENT_PARTIEL", "LIBERATION", "SANCTION");

    private final DisputeRepository disputeRepository;
    private final CourseRepository  courseRepository;
    private final NotificationService notificationService;
    private final EscrowService escrowService;

    public DisputeService(DisputeRepository disputeRepository, CourseRepository courseRepository,
                          NotificationService notificationService, EscrowService escrowService) {
        this.disputeRepository = disputeRepository;
        this.courseRepository  = courseRepository;
        this.notificationService = notificationService;
        this.escrowService = escrowService;
    }

    // ─── Ouverture d'un litige ─────────────────────────────────────────────

    /** Statuts dans lesquels un litige peut être ouvert : fonds en séquestre, course non clôturée (TICK-062, OVERDUE : TICK-065b). */
    static final Set<String> DISPUTABLE_STATUSES = Set.of("IN_PROGRESS", "OVERDUE", "PROOFS_SUBMITTED");

    /** Motifs autorisés par partie (spec fonctionnelle §litiges). */
    static final Set<String> CLIENT_MOTIFS  = Set.of("L-C1", "L-C2", "L-C3", "L-C4", "L-C5", "L-C6");
    static final Set<String> COURIER_MOTIFS = Set.of("L-F1", "L-F2", "L-F3", "L-F4");

    /**
     * Ouvre un litige (TICK-062).
     * <ul>
     *   <li>Seuls le client propriétaire et le coursier assigné peuvent l'ouvrir.</li>
     *   <li>Course en IN_PROGRESS ou PROOFS_SUBMITTED uniquement (fonds en séquestre).</li>
     *   <li>Un seul litige OPEN par course : verrou de ligne + index UNIQUE partiel (V14).</li>
     *   <li>Motifs L-C* réservés au client, L-F* au coursier.</li>
     *   <li>La course passe en DISPUTED : le scheduler 72 h ne la traite plus (il ne prend que PROOFS_SUBMITTED).</li>
     * </ul>
     */
    @Transactional
    public DisputeResponse openDispute(Long courseId, Long openedBy, OpenDisputeRequest req) {
        // Verrou de ligne : deux ouvertures simultanées (client + coursier) sont sérialisées
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        boolean isClient  = course.getClientId().equals(openedBy);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(openedBy);
        if (!isClient && !isCourier) {
            throw new ForbiddenException("Vous n'êtes pas participant à cette course.");
        }

        String motif = req.motifCode() == null ? "" : req.motifCode().trim().toUpperCase();
        if (!(isClient ? CLIENT_MOTIFS : COURIER_MOTIFS).contains(motif)) {
            throw new BusinessException(isClient
                    ? "Motif invalide pour un client (L-C1 à L-C6)."
                    : "Motif invalide pour un coursier (L-F1 à L-F4).");
        }

        disputeRepository.findByCourseIdAndStatus(courseId, "OPEN").ifPresent(existing -> {
            throw new ConflictException("Un litige est déjà ouvert pour cette course (#" + existing.getId() + ").");
        });

        if (!DISPUTABLE_STATUSES.contains(course.getStatus())) {
            throw new ConflictException("Un litige ne peut être ouvert que sur une course payée en cours ou "
                    + "dont les preuves sont soumises (statut actuel : " + course.getStatus() + ").");
        }

        // Gèle le séquestre (seul EscrowService modifie escrowStatus) puis la course
        escrowService.markDisputed(course);
        course.setStatus("DISPUTED");
        courseRepository.save(course);

        Dispute saved = disputeRepository.save(Dispute.builder()
                .courseId(courseId)
                .openedBy(openedBy)
                .motifCode(motif)
                .description(req.description())
                .status("OPEN")
                .build());
        log.info("Litige ouvert : id={} courseId={} openedBy={} motif={}", saved.getId(), courseId, openedBy, motif);

        notificationService.notifyDisputeOpened(openedBy, courseId);
        return DisputeResponse.from(saved);
    }

    // ─── Lecture ──────────────────────────────────────────────────────────

    public DisputeResponse getDispute(Long disputeId, Long requesterId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new BusinessException("Litige introuvable."));

        Course course = courseRepository.findById(dispute.getCourseId())
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        boolean isParticipant = course.getClientId().equals(requesterId)
                || (course.getCourierId() != null && course.getCourierId().equals(requesterId));

        if (!isParticipant) {
            throw new BusinessException("Accès refusé à ce litige.");
        }

        return DisputeResponse.from(dispute);
    }

    // ─── Résolution (admin) ───────────────────────────────────────────────

    @Transactional
    public DisputeResponse resolveDispute(Long disputeId, Long adminId, String decision,
                                          BigDecimal refundAmount) {
        if (decision == null || !VALID_DECISIONS.contains(decision.toUpperCase())) {
            throw new BusinessException("Décision invalide. Valeurs acceptées : " + VALID_DECISIONS);
        }

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new BusinessException("Litige introuvable."));

        if (!"OPEN".equals(dispute.getStatus())) {
            throw new BusinessException("Ce litige est déjà résolu.");
        }

        // Verrou de ligne : la décision et une éventuelle autre action ne peuvent pas se croiser
        Course course = courseRepository.findByIdForUpdate(dispute.getCourseId())
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        // ── Appliquer la décision via EscrowService (TICK-061) ────────────────
        switch (decision.toUpperCase()) {
            case "REMBOURSEMENT_TOTAL" -> {
                boolean refundFees = escrowService.shouldRefundPlatformFeesOnFullRefund();
                escrowService.refundTotal(course, refundFees);
            }
            // Partage : refundAmount au client, frais plateforme puis solde au coursier (ledger équilibré)
            case "REMBOURSEMENT_PARTIEL" -> escrowService.split(course, refundAmount);
            case "LIBERATION" -> escrowService.release(course);
            case "SANCTION"   -> escrowService.release(course); // libération malgré sanction (admin décide)
        }

        dispute.setDecision(decision.toUpperCase());
        dispute.setRefundAmount("REMBOURSEMENT_PARTIEL".equalsIgnoreCase(decision) ? refundAmount : null);
        dispute.setDecidedBy(adminId);
        dispute.setDecidedAt(LocalDateTime.now());
        dispute.setStatus("RESOLVED");

        Dispute resolved = disputeRepository.save(dispute);
        log.info("Litige {} résolu par admin {} — décision : {} refundAmount={}",
                disputeId, adminId, decision, refundAmount);

        // Notification email client + coursier
        notificationService.notifyDisputeResolved(
                course.getClientId(), course.getCourierId(), decision.toUpperCase());

        return DisputeResponse.from(resolved);
    }

    // ─── Listage (admin) ──────────────────────────────────────────────────

    /**
     * Liste tous les litiges, éventuellement filtrés par statut.
     *
     * @param status statut filtrant (OPEN, RESOLVED…) ou null pour tout
     * @return la liste des litiges au format DTO
     */
    public List<DisputeResponse> getDisputesByStatus(String status) {
        List<Dispute> disputes = (status == null || status.isBlank())
                ? disputeRepository.findAll()
                : disputeRepository.findByStatus(status.toUpperCase());
        return disputes.stream().map(DisputeResponse::from).toList();
    }
}
