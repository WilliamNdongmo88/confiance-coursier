package com.confiancecoursier.backend.dispute.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.dispute.api.dto.OpenDisputeRequest;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Service de gestion des litiges.
 *
 * <h3>Règles métier :</h3>
 * <ul>
 *   <li>Un seul litige OPEN par course à la fois.</li>
 *   <li>Seuls le client propriétaire et le coursier assigné peuvent ouvrir un litige.</li>
 *   <li>L'ouverture bloque les fonds : {@code course.escrowStatus = DISPUTED}.</li>
 *   <li>La résolution (admin) applique la décision et remet la course en {@code COMPLETED}.</li>
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

    public DisputeService(DisputeRepository disputeRepository, CourseRepository courseRepository,
                          NotificationService notificationService) {
        this.disputeRepository = disputeRepository;
        this.courseRepository  = courseRepository;
        this.notificationService = notificationService;
    }

    // ─── Ouverture d'un litige ─────────────────────────────────────────────

    @Transactional
    public DisputeResponse openDispute(Long courseId, Long openedBy, OpenDisputeRequest req) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        // Vérifie que l'auteur est bien participant
        boolean isClient  = course.getClientId().equals(openedBy);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(openedBy);
        if (!isClient && !isCourier) {
            throw new BusinessException("Vous n'êtes pas participant à cette course.");
        }

        // Bloque les doublons : un seul litige OPEN par course
        disputeRepository.findByCourseIdAndStatus(courseId, "OPEN").ifPresent(existing -> {
            throw new BusinessException("Un litige est déjà ouvert pour cette course (#" + existing.getId() + ").");
        });

        // Bloque l'escrow
        course.setEscrowStatus("DISPUTED");
        course.setStatus("DISPUTED");
        courseRepository.save(course);

        Dispute dispute = Dispute.builder()
                .courseId(courseId)
                .openedBy(openedBy)
                .motifCode(req.motifCode())
                .description(req.description())
                .status("OPEN")
                .build();

        Dispute saved = disputeRepository.save(dispute);
        log.info("Litige ouvert : id={} courseId={} openedBy={} motif={}",
                saved.getId(), courseId, openedBy, req.motifCode());

        // Notification email admin + partie adverse
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
    public DisputeResponse resolveDispute(Long disputeId, Long adminId, String decision) {
        if (!VALID_DECISIONS.contains(decision.toUpperCase())) {
            throw new BusinessException("Décision invalide. Valeurs acceptées : " + VALID_DECISIONS);
        }

        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new BusinessException("Litige introuvable."));

        if (!"OPEN".equals(dispute.getStatus())) {
            throw new BusinessException("Ce litige est déjà résolu.");
        }

        dispute.setDecision(decision.toUpperCase());
        dispute.setDecidedBy(adminId);
        dispute.setDecidedAt(LocalDateTime.now());
        dispute.setStatus("RESOLVED");

        // Applique la décision sur la course
        Course course = courseRepository.findById(dispute.getCourseId()).orElse(null);
        if (course != null) {
            course.setStatus("COMPLETED");
            String escrowStatus = switch (decision.toUpperCase()) {
                case "REMBOURSEMENT_TOTAL", "REMBOURSEMENT_PARTIEL" -> "REFUNDED";
                case "LIBERATION" -> "RELEASED";
                default -> "RELEASED";
            };
            course.setEscrowStatus(escrowStatus);
            courseRepository.save(course);
        }

        Dispute resolved = disputeRepository.save(dispute);
        log.info("Litige {} résolu par admin {} — décision : {}", disputeId, adminId, decision);

        // Notification email client + coursier
        if (course != null) {
            notificationService.notifyDisputeResolved(course.getClientId(), course.getCourierId(), decision.toUpperCase());
        }

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
