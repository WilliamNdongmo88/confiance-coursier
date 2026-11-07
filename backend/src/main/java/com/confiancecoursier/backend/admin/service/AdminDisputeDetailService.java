package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.AdminDisputeDetailResponse;
import com.confiancecoursier.backend.admin.api.dto.AdminDisputeDetailResponse.Amounts;
import com.confiancecoursier.backend.admin.api.dto.AdminDisputeDetailResponse.CourseInfo;
import com.confiancecoursier.backend.admin.api.dto.AdminDisputeDetailResponse.Party;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Assemble le dossier d'un litige pour l'admin : course, parties, montants bloqués, preuves, discussion.
 * Lecture seule ; la décision reste dans {@code DisputeService#resolveDispute}.
 */
@Service
public class AdminDisputeDetailService {

    private final DisputeRepository disputeRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EscrowRepository escrowRepository;
    private final EscrowService escrowService;
    private final ProofService proofService;
    private final ChatRoomRepository chatRoomRepository;

    public AdminDisputeDetailService(DisputeRepository disputeRepository, CourseRepository courseRepository,
                                     UserRepository userRepository, EscrowRepository escrowRepository,
                                     EscrowService escrowService, ProofService proofService,
                                     ChatRoomRepository chatRoomRepository) {
        this.disputeRepository = disputeRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.escrowRepository = escrowRepository;
        this.escrowService = escrowService;
        this.proofService = proofService;
        this.chatRoomRepository = chatRoomRepository;
    }

    @Transactional(readOnly = true)
    public AdminDisputeDetailResponse getDetail(Long disputeId) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new NotFoundException("Litige introuvable."));
        Course course = courseRepository.findById(dispute.getCourseId())
                .orElseThrow(() -> new NotFoundException("Course introuvable."));

        String openedByRole = dispute.getOpenedBy() != null && dispute.getOpenedBy().equals(course.getCourierId())
                ? "COURIER" : "CLIENT";

        Long roomId = course.getCourierId() == null ? null
                : chatRoomRepository.findByCourseIdAndCourierId(course.getId(), course.getCourierId())
                        .map(ChatRoom::getId).orElse(null);

        return new AdminDisputeDetailResponse(
                DisputeResponse.from(dispute),
                openedByRole,
                party(course.getClientId()),
                party(course.getCourierId()),
                new CourseInfo(course.getId(), course.getDescription(), course.getZone(), course.getStatus(),
                        course.getEscrowStatus(), course.getPaidAt(), course.getProofDeadline(), course.getCompletedAt()),
                amounts(course),
                proofService.getProofsForAdmin(course.getId()),
                roomId);
    }

    /** Mêmes formules que {@code EscrowService.release / refundTotal}, sans rien écrire. */
    private Amounts amounts(Course course) {
        BigDecimal held = xaf(escrowRepository.sumByCourseId(course.getId()));
        BigDecimal courseAmount = course.getCourseAmount();
        BigDecimal realCosts = course.getRealCosts();
        if (held.signum() <= 0) {
            return new Amounts(BigDecimal.ZERO, courseAmount, realCosts, null, null, null, null);
        }
        BigDecimal courier = xaf(course.getCourierAmount()).min(held);
        BigDecimal platformOnRelease = held.subtract(courier);
        BigDecimal clientFee = escrowService.shouldRefundPlatformFeesOnFullRefund()
                ? BigDecimal.ZERO : xaf(course.getCommissionAmount()).min(held);
        return new Amounts(held, courseAmount, realCosts, courier, platformOnRelease, held.subtract(clientFee), clientFee);
    }

    private Party party(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId)
                .map((User u) -> new Party(u.getId(), u.getFullName(), u.getEmail(), u.getStatus()))
                .orElse(new Party(userId, null, null, null));
    }

    private static BigDecimal xaf(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(0, RoundingMode.HALF_UP);
    }
}
