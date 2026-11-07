package com.confiancecoursier.backend.dispute;

import com.confiancecoursier.backend.admin.api.dto.AdminDisputeDetailResponse;
import com.confiancecoursier.backend.admin.service.AdminDisputeDetailService;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Dossier d'arbitrage admin : les montants « si … » suivent les formules d'EscrowService.
 * Course 100 : client 1 paie 11 000 (tarif 10 000 + frais client 1 000), coursier 2 reçoit 8 000.
 */
class AdminDisputeDetailServiceTest {

    private EscrowRepository escrowRepo;
    private EscrowService escrow;
    private AdminDisputeDetailService service;
    private Dispute dispute;

    @BeforeEach
    void setUp() {
        DisputeRepository disputes = mock(DisputeRepository.class);
        CourseRepository courses = mock(CourseRepository.class);
        UserRepository users = mock(UserRepository.class);
        ChatRoomRepository rooms = mock(ChatRoomRepository.class);
        ProofService proofs = mock(ProofService.class);
        escrowRepo = mock(EscrowRepository.class);
        escrow = mock(EscrowService.class);

        dispute = Dispute.builder().id(7L).courseId(100L).openedBy(1L).motifCode("L-C6").status("OPEN").build();
        when(disputes.findById(7L)).thenReturn(Optional.of(dispute));
        when(courses.findById(100L)).thenReturn(Optional.of(Course.builder().id(100L).clientId(1L).courierId(2L)
                .description("Riz").courseAmount(new BigDecimal("10000")).commissionAmount(new BigDecimal("1000"))
                .courierAmount(new BigDecimal("8000")).status("PROOFS_SUBMITTED").escrowStatus("HELD").build()));
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).fullName("Ngono Alice").email("a@x.cm").status("ACTIVE").build()));
        when(users.findById(2L)).thenReturn(Optional.of(User.builder().id(2L).fullName("Tchinda Bertholt").email("t@x.cm").status("ACTIVE").build()));
        ChatRoom room = new ChatRoom();
        room.setId(55L);
        when(rooms.findByCourseIdAndCourierId(100L, 2L)).thenReturn(Optional.of(room));
        when(proofs.getProofsForAdmin(100L)).thenReturn(List.of());
        when(escrowRepo.sumByCourseId(100L)).thenReturn(new BigDecimal("11000"));

        service = new AdminDisputeDetailService(disputes, courses, users, escrowRepo, escrow, proofs, rooms);
    }

    @Test
    void montantsDeLiberationEtDeRemboursementSansRemboursementDesFrais() {
        when(escrow.shouldRefundPlatformFeesOnFullRefund()).thenReturn(false);

        AdminDisputeDetailResponse d = service.getDetail(7L);

        assertThat(d.openedByRole()).isEqualTo("CLIENT");
        assertThat(d.client().fullName()).isEqualTo("Ngono Alice");
        assertThat(d.courier().fullName()).isEqualTo("Tchinda Bertholt");
        assertThat(d.chatRoomId()).isEqualTo(55L);
        assertThat(d.amounts().held()).isEqualByComparingTo("11000");
        assertThat(d.amounts().courierOnRelease()).isEqualByComparingTo("8000");
        assertThat(d.amounts().platformOnRelease()).isEqualByComparingTo("3000");
        assertThat(d.amounts().clientOnFullRefund()).isEqualByComparingTo("10000");
        assertThat(d.amounts().platformOnFullRefund()).isEqualByComparingTo("1000");
    }

    @Test
    void remboursementTotalRendTousLesFraisQuandLeParametreEstActif() {
        when(escrow.shouldRefundPlatformFeesOnFullRefund()).thenReturn(true);

        AdminDisputeDetailResponse d = service.getDetail(7L);

        assertThat(d.amounts().clientOnFullRefund()).isEqualByComparingTo("11000");
        assertThat(d.amounts().platformOnFullRefund()).isEqualByComparingTo("0");
    }

    @Test
    void litigeOuvertParLeCoursier() {
        dispute.setOpenedBy(2L);
        assertThat(service.getDetail(7L).openedByRole()).isEqualTo("COURIER");
    }

    @Test
    void plusRienEnSequestreAucunMontantSimule() {
        when(escrowRepo.sumByCourseId(100L)).thenReturn(BigDecimal.ZERO);

        AdminDisputeDetailResponse.Amounts a = service.getDetail(7L).amounts();

        assertThat(a.held()).isEqualByComparingTo("0");
        assertThat(a.courierOnRelease()).isNull();
        assertThat(a.clientOnFullRefund()).isNull();
    }

    @Test
    void litigeInconnu() {
        assertThatThrownBy(() -> service.getDetail(999L)).isInstanceOf(NotFoundException.class);
    }
}
