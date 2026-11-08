package com.confiancecoursier.backend.course;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.CourseService;
import com.confiancecoursier.backend.course.api.dto.CreateCourseRequest;
import com.confiancecoursier.backend.review.repository.ReviewRepository;
import com.confiancecoursier.backend.review.service.ReviewGate;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-069 — annulation douce d'une course et listes sans N+1. */
class CourseServiceTest {

    private CourseRepository courses;
    private ChatRoomRepository rooms;
    private CourseOfferRepository offers;
    private ReviewRepository reviews;
    private ReviewGate reviewGate;
    private CourseService service;
    private Course course;
    private ChatRoom room1, room2;
    private CourseOffer active, superseded;

    @BeforeEach
    void setUp() {
        courses = mock(CourseRepository.class);
        rooms = mock(ChatRoomRepository.class);
        offers = mock(CourseOfferRepository.class);
        reviews = mock(ReviewRepository.class);
        reviewGate = mock(ReviewGate.class);
        service = new CourseService(courses, rooms, offers, mock(com.confiancecoursier.backend.user.repository.UserRepository.class),
                reviews, reviewGate);

        course = Course.builder().id(100L).clientId(1L).description("Pharmacie").status("PUBLISHED").build();
        when(courses.findByIdForUpdate(100L)).thenReturn(Optional.of(course));

        room1 = ChatRoom.builder().id(10L).courseId(100L).clientId(1L).courierId(2L).isArchived(false).build();
        room2 = ChatRoom.builder().id(11L).courseId(100L).clientId(1L).courierId(3L).isArchived(false).build();
        when(rooms.findByCourseId(100L)).thenReturn(List.of(room1, room2));

        active = CourseOffer.builder().id(40L).courseId(100L).courierId(2L).amount(new BigDecimal("6000")).status("ACTIVE").build();
        superseded = CourseOffer.builder().id(41L).courseId(100L).courierId(2L).amount(new BigDecimal("7000")).status("SUPERSEDED").build();
        when(offers.findByCourseId(100L)).thenReturn(List.of(active, superseded));
    }

    // ── Annulation ───────────────────────────────────────────────────────────

    @Test
    void deletingPublishedCourseWithConversationsCancelsItInsteadOfFailing() {
        service.deleteCourse(100L, 1L);

        assertThat(course.getStatus()).isEqualTo("CANCELLED");
        verify(courses, never()).delete(any(Course.class));
        assertThat(active.getStatus()).isEqualTo("REJECTED");
        assertThat(superseded.getStatus()).isEqualTo("SUPERSEDED"); // historique conservé
        assertThat(room1.getIsArchived()).isTrue();
        assertThat(room2.getIsArchived()).isTrue();
        verify(courses).findByIdForUpdate(100L);
    }

