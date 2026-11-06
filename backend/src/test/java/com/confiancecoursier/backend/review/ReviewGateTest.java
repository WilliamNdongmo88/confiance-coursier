package com.confiancecoursier.backend.review;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.review.service.ReviewGate;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** TICK-073 — notation obligatoire avant une nouvelle course (client) ou une nouvelle offre (coursier). */
class ReviewGateTest {

    @Test
    void nothingPendingLetsTheUserContinue() {
        CourseRepository courses = mock(CourseRepository.class);
        when(courses.findCompletedAwaitingReviewBy(1L)).thenReturn(List.of());
        assertThatCode(() -> new ReviewGate(courses).requireNoPendingReview(1L, "créer une nouvelle course"))
                .doesNotThrowAnyException();
    }

    @Test
    void pendingReviewBlocksWithTheCourseToRate() {
        CourseRepository courses = mock(CourseRepository.class);
        when(courses.findCompletedAwaitingReviewBy(1L)).thenReturn(List.of(
                Course.builder().id(42L).clientId(1L).description("Pharmacie Bastos").status("COMPLETED").build(),
                Course.builder().id(43L).clientId(1L).description("Riz Mokolo").status("COMPLETED").build()));

        assertThatThrownBy(() -> new ReviewGate(courses).requireNoPendingReview(1L, "créer une nouvelle course"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("#42")
                .hasMessageContaining("Pharmacie Bastos")
                .hasMessageContaining("2 avis en attente");
    }
}
