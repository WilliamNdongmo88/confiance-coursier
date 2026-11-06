package com.confiancecoursier.backend.report;

import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.report.api.dto.SubmitReportRequest;
import com.confiancecoursier.backend.report.domain.Report;
import com.confiancecoursier.backend.report.repository.ReportRepository;
import com.confiancecoursier.backend.report.service.ReportService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-063 — signalements : 1 par paire sur 30 j, suspension à 3 signaleurs distincts avec course commune, ADMIN exclus. */
class ReportAntiAbuseTest {

    private static final ZoneId ZONE = ZoneId.of("Africa/Douala");
    private static final Instant NOW = Instant.parse("2026-11-06T10:00:00Z");
    private static final LocalDateTime WINDOW_START = LocalDateTime.ofInstant(NOW, ZONE).minusDays(30);
    private static final String DESC = "Comportement agressif répété pendant la course.";

    private ReportRepository reports;
    private UserRepository users;
    private NotificationService notifications;
    private AuthService auth;
    private ReportService service;
    private User courier, admin;

    @BeforeEach
    void setUp() {
        reports = mock(ReportRepository.class);
        users = mock(UserRepository.class);
        notifications = mock(NotificationService.class);
        auth = mock(AuthService.class);
        when(reports.save(any(Report.class))).thenAnswer(i -> {
            Report r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        courier = user(20L, "COURIER");
        admin = user(99L, "ADMIN");

        service = new ReportService(reports, users, notifications, auth, Clock.fixed(NOW, ZONE));
    }

    private User user(long id, String role) {
        User u = User.builder().id(id).email(id + "@t.cm").passwordHash("x").role(role).status("ACTIVE").build();
        when(users.findById(id)).thenReturn(Optional.of(u));
        return u;
    }

    private static SubmitReportRequest req(long target) {
        return new SubmitReportRequest(String.valueOf(target), "injures", DESC);
    }

    @Test
    void samePairCannotReportTwiceWithinThirtyDays() {
        when(reports.existsByReporterIdAndTargetIdAndCreatedAtAfter(1L, 20L, WINDOW_START)).thenReturn(true);

        assertThatThrownBy(() -> service.submitReport(1L, req(20L)))
                .isInstanceOf(ConflictException.class).hasMessageContaining("30");
        verify(reports, never()).save(any());
    }

    @Test
    void windowIsExactlyThirtyDaysFromNow() {
        service.submitReport(1L, req(20L));
        verify(reports).existsByReporterIdAndTargetIdAndCreatedAtAfter(1L, 20L, WINDOW_START);
        verify(reports).countDistinctReportersWithSharedCourse(20L, WINDOW_START);
    }

    @Test
    void twoDistinctReportersDoNotSuspend() {
        when(reports.countDistinctReportersWithSharedCourse(20L, WINDOW_START)).thenReturn(2L);
        service.submitReport(1L, req(20L));

        assertThat(courier.getStatus()).isEqualTo("ACTIVE");
        verify(auth, never()).revokeSessions(anyLong());
        verify(notifications, never()).notifySuspension(anyLong());
    }

    @Test
    void threeDistinctReportersWithSharedCourseSuspendAndRevokeSessions() {
        when(reports.countDistinctReportersWithSharedCourse(20L, WINDOW_START)).thenReturn(3L);
        service.submitReport(1L, req(20L));

        assertThat(courier.getStatus()).isEqualTo("SUSPENDED");
        verify(auth).revokeSessions(20L);
        verify(notifications).notifySuspension(20L);
    }

    @Test
    void adminIsNeverAutoSuspended() {
        when(reports.countDistinctReportersWithSharedCourse(99L, WINDOW_START)).thenReturn(10L);
        service.submitReport(1L, req(99L));

        assertThat(admin.getStatus()).isEqualTo("ACTIVE");
        verify(auth, never()).revokeSessions(anyLong());
    }

    @Test
    void alreadySuspendedUserIsNotNotifiedAgain() {
        courier.setStatus("SUSPENDED");
        when(reports.countDistinctReportersWithSharedCourse(20L, WINDOW_START)).thenReturn(5L);
        service.submitReport(1L, req(20L));

        verify(notifications, never()).notifySuspension(anyLong());
        verify(auth, never()).revokeSessions(anyLong());
    }

    @Test
    void selfReportIsRefused() {
        assertThatThrownBy(() -> service.submitReport(20L, req(20L))).isInstanceOf(BusinessException.class);
    }

    @Test
    void adminDecisionSuspensionRevokesSessionsButNeverTargetsAdmin() {
        when(reports.findById(5L)).thenReturn(Optional.of(Report.builder().id(5L).reporterId(1L).targetId(20L)
                .motif("injures").status("OPEN").build()));
        service.processReport(5L, 99L, "SUSPENSION");
        assertThat(courier.getStatus()).isEqualTo("SUSPENDED");
        verify(auth).revokeSessions(20L);

        when(reports.findById(6L)).thenReturn(Optional.of(Report.builder().id(6L).reporterId(1L).targetId(99L)
                .motif("injures").status("OPEN").build()));
        assertThatThrownBy(() -> service.processReport(6L, 99L, "SUSPENSION")).isInstanceOf(BusinessException.class);
        assertThat(admin.getStatus()).isEqualTo("ACTIVE");
    }
}