    @Test
    void assignedButUnpaidCourseCanBeCancelled() {
        course.setStatus("ASSIGNED");
        service.deleteCourse(100L, 1L);
        assertThat(course.getStatus()).isEqualTo("CANCELLED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"IN_PROGRESS", "OVERDUE", "PROOFS_SUBMITTED", "DISPUTED", "COMPLETED", "REFUNDED"})
    void paidCourseCannotBeCancelled(String status) {
        course.setStatus(status);
        assertThatThrownBy(() -> service.deleteCourse(100L, 1L)).isInstanceOf(ConflictException.class);
        assertThat(course.getStatus()).isEqualTo(status);
    }

    @Test
    void courseWithFundsHeldCannotBeCancelledEvenIfStatusLooksUnpaid() {
        course.setStatus("ASSIGNED");
        course.setEscrowStatus("HELD");
        assertThatThrownBy(() -> service.deleteCourse(100L, 1L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void cancellationIsIdempotentAndOwnerOnly() {
        assertThatThrownBy(() -> service.deleteCourse(100L, 9L)).isInstanceOf(ForbiddenException.class);
        service.deleteCourse(100L, 1L);
        service.deleteCourse(100L, 1L); // déjà annulée : sans erreur
        assertThat(course.getStatus()).isEqualTo("CANCELLED");
    }

    // ── Listes sans N+1 ──────────────────────────────────────────────────────

    @Test
    void clientListLoadsAllRoomsInOneQuery() {
        Course other = Course.builder().id(200L).clientId(1L).courierId(5L).description("x").status("IN_PROGRESS").build();
        when(courses.findByClientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(course, other));
        ChatRoom assignedRoom = ChatRoom.builder().id(20L).courseId(200L).clientId(1L).courierId(5L).build();
        ChatRoom otherCourierRoom = ChatRoom.builder().id(21L).courseId(200L).clientId(1L).courierId(6L).build();
        when(rooms.findByCourseIdIn(anyCollection())).thenReturn(List.of(room1, room2, otherCourierRoom, assignedRoom));

        List<CourseResponse> list = service.getMyCourses(1L);

        // Course ouverte : plusieurs coursiers ont écrit, aucun salon n'est privilégié ; course attribuée : salon du coursier
        assertThat(list).extracting(CourseResponse::getChatRoomId).containsExactly(null, 20L);
        assertThat(list.get(0).getConversationRoomIds()).containsExactly(10L, 11L);
        assertThat(list.get(1).getConversationRoomIds()).containsExactlyInAnyOrder(21L, 20L);
        verify(rooms, times(1)).findByCourseIdIn(anyCollection());
        verify(rooms, never()).findByCourseId(anyLong());
        verify(rooms, never()).findByCourseIdAndCourierId(anyLong(), anyLong());
    }

    @Test
    void courierMissionsLoadCoursesInBatch() {
        Course assigned = Course.builder().id(300L).clientId(1L).courierId(2L).description("a").status("IN_PROGRESS").build();
        Course negotiating = Course.builder().id(100L).clientId(1L).description("b").status("PUBLISHED")
                .createdAt(LocalDateTime.now()).build();
        when(courses.findByCourierIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(assigned));
        when(rooms.findByCourierId(2L)).thenReturn(List.of(
                ChatRoom.builder().id(30L).courseId(300L).clientId(1L).courierId(2L).build(), room1));
        when(courses.findAllById(List.of(100L))).thenReturn(List.of(negotiating));

        List<CourseResponse> list = service.getMyMissions(2L);

        assertThat(list).extracting(CourseResponse::getId).containsExactly(300L, 100L);
        assertThat(list).extracting(CourseResponse::getChatRoomId).containsExactly(30L, 10L);
        verify(courses, never()).findById(anyLong());
        verify(rooms, never()).findByCourseIdAndCourierId(anyLong(), anyLong());
    }

    // ── TICK-073 : notation obligatoire ──────────────────────────────────────

    @Test
    void creatingACourseIsBlockedWhileAReviewIsDue() {
        doThrow(new ConflictException("Notez d'abord la course #7")).when(reviewGate)
                .requireNoPendingReview(eq(1L), anyString());
        CreateCourseRequest req = new CreateCourseRequest();
        req.setDescription("Acheter du riz au marché Mokolo");
        assertThatThrownBy(() -> service.createCourse(1L, req)).isInstanceOf(ConflictException.class)
                .hasMessageContaining("#7");
        verify(courses, never()).save(any());
    }

    @Test
    void completedCoursesNotYetReviewedAreFlagged() {
        Course rated = Course.builder().id(1L).clientId(1L).courierId(2L).description("a").status("COMPLETED").build();
        Course toRate = Course.builder().id(2L).clientId(1L).courierId(2L).description("b").status("COMPLETED").build();
        Course running = Course.builder().id(3L).clientId(1L).courierId(2L).description("c").status("IN_PROGRESS").build();
        when(courses.findByClientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(rated, toRate, running));
        when(rooms.findByCourseIdIn(anyCollection())).thenReturn(List.of());
        when(reviews.findReviewedCourseIds(eq(1L), anyCollection())).thenReturn(List.of(1L));

        List<CourseResponse> list = service.getMyCourses(1L);

        assertThat(list).extracting(CourseResponse::getReviewDue).containsExactly(false, true, false);
        verify(reviews, times(1)).findReviewedCourseIds(eq(1L), anyCollection()); // une requête pour la liste
    }

    // ── Conversations d'une course ouverte (plusieurs coursiers) ────────────

    @Test
    void conversationsShowEachCourierWithHisCurrentOffer() {
        var users = mock(com.confiancecoursier.backend.user.repository.UserRepository.class);
        when(users.findAllById(anyCollection())).thenReturn(List.of(
                com.confiancecoursier.backend.user.domain.User.builder().id(2L).fullName("Tchinda Bertholt").kycStatus("APPROVED")
                        .trustScore(new BigDecimal("4.5")).build(),
                com.confiancecoursier.backend.user.domain.User.builder().id(3L).fullName("Mba Kevin").kycStatus("APPROVED").build()));
        when(courses.findById(100L)).thenReturn(Optional.of(course));
        CourseService svc = new CourseService(courses, rooms, offers, users, reviews, reviewGate);

        var list = svc.listConversations(100L, 1L);

        assertThat(list).hasSize(2);
        assertThat(list.get(0).get("chatRoomId")).isEqualTo(10L);            // offre active d'abord
        assertThat((BigDecimal) list.get(0).get("offerAmount")).isEqualByComparingTo("6000"); // pas l'offre remplacée
        assertThat(list.get(0).get("offerStatus")).isEqualTo("ACTIVE");
        assertThat(list.get(0).get("verified")).isEqualTo(true);
        assertThat(list.get(1).get("courierName")).isEqualTo("Mba Kevin");
        assertThat(list.get(1).get("offerAmount")).isNull();                 // a écrit sans proposer de tarif
    }

    @Test
    void onlyTheOwnerCanListConversations() {
        when(courses.findById(100L)).thenReturn(Optional.of(course));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.listConversations(100L, 99L))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void courierNotRetainedSeesHisOfferDeclinedWithoutTheWinnerName() {
        // Coursier 2 a discuté sur la course 100, mais le client a retenu le coursier 3
        Course taken = Course.builder().id(100L).clientId(1L).courierId(3L).description("Pharmacie").status("ASSIGNED")
                .createdAt(LocalDateTime.now()).build();
        when(courses.findByCourierIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
        when(rooms.findByCourierId(2L)).thenReturn(List.of(room1));
        when(courses.findAllById(List.of(100L))).thenReturn(List.of(taken));

        CourseResponse r = service.getMyMissions(2L).get(0);

        assertThat(r.getNotRetained()).isTrue();
        assertThat(r.getCourierName()).isNull();
        assertThat(r.getContactPhone()).isNull();
    }

    @Test
    void retainedCourierIsNotMarkedDeclined() {
        Course mine = Course.builder().id(300L).clientId(1L).courierId(2L).description("a").status("ASSIGNED").build();
        when(courses.findByCourierIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(mine));
        when(rooms.findByCourierId(2L)).thenReturn(List.of());

        assertThat(service.getMyMissions(2L).get(0).getNotRetained()).isNull();
    }
}
