package com.confiancecoursier.backend.course;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.course.domain.CourierIncident;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourierIncidentRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.ProofDeadlinePolicy;
import com.confiancecoursier.backend.course.service.ProofDeadlineService;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.repository.ProofRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TICK-065b — échéance de preuves et non-livraison (E2E-5 au niveau service, horloge avancée).
 * Course 1 : client 10, coursier 20, payée, échéance = T0.
 */
class ProofDeadlineServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Africa/Douala");
    private static final LocalDateTime T0 = LocalDateTime.of(2026, 11, 10, 12, 0);

    private CourseRepository courses;
    private ProofRepository proofs;
    private DisputeRepository disputes;
    private CourierIncidentRepository incidents;
    private UserRepository users;
    private EscrowService escrow;
    private AuthService auth;
    private NotificationService notifications;
    private CommissionService settings;
    private PlatformTransactionManager txManager;
    private Course course;
    private User courier;

    @BeforeEach
    void setUp() {
        courses = mock(CourseRepository.class);
        proofs = mock(ProofRepository.class);
        disputes = mock(DisputeRepository.class);
        incidents = mock(CourierIncidentRepository.class);
        users = mock(UserRepository.class);
        escrow = mock(EscrowService.class);
        auth = mock(AuthService.class);
        notifications = mock(NotificationService.class);
        settings = mock(CommissionService.class);
        when(settings.getIntSetting(anyString(), anyInt())).thenAnswer(i -> i.getArgument(1));
        when(settings.getBooleanSetting(anyString(), anyBoolean())).thenAnswer(i -> i.getArgument(1));
        txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenAnswer(i -> new SimpleTransactionStatus());

        course = Course.builder().id(1L).clientId(10L).courierId(20L).description("Riz Mokolo")
                .status("IN_PROGRESS").escrowStatus("HELD").realCosts(BigDecimal.ZERO)
                .proofDeadline(T0).extensionCount(0).build();
        when(courses.findByIdForUpdate(1L)).thenReturn(Optional.of(course));
        // Le remboursement (EscrowService) passe la course en REFUNDED
        doAnswer(i -> { course.setStatus("REFUNDED"); course.setEscrowStatus("REFUNDED"); return null; })
                .when(escrow).refundTotal(eq(course), anyBoolean());

        courier = User.builder().id(20L).email("c@t.cm").passwordHash("x").role("COURIER").status("ACTIVE").build();
        when(users.findById(20L)).thenReturn(Optional.of(courier));
        when(disputes.findByCourseIdAndStatus(anyLong(), eq("OPEN"))).thenReturn(Optional.empty());
    }

    private ProofDeadlineService at(LocalDateTime now) {
        return new ProofDeadlineService(courses, proofs, disputes, incidents, users, escrow, auth, notifications,
                new ProofDeadlinePolicy(settings), txManager, Clock.fixed(now.atZone(ZONE).toInstant(), ZONE));
    }

    // ── Rappel et passage en OVERDUE ─────────────────────────────────────────

    @Test
    void reminderSentOnceSixHoursBeforeDeadline() {
        LocalDateTime now = T0.minusHours(5);
        when(courses.findIdsForProofReminder(now, now.plusHours(6))).thenReturn(List.of(1L));

        assertThat(at(now).processDeadlines().reminders()).isEqualTo(1);
        assertThat(course.getProofReminderSentAt()).isEqualTo(now);
        verify(notifications).notifyProofDeadlineReminder(20L, 1L, T0);

        // second passage : déjà rappelé
        assertThat(at(now.plusMinutes(15)).processDeadlines().reminders()).isZero();
    }

    @Test
    void pastDeadlineWithoutSubmissionBecomesOverdueAndBothPartiesAreTold() {
        LocalDateTime now = T0.plusMinutes(5);
        when(courses.findIdsPastProofDeadline(now)).thenReturn(List.of(1L));

        assertThat(at(now).processDeadlines().overdue()).isEqualTo(1);
        assertThat(course.getStatus()).isEqualTo("OVERDUE");
        assertThat(course.getOverdueSince()).isEqualTo(now);
        verify(notifications).notifyCourseOverdue(10L, 20L, 1L);
        verifyNoInteractions(escrow); // aucun mouvement de fonds au passage en retard
    }

    @Test
    void courseSubmittedInTheMeantimeIsNotMarkedOverdue() {
        LocalDateTime now = T0.plusMinutes(5);
        course.setStatus("PROOFS_SUBMITTED");
        when(courses.findIdsPastProofDeadline(now)).thenReturn(List.of(1L));

        assertThat(at(now).processDeadlines().overdue()).isZero();
        assertThat(course.getStatus()).isEqualTo("PROOFS_SUBMITTED");
    }

    // ── Choix du client ──────────────────────────────────────────────────────

    private void overdue(LocalDateTime since) {
        course.setStatus("OVERDUE");
        course.setOverdueSince(since);
    }

    @Test
    void clientExtendsTwiceThenIsRefused() {
        LocalDateTime now = T0.plusHours(1);
        overdue(T0);

        at(now).extend(1L, 10L, 24);
        assertThat(course.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(course.getProofDeadline()).isEqualTo(now.plusHours(24));
        assertThat(course.getExtensionCount()).isEqualTo(1);
        assertThat(course.getOverdueSince()).isNull();
        verify(notifications).notifyDeadlineExtended(20L, 1L, now.plusHours(24));

        overdue(now.plusHours(24));
        at(now.plusHours(25)).extend(1L, 10L, 12);
        assertThat(course.getExtensionCount()).isEqualTo(2);

        overdue(now.plusHours(40));
        assertThatThrownBy(() -> at(now.plusHours(41)).extend(1L, 10L, 12))
                .isInstanceOf(ConflictException.class).hasMessageContaining("2 fois");
    }

    @Test
    void extensionRulesAreEnforced() {
        overdue(T0);
        assertThatThrownBy(() -> at(T0).extend(1L, 10L, 48)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> at(T0).extend(1L, 99L, 12)).isInstanceOf(ForbiddenException.class);
        course.setStatus("IN_PROGRESS");
        assertThatThrownBy(() -> at(T0).extend(1L, 10L, 12)).isInstanceOf(ConflictException.class);
    }

    @Test
    void clientCancelGetsFullRefundAndCourierGetsIncident() {
        overdue(T0);
        at(T0.plusHours(2)).cancelOverdue(1L, 10L);

        verify(escrow).refundTotal(course, true); // défaut : frais de service rendus (D3)
        assertThat(course.getStatus()).isEqualTo("REFUNDED");
        verify(incidents).save(argThat(i -> i.getCourierId().equals(20L) && "NO_SHOW".equals(i.getIncidentType())));
        verify(notifications).notifyNoShowRefund(10L, 20L, 1L, false);
        assertThat(courier.getStatus()).isEqualTo("ACTIVE"); // 1 seul incident
    }

    @Test
    void noShowRefundFollowsAdminSetting() {
        when(settings.getBooleanSetting("refund_platform_fees_on_courier_no_show", true)).thenReturn(false);
        overdue(T0);
        at(T0.plusHours(2)).cancelOverdue(1L, 10L);
        verify(escrow).refundTotal(course, false);
    }

    @Test
    void secondNoShowInThirtyDaysSuspendsCourier() {
        when(incidents.countByCourierIdAndIncidentTypeAndCreatedAtAfter(eq(20L), eq("NO_SHOW"), any())).thenReturn(2L);
        overdue(T0);
        at(T0.plusHours(2)).cancelOverdue(1L, 10L);

        assertThat(courier.getStatus()).isEqualTo("SUSPENDED");
        verify(auth).revokeSessions(20L);
        verify(notifications).notifySuspension(20L);
    }

    @Test
    void cancelOnlyForOwnerAndOverdueCourse() {
        assertThatThrownBy(() -> at(T0).cancelOverdue(1L, 10L)).isInstanceOf(ConflictException.class); // IN_PROGRESS
        overdue(T0);
        assertThatThrownBy(() -> at(T0).cancelOverdue(1L, 20L)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(escrow);
    }

    // ── Sans réponse du client (48 h) ────────────────────────────────────────

    @Test
    void noProofNoPurchaseAfterGraceIsRefundedAutomatically() {
        LocalDateTime now = T0.plusHours(49);
        overdue(T0);
        when(courses.findIdsOverdueBefore(now.minusHours(48))).thenReturn(List.of(1L));
        when(proofs.countByCourseId(1L)).thenReturn(0L);

        ProofDeadlineService.Result r = at(now).processDeadlines();

        assertThat(r.refunded()).isEqualTo(1);
        verify(escrow).refundTotal(course, true);
        verify(notifications).notifyNoShowRefund(10L, 20L, 1L, true);
        verify(incidents).save(any(CourierIncident.class));
        verify(disputes, never()).save(any());
    }

    @Test
    void partialProofsAfterGraceOpenAutomaticDisputeNeverBlindRefund() {
        LocalDateTime now = T0.plusHours(49);
        overdue(T0);
        when(courses.findIdsOverdueBefore(now.minusHours(48))).thenReturn(List.of(1L));
        when(proofs.countByCourseId(1L)).thenReturn(2L); // brouillons déposés, jamais soumis

        ProofDeadlineService.Result r = at(now).processDeadlines();

        assertThat(r.disputed()).isEqualTo(1);
        assertThat(course.getStatus()).isEqualTo("DISPUTED");
        verify(escrow).markDisputed(course);
        verify(escrow, never()).refundTotal(any(), anyBoolean());
        verify(escrow, never()).release(any());
        verify(disputes).save(argThat((Dispute d) -> "SYS-NL".equals(d.getMotifCode()) && "OPEN".equals(d.getStatus())));
        verify(notifications).notifyAutoDisputeNoShow(10L, 20L, 1L);
        verifyNoInteractions(incidents);
    }

    @Test
    void purchasesDeclaredAfterGraceOpenDisputeEvenWithoutProofs() {
        LocalDateTime now = T0.plusHours(49);
        overdue(T0);
        course.setRealCosts(new BigDecimal("15000"));
        when(courses.findIdsOverdueBefore(now.minusHours(48))).thenReturn(List.of(1L));
        when(proofs.countByCourseId(1L)).thenReturn(0L);

        assertThat(at(now).processDeadlines().disputed()).isEqualTo(1);
        verify(escrow, never()).refundTotal(any(), anyBoolean());
    }

    @Test
    void neverReleasesFundsToCourier() {
        LocalDateTime now = T0.plusHours(49);
        overdue(T0);
        when(courses.findIdsPastProofDeadline(any())).thenReturn(List.of(1L));
        when(courses.findIdsOverdueBefore(any())).thenReturn(List.of(1L));
        at(now).processDeadlines();
        verify(escrow, never()).release(any());
    }

    @Test
    void failureOnOneCourseIsIsolated() {
        LocalDateTime now = T0.plusHours(49);
        overdue(T0);
        Course other = Course.builder().id(2L).clientId(11L).courierId(21L).description("x")
                .status("IN_PROGRESS").proofDeadline(T0).build();
        when(courses.findByIdForUpdate(2L)).thenReturn(Optional.of(other));
        when(courses.findIdsPastProofDeadline(now)).thenReturn(List.of(2L));
        when(courses.findIdsOverdueBefore(now.minusHours(48))).thenReturn(List.of(1L));
        doThrow(new IllegalStateException("Ledger déséquilibré")).when(escrow).refundTotal(eq(course), anyBoolean());

        ProofDeadlineService.Result r = at(now).processDeadlines();

        assertThat(r.failed()).isEqualTo(1);
        assertThat(r.overdue()).isEqualTo(1);
        assertThat(other.getStatus()).isEqualTo("OVERDUE");
        verify(notifications, never()).notifyNoShowRefund(anyLong(), anyLong(), anyLong(), anyBoolean());
    }
}
