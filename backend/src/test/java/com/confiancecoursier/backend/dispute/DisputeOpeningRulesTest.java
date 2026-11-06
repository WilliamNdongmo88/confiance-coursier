package com.confiancecoursier.backend.dispute;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.api.dto.OpenDisputeRequest;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.dispute.service.DisputeService;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** TICK-062 — règles d'ouverture des litiges. Course 100 : client 1, coursier assigné 2. */
class DisputeOpeningRulesTest {

    private static final String DESC = "Le coursier n'a jamais livré la commande prévue.";

    private DisputeRepository disputes;
    private CourseRepository courses;
    private EscrowService escrow;
    private DisputeService service;
    private Course course;

    @BeforeEach
    void setUp() {
        disputes = mock(DisputeRepository.class);
        courses = mock(CourseRepository.class);
        escrow = mock(EscrowService.class);
        when(disputes.save(any(Dispute.class))).thenAnswer(i -> {
            Dispute d = i.getArgument(0);
            d.setId(500L);
            return d;
        });
        when(disputes.findByCourseIdAndStatus(100L, "OPEN")).thenReturn(Optional.empty());

        course = Course.builder().id(100L).clientId(1L).courierId(2L).description("Riz")
                .status("IN_PROGRESS").escrowStatus("HELD").build();
        when(courses.findByIdForUpdate(100L)).thenReturn(Optional.of(course));

        service = new DisputeService(disputes, courses, mock(NotificationService.class), escrow);
    }

    private static OpenDisputeRequest req(String motif) {
        return new OpenDisputeRequest(motif, DESC);
    }

    @ParameterizedTest
    @ValueSource(strings = {"IN_PROGRESS", "PROOFS_SUBMITTED"})
    void partyCanOpenDisputeOnPaidCourse(String status) {
        course.setStatus(status);
        service.openDispute(100L, 1L, req("L-C1"));

        assertThat(course.getStatus()).isEqualTo("DISPUTED");
        verify(escrow).markDisputed(course);
        verify(disputes).save(argThat(d -> "OPEN".equals(d.getStatus()) && "L-C1".equals(d.getMotifCode())));
        verify(courses).findByIdForUpdate(100L); // verrou de ligne
    }

    @Test
    void assignedCourierCanOpenWithCourierMotif() {
        course.setStatus("PROOFS_SUBMITTED");
        service.openDispute(100L, 2L, req("L-F1"));
        assertThat(course.getStatus()).isEqualTo("DISPUTED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUBLISHED", "ASSIGNED", "COMPLETED", "REFUNDED", "CANCELLED", "DISPUTED"})
    void disputeOutsidePaidStatusesIsRefused(String status) {
        course.setStatus(status);
        assertThatThrownBy(() -> service.openDispute(100L, 1L, req("L-C1"))).isInstanceOf(ConflictException.class);
        verifyNoInteractions(escrow);
        verify(disputes, never()).save(any());
    }

    @Test
    void secondOpenDisputeIsRefused() {
        when(disputes.findByCourseIdAndStatus(100L, "OPEN"))
                .thenReturn(Optional.of(Dispute.builder().id(7L).courseId(100L).status("OPEN").build()));
        assertThatThrownBy(() -> service.openDispute(100L, 2L, req("L-F1")))
                .isInstanceOf(ConflictException.class).hasMessageContaining("#7");
        verify(disputes, never()).save(any());
    }

    @Test
    void outsiderOrNonAssignedCourierCannotOpen() {
        assertThatThrownBy(() -> service.openDispute(100L, 3L, req("L-C1"))).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.openDispute(100L, 5L, req("L-F1"))).isInstanceOf(ForbiddenException.class);
        verify(disputes, never()).save(any());
    }

    @Test
    void motifsAreFilteredByRole() {
        assertThatThrownBy(() -> service.openDispute(100L, 1L, req("L-F1")))
                .isInstanceOf(BusinessException.class).hasMessageContaining("client");
        assertThatThrownBy(() -> service.openDispute(100L, 2L, req("L-C3")))
                .isInstanceOf(BusinessException.class).hasMessageContaining("coursier");
        verify(disputes, never()).save(any());
    }

    @Test
    void requestValidationRejectsUnknownMotifCodes() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        assertThat(validator.validate(req("L-F5"))).isNotEmpty();
        assertThat(validator.validate(req("L-C7"))).isNotEmpty();
        assertThat(validator.validate(req("L-C6"))).isEmpty();
        assertThat(validator.validate(req("L-F4"))).isEmpty();
    }
}
