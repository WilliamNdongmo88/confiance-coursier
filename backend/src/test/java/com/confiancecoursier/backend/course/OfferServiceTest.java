package com.confiancecoursier.backend.course;

import com.confiancecoursier.backend.admin.api.dto.CommissionSettingsResponse;
import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** TICK-058 (offre depuis le chat) et TICK-059 (acceptation) — règles métier côté serveur. */
class OfferServiceTest {

    private CourseOfferRepository offers;
    private CourseRepository courses;
    private UserRepository users;
    private NotificationService notifications;
    private OfferService service;
    private Course course;
    private com.confiancecoursier.backend.review.service.ReviewGate reviewGate;

    @BeforeEach
    void setUp() {
        offers = mock(CourseOfferRepository.class);
        courses = mock(CourseRepository.class);
        users = mock(UserRepository.class);
        notifications = mock(NotificationService.class);
        CommissionService commissions = mock(CommissionService.class);
        when(commissions.getCommissionSettings()).thenReturn(CommissionSettingsResponse.defaults()); // minimum 5000

        when(offers.save(any(CourseOffer.class))).thenAnswer(i -> {
            CourseOffer o = i.getArgument(0);
            if (o.getId() == null) o.setId(99L);
            return o;
        });
        when(offers.saveAndFlush(any(CourseOffer.class))).thenAnswer(i -> i.getArgument(0));

        course = Course.builder().id(100L).clientId(1L).description("Pharmacie").status("PUBLISHED").build();
        when(courses.findByIdForUpdate(100L)).thenReturn(Optional.of(course));

        user(2L, "COURIER", "ACTIVE", "APPROVED");
        user(3L, "COURIER", "ACTIVE", "PENDING");
        user(4L, "CLIENT", "ACTIVE", null);
        user(5L, "COURIER", "ACTIVE", "APPROVED");

        reviewGate = mock(com.confiancecoursier.backend.review.service.ReviewGate.class);
        service = new OfferService(offers, courses, users, notifications, commissions, reviewGate);
    }

    private void user(long id, String role, String status, String kyc) {
        when(users.findById(id)).thenReturn(Optional.of(
                User.builder().id(id).email(id + "@t.cm").passwordHash("x").role(role).status(status).kycStatus(kyc).build()));
    }

    // ── Offre (TICK-058) ─────────────────────────────────────────────────────

