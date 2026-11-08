package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-091 — annulation d'une course par l'administrateur et repérage des courses bloquées. */
class AdminCourseServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Africa/Douala");
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 8, 12, 0);
    private static final String REASON = "Client injoignable, course impossible à réaliser.";

    private CourseRepository courses;
    private EscrowService escrow;
    private CourseOfferRepository offers;
    private ChatRoomRepository rooms;
    private NotificationService notifications;
    private AdminCourseService service;
    private Course course;
    private ChatRoom room;

    @BeforeEach
    void setUp() {
        courses = mock(CourseRepository.class);
        escrow = mock(EscrowService.class);
        offers = mock(CourseOfferRepository.class);
        rooms = mock(ChatRoomRepository.class);
        notifications = mock(NotificationService.class);
        EscrowRepository ledger = mock(EscrowRepository.class);
        when(ledger.findByCourseId(anyLong())).thenReturn(List.of());
        when(ledger.sumByCourseId(anyLong())).thenReturn(BigDecimal.ZERO);
        DisputeRepository disputes = mock(DisputeRepository.class);
        when(disputes.findByCourseId(anyLong())).thenReturn(List.of());
        ProofService proofs = mock(ProofService.class);
        when(proofs.getProofsForAdmin(anyLong())).thenReturn(List.of());
        UserRepository users = mock(UserRepository.class);
        when(users.findAllById(anyCollection())).thenReturn(List.of());

        course = Course.builder().id(1L).clientId(10L).courierId(20L).description("Riz").status("IN_PROGRESS")
                .escrowStatus("HELD").paidAt(NOW.minusHours(5)).build();
        when(courses.findByIdForUpdate(1L)).thenReturn(Optional.of(course));
        when(courses.findById(1L)).thenReturn(Optional.of(course));
        doAnswer(i -> { course.setStatus("REFUNDED"); course.setEscrowStatus("REFUNDED"); return null; })
                .when(escrow).refundTotal(eq(course), anyBoolean());

        room = ChatRoom.builder().id(5L).courseId(1L).clientId(10L).courierId(20L).isArchived(false).build();
        when(rooms.findByCourseId(1L)).thenReturn(List.of(room));

        service = new AdminCourseService(courses, users, ledger, escrow, proofs, rooms, offers, disputes, notifications,
                Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE));
    }

    @Test
    void paidCourseIsFullyRefundedWithReasonAndBothPartiesNotified() {
        service.cancel(1L, 99L, REASON);

        verify(escrow).refundTotal(course, true);
        assertThat(course.getStatus()).isEqualTo("REFUNDED");
        assertThat(course.getCancelReason()).isEqualTo(REASON);
        assertThat(course.getCancelledBy()).isEqualTo(99L);
        assertThat(course.getCancelledAt()).isEqualTo(NOW);
        assertThat(room.getIsArchived()).isTrue();
        verify(notifications).notifyCancelledByAdmin(10L, 20L, 1L, REASON, true);
    }

    @Test
    void unpaidCourseIsCancelledWithoutTouchingTheEscrow() {
        course.setStatus("PUBLISHED");
        course.setEscrowStatus(null);
        CourseOffer offer = CourseOffer.builder().id(3L).courseId(1L).courierId(20L).status("ACTIVE").build();
        when(offers.findByCourseId(1L)).thenReturn(List.of(offer));

        service.cancel(1L, 99L, REASON);

        assertThat(course.getStatus()).isEqualTo("CANCELLED");
        assertThat(offer.getStatus()).isEqualTo("REJECTED");
        verifyNoInteractions(escrow);
        verify(notifications).notifyCancelledByAdmin(10L, 20L, 1L, REASON, false);
    }

    @Test
    void reasonIsMandatory() {
        assertThatThrownBy(() -> service.cancel(1L, 99L, "  court ")).isInstanceOf(BusinessException.class);
        verifyNoInteractions(escrow);
    }

    @Test
    void disputedOrFinishedCoursesCannotBeCancelledHere() {
        course.setStatus("DISPUTED");
        assertThatThrownBy(() -> service.cancel(1L, 99L, REASON)).isInstanceOf(ConflictException.class);
        course.setStatus("COMPLETED");
        course.setEscrowStatus("RELEASED");
        assertThatThrownBy(() -> service.cancel(1L, 99L, REASON)).isInstanceOf(ConflictException.class);
        verifyNoInteractions(escrow);
    }

    @Test
    void blockedMeansOverdueOrMoneyHeldForMoreThan72Hours() {
        LocalDateTime limit = NOW.minusHours(AdminCourseService.BLOCKED_AFTER_HOURS);
        assertThat(AdminCourseService.isBlocked(course, limit)).isFalse();             // payée il y a 5 h
        course.setPaidAt(NOW.minusHours(80));
        assertThat(AdminCourseService.isBlocked(course, limit)).isTrue();              // argent bloqué depuis 80 h
        course.setStatus("COMPLETED");
        course.setEscrowStatus("RELEASED");
        assertThat(AdminCourseService.isBlocked(course, limit)).isFalse();
        course.setStatus("OVERDUE");
        assertThat(AdminCourseService.isBlocked(course, limit)).isTrue();
    }
}
