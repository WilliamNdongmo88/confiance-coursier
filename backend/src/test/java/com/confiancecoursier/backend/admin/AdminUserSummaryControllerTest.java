package com.confiancecoursier.backend.admin;

import com.confiancecoursier.backend.admin.api.AdminUserSummaryController;
import com.confiancecoursier.backend.admin.api.AdminUserSummaryController.UserActivitySummary;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.report.repository.ReportRepository;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Fiche admin d'un utilisateur : activité réelle et litiges de ses courses (ouverts par lui ou contre lui). */
class AdminUserSummaryControllerTest {

    private UserRepository users;
    private CourseRepository courses;
    private DisputeRepository disputes;
    private ReportRepository reports;
    private AdminUserSummaryController controller;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        courses = mock(CourseRepository.class);
        disputes = mock(DisputeRepository.class);
        reports = mock(ReportRepository.class);
        controller = new AdminUserSummaryController(users, courses, disputes, reports);
    }

    @Test
    void courierSummaryListsDisputesOpenedByHimAndAgainstHim() {
        when(users.existsById(2L)).thenReturn(true);
        when(courses.countByCourierId(2L)).thenReturn(9L);
        when(courses.countByCourierIdAndStatus(2L, "COMPLETED")).thenReturn(7L);
        when(disputes.countByOpenedBy(2L)).thenReturn(1L);
        when(reports.countByTargetId(2L)).thenReturn(2L);
        when(disputes.findInvolvingUser(2L)).thenReturn(List.of(
                Dispute.builder().id(7L).courseId(4L).openedBy(16L).motifCode("L-C6").status("OPEN").build(),
                Dispute.builder().id(5L).courseId(2L).openedBy(2L).motifCode("L-F1").status("RESOLVED").decision("LIBERATION").build()));

        UserActivitySummary s = controller.summary(2L).getBody();

        assertThat(s).isNotNull();
        assertThat(s.coursesAsCourier()).isEqualTo(9);
        assertThat(s.completedAsCourier()).isEqualTo(7);
        assertThat(s.reportsReceived()).isEqualTo(2);
        assertThat(s.disputes()).hasSize(2);
        assertThat(s.disputes().get(0).id()).isEqualTo(7L);
        assertThat(s.disputes().get(0).openedByThisUser()).isFalse();   // ouvert par le client, contre lui
        assertThat(s.disputes().get(1).openedByThisUser()).isTrue();
        assertThat(s.disputes().get(1).decision()).isEqualTo("LIBERATION");
    }

    @Test
    void unknownUserIsNotFound() {
        when(users.existsById(99L)).thenReturn(false);
        assertThatThrownBy(() -> controller.summary(99L)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(disputes);
    }
}