    @Test
    void offerBelowMinimumIsRefused() {
        assertThatThrownBy(() -> service.submitOffer(100L, 2L, new BigDecimal("3000"), null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("5000");
        verify(offers, never()).save(any());
    }

    @Test
    void offerWithoutApprovedKycOrNotCourierIsRefused() {
        assertThatThrownBy(() -> service.submitOffer(100L, 3L, new BigDecimal("6000"), null))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.submitOffer(100L, 4L, new BigDecimal("6000"), null))
                .isInstanceOf(ForbiddenException.class);
        verify(offers, never()).save(any());
    }

    @Test
    void offerOnCourseNoLongerPublishedIsRefused() {
        course.setStatus("IN_PROGRESS");
        assertThatThrownBy(() -> service.submitOffer(100L, 2L, new BigDecimal("6000"), null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void offerIsRoundedToWholeXaf() {
        CourseOffer o = service.submitOffer(100L, 2L, new BigDecimal("6000.40"), "  ");
        assertThat(o.getAmount()).isEqualByComparingTo("6000");
        assertThat(o.getAmount().scale()).isZero();
        assertThat(o.getStatus()).isEqualTo("ACTIVE");
        assertThat(o.getDetails()).isNull();
    }

    @Test
    void newOfferSupersedesPreviousOneWhichIsFlushedFirst() {
        CourseOffer previous = CourseOffer.builder().id(50L).courseId(100L).courierId(2L)
                .amount(new BigDecimal("6000")).status("ACTIVE").build();
        when(offers.findByCourseIdAndCourierIdAndStatus(100L, 2L, "ACTIVE")).thenReturn(Optional.of(previous));

        CourseOffer created = service.submitOffer(100L, 2L, new BigDecimal("5500"), null);

        assertThat(previous.getStatus()).isEqualTo("SUPERSEDED");
        assertThat(created.getAmount()).isEqualByComparingTo("5500");
        // L'UPDATE de l'ancienne offre doit partir avant l'INSERT (index UNIQUE partiel sur ACTIVE)
        InOrder order = inOrder(offers);
        order.verify(offers).saveAndFlush(previous);
        order.verify(offers).save(argThatStatus("ACTIVE"));
    }

    private static CourseOffer argThatStatus(String status) {
        return org.mockito.ArgumentMatchers.argThat(o -> o != null && status.equals(o.getStatus()));
    }

    // ── Acceptation (TICK-059) ───────────────────────────────────────────────

    private CourseOffer activeOffer(long id, long courierId, String amount) {
        CourseOffer o = CourseOffer.builder().id(id).courseId(100L).courierId(courierId)
                .amount(new BigDecimal(amount)).status("ACTIVE").build();
        when(offers.findById(id)).thenReturn(Optional.of(o));
        return o;
    }

    @Test
    void acceptAssignsCourierAndRejectsOtherOffers() {
        CourseOffer chosen = activeOffer(10L, 2L, "6000");
        CourseOffer other = activeOffer(11L, 5L, "7000");
        when(offers.findByCourseIdAndStatus(100L, "ACTIVE")).thenReturn(List.of(other));

        service.acceptOffer(100L, 10L, 1L);

        assertThat(chosen.getStatus()).isEqualTo("ACCEPTED");
        assertThat(other.getStatus()).isEqualTo("REJECTED");
        assertThat(course.getStatus()).isEqualTo("ASSIGNED");
        assertThat(course.getCourierId()).isEqualTo(2L);
        assertThat(course.getAcceptedOfferId()).isEqualTo(10L);
        assertThat(course.getCourseAmount()).isEqualByComparingTo("6000");
        verify(notifications).notifyCourierNotRetained(5L, 100L);
        verify(notifications).notifyCourseAssigned(2L, 100L);
        verify(courses).findByIdForUpdate(100L); // verrou de ligne
    }

    @Test
    void acceptClosesTheOtherCouriersConversations() {
        var rooms = mock(com.confiancecoursier.backend.chat.repository.ChatRoomRepository.class);
        var mine = com.confiancecoursier.backend.chat.domain.ChatRoom.builder().id(20L).courseId(100L).clientId(1L).courierId(2L).isArchived(false).build();
        var other = com.confiancecoursier.backend.chat.domain.ChatRoom.builder().id(21L).courseId(100L).clientId(1L).courierId(5L).isArchived(false).build();
        when(rooms.findByCourseId(100L)).thenReturn(List.of(mine, other));
        OfferService svc = new OfferService(offers, courses, users, notifications, mock(CommissionService.class), reviewGate, rooms);
        activeOffer(10L, 2L, "6000");
        when(offers.findByCourseIdAndStatus(100L, "ACTIVE")).thenReturn(List.of());

        svc.acceptOffer(100L, 10L, 1L);

        assertThat(mine.getIsArchived()).isFalse();   // discussion du coursier retenu : ouverte
        assertThat(other.getIsArchived()).isTrue();   // coursier non retenu : lecture seule
        verify(rooms).save(other);
        verify(rooms, never()).save(mine);
    }

    @Test
    void secondAcceptanceIsRefused() {
        activeOffer(10L, 2L, "6000");
        when(offers.findByCourseIdAndStatus(100L, "ACTIVE")).thenReturn(List.of());
        service.acceptOffer(100L, 10L, 1L);

        assertThatThrownBy(() -> service.acceptOffer(100L, 10L, 1L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyOwnerCanAccept() {
        activeOffer(10L, 2L, "6000");
        assertThatThrownBy(() -> service.acceptOffer(100L, 10L, 4L)).isInstanceOf(ForbiddenException.class);
        assertThat(course.getStatus()).isEqualTo("PUBLISHED");
    }

    @Test
    void supersededOrFakeOfferCannotBeAccepted() {
        CourseOffer old = activeOffer(10L, 2L, "6000");
        old.setStatus("SUPERSEDED");
        assertThatThrownBy(() -> service.acceptOffer(100L, 10L, 1L)).isInstanceOf(ConflictException.class);

        CourseOffer fake = activeOffer(12L, 2L, "0.01");
        fake.setStatus("REJECTED"); // nettoyée par V13
        assertThatThrownBy(() -> service.acceptOffer(100L, 12L, 1L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void offerFromCourierWhoLostKycCannotBeAccepted() {
        activeOffer(10L, 3L, "6000"); // coursier 3 : KYC PENDING
        assertThatThrownBy(() -> service.acceptOffer(100L, 10L, 1L)).isInstanceOf(ConflictException.class);
        assertThat(course.getCourierId()).isNull();
    }

    @Test
    void offerIsBlockedWhileTheCourierOwesAReview() {
        doThrow(new ConflictException("Notez d'abord la course #9")).when(reviewGate)
                .requireNoPendingReview(eq(2L), anyString());
        assertThatThrownBy(() -> service.submitOffer(100L, 2L, new BigDecimal("6000"), null))
                .isInstanceOf(ConflictException.class).hasMessageContaining("#9");
        verify(offers, never()).save(any());
    }
}
