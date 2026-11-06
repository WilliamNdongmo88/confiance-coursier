package com.confiancecoursier.backend.payment;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.service.AutoValidationService;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.payment.service.ValidationScheduler;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** TICK-065 — auto-validation 72 h : horloge injectée, une transaction par course, emails après commit. */
class AutoValidationServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Africa/Douala");
    private static final Instant NOW = Instant.parse("2026-11-09T12:00:00Z");
    private static final LocalDateTime NOW_LOCAL = LocalDateTime.ofInstant(NOW, ZONE);

    private CourseRepository courses;
    private EscrowService escrow;
    private NotificationService notifications;
    private PlatformTransactionManager txManager;
    private AutoValidationService service;

    @BeforeEach
    void setUp() {
        courses = mock(CourseRepository.class);
        escrow = mock(EscrowService.class);
        notifications = mock(NotificationService.class);
        txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenAnswer(i -> new SimpleTransactionStatus());

        service = new AutoValidationService(courses, escrow, notifications, txManager, Clock.fixed(NOW, ZONE));
    }

    /** Course dont les preuves ont été soumises il y a {@code hoursAgo} heures. */
    private Course submitted(long id, long hoursAgo) {
        Course c = Course.builder().id(id).clientId(10L + id).courierId(20L + id).description("c" + id)
                .status("PROOFS_SUBMITTED").escrowStatus("HELD")
                .autoValidateAt(NOW_LOCAL.minusHours(hoursAgo).plusHours(72)).build();
        when(courses.findByIdForUpdate(id)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    void queriesOnlyDueCoursesWithInjectedClock() {
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of());
        assertThat(service.autoValidateDueCourses().validated()).isZero();
        verify(courses).findIdsDueForAutoValidation(NOW_LOCAL);
    }

    @Test
    void releasesCourseAfterSeventyTwoHoursAndEmailsAfterCommit() {
        Course c = submitted(1, 73);
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L));

        AutoValidationService.Result r = service.autoValidateDueCourses();

        assertThat(r.validated()).isEqualTo(1);
        assertThat(c.getCompletedAt()).isEqualTo(NOW_LOCAL);
        InOrder order = inOrder(escrow, txManager, notifications);
        order.verify(escrow).release(c);
        order.verify(txManager).commit(any(TransactionStatus.class));
        order.verify(notifications).notifyAutoValidation(11L, 21L, 1L);
    }

    @Test
    void oneTransactionPerCourse() {
        submitted(1, 80);
        submitted(2, 75);
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L, 2L));

        service.autoValidateDueCourses();

        verify(txManager, times(2)).getTransaction(any());
        verify(txManager, times(2)).commit(any(TransactionStatus.class));
    }

    @Test
    void failureOnOneCourseDoesNotAffectOthersAndSendsNoEmailForIt() {
        Course bad = submitted(1, 80);
        Course good = submitted(2, 75);
        doThrow(new IllegalStateException("Ledger déséquilibré")).when(escrow).release(bad);
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L, 2L));

        AutoValidationService.Result r = service.autoValidateDueCourses();

        assertThat(r.failed()).isEqualTo(1);
        assertThat(r.validated()).isEqualTo(1);
        verify(txManager).rollback(any(TransactionStatus.class));
        verify(escrow).release(good);
        verify(notifications, never()).notifyAutoValidation(11L, 21L, 1L);
        verify(notifications).notifyAutoValidation(12L, 22L, 2L);
    }

    @Test
    void courseValidatedOrDisputedInTheMeantimeIsSkipped() {
        Course disputed = submitted(1, 80);
        disputed.setStatus("DISPUTED");
        Course validated = submitted(2, 80);
        validated.setStatus("COMPLETED");
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L, 2L));

        AutoValidationService.Result r = service.autoValidateDueCourses();

        assertThat(r.skipped()).isEqualTo(2);
        verifyNoInteractions(escrow);
        verifyNoInteractions(notifications);
    }

    @Test
    void courseNotYetDueAfterReloadIsSkipped() {
        submitted(1, 71); // échéance dans 1 h (délai prolongé entre la requête et le verrou)
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L));

        assertThat(service.autoValidateDueCourses().skipped()).isEqualTo(1);
        verifyNoInteractions(escrow);
    }

    @Test
    void emailFailureDoesNotUndoTheValidation() {
        submitted(1, 80);
        when(courses.findIdsDueForAutoValidation(NOW_LOCAL)).thenReturn(List.of(1L));
        doThrow(new RuntimeException("SMTP indisponible")).when(notifications).notifyAutoValidation(any(), any(), any());

        assertThat(service.autoValidateDueCourses().validated()).isEqualTo(1);
        verify(txManager, never()).rollback(any());
    }

    @Test
    void schedulerIsLockedWithShedLock() throws Exception {
        var m = ValidationScheduler.class.getMethod("autoValidate");
        assertThat(m.getAnnotation(SchedulerLock.class).name()).isEqualTo("autoValidateCourses");
        assertThat(m.getAnnotation(Scheduled.class).cron()).contains("app.scheduler.validation.cron");
    }
}
