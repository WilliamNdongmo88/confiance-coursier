package com.confiancecoursier.backend.payment;

import com.confiancecoursier.backend.admin.api.dto.CommissionSettingsResponse;
import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateRequest;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateResponse;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.payment.service.PaymentService;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-060 — paiement : montant lu du serveur, statut ASSIGNED exigé, idempotence. */
class PaymentServiceTest {

    private CourseRepository courses;
    private EscrowRepository ledger;
    private EscrowService escrow;
    private PaymentService service;
    private Course course;

    @BeforeEach
    void setUp() {
        courses = mock(CourseRepository.class);
        ledger = mock(EscrowRepository.class);
        escrow = mock(EscrowService.class);
        CommissionService commissions = mock(CommissionService.class);
        when(commissions.getCommissionSettings()).thenReturn(CommissionSettingsResponse.builder()
                .commissionRateClient(new BigDecimal("5"))
                .commissionRateCourier(new BigDecimal("20"))
                .tarifMinimumCoursier(new BigDecimal("5000"))
                .currency("XAF").build());

        course = Course.builder().id(1L).clientId(10L).courierId(20L).description("Riz Mokolo")
                .status("ASSIGNED").courseAmount(new BigDecimal("5000")).acceptedOfferId(7L).build();
        when(courses.findByIdForUpdate(1L)).thenReturn(Optional.of(course));
        when(courses.findById(1L)).thenReturn(Optional.of(course));
        when(ledger.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());

        service = new PaymentService(courses, ledger, mock(NotificationService.class), commissions, escrow);
    }

    private static PaymentInitiateRequest request(String fraisReels, String key) {
        PaymentInitiateRequest r = new PaymentInitiateRequest();
        r.setCourseId(1L);
        r.setFraisReels(new BigDecimal(fraisReels));
        r.setPaymentMethod("MTN");
        r.setIdempotencyKey(key);
        return r;
    }

    @Test
    void amountsComeFromAcceptedOfferNotFromClient() {
        PaymentInitiateResponse res = service.initiate(request("15000", "k1"), 10L);

        // 5 000 (offre) + 15 000 (achats) + 5 % = 21 000
        assertThat(res.getTotalAmount()).isEqualByComparingTo("21000");
        assertThat(course.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(course.getRealCosts()).isEqualByComparingTo("15000");
        assertThat(course.getCourierAmount()).isEqualByComparingTo("19000"); // 5000 − 1000 + 15000
        assertThat(course.getPlatformFeeAmount()).isEqualByComparingTo("2000");
        assertThat(course.getPaidAt()).isNotNull();
        verify(escrow).hold(eq(course), argThat(t -> t.compareTo(new BigDecimal("21000")) == 0),
                eq("MTN"), startsWith("PAY-"), eq("k1"));
    }

    @Test
    void zeroRealCostsIsAccepted() {
        PaymentInitiateResponse res = service.initiate(request("0", "k2"), 10L);
        assertThat(res.getTotalAmount()).isEqualByComparingTo("5250");
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUBLISHED", "IN_PROGRESS", "PROOFS_SUBMITTED", "DISPUTED", "COMPLETED", "REFUNDED"})
    void paymentOutsideAssignedIsConflict(String status) {
        course.setStatus(status);
        assertThatThrownBy(() -> service.initiate(request("0", "k3"), 10L)).isInstanceOf(ConflictException.class);
        verifyNoInteractions(escrow);
    }

    @Test
    void replayedKeyReturnsSamePaymentWithoutNewHold() {
        when(ledger.findByIdempotencyKey("k4")).thenReturn(Optional.of(EscrowEntry.builder()
                .courseId(1L).entryType("HOLD").amount(new BigDecimal("21000")).providerRef("PAY-AAAA")
                .status("CONFIRMED").idempotencyKey("k4").build()));

        PaymentInitiateResponse res = service.initiate(request("15000", "k4"), 10L);

        assertThat(res.getPaymentRef()).isEqualTo("PAY-AAAA");
        assertThat(res.getTotalAmount()).isEqualByComparingTo("21000");
        verifyNoInteractions(escrow);
    }

    @Test
    void replayedKeyFromAnotherClientIsRefused() {
        when(ledger.findByIdempotencyKey("k5")).thenReturn(Optional.of(EscrowEntry.builder()
                .courseId(1L).entryType("HOLD").amount(new BigDecimal("21000")).providerRef("PAY-AAAA")
                .status("CONFIRMED").idempotencyKey("k5").build()));

        assertThatThrownBy(() -> service.initiate(request("0", "k5"), 99L)).isInstanceOf(ConflictException.class);
        verifyNoInteractions(escrow);
    }

    @Test
    void schedulerSkipsCourseDisputedInTheMeantime() {
        // TICK-062 : la course était PROOFS_SUBMITTED à la sélection, un litige a été ouvert avant le verrou
        Course candidate = Course.builder().id(1L).clientId(10L).courierId(20L).description("x")
                .status("PROOFS_SUBMITTED").autoValidateAt(java.time.LocalDateTime.now().minusHours(1)).build();
        when(courses.findByStatusOrderByCreatedAtDesc("PROOFS_SUBMITTED")).thenReturn(java.util.List.of(candidate));
        course.setStatus("DISPUTED");

        assertThat(service.autoValidateExpiredCourses()).isZero();
        verify(escrow, never()).release(any());
    }

    @Test
    void validationLocksTheCourseRow() {
        course.setStatus("PROOFS_SUBMITTED");
        service.validateCourse(1L, 10L);
        verify(courses).findByIdForUpdate(1L);
        verify(escrow).release(course);
    }
}
