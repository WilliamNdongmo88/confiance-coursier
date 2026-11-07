package com.confiancecoursier.backend.payment;

import com.confiancecoursier.backend.admin.api.dto.CommissionSettingsResponse;
import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.ProofDeadlinePolicy;
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
import java.time.Clock;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-060 — paiement : montant lu du serveur, statut ASSIGNED exigé, idempotence. */
class PaymentServiceTest {

    private static final java.time.ZoneId ZONE = java.time.ZoneId.of("Africa/Douala");
    private static final java.time.LocalDateTime PAID_AT = java.time.LocalDateTime.of(2026, 11, 9, 10, 0);

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

        when(commissions.getIntSetting(anyString(), anyInt())).thenAnswer(i -> i.getArgument(1)); // défauts
        service = new PaymentService(courses, ledger, mock(NotificationService.class), commissions, escrow,
                new ProofDeadlinePolicy(commissions), Clock.fixed(PAID_AT.atZone(ZONE).toInstant(), ZONE));
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
    void proofDeadlineIsPaymentPlusTwentyFourHoursWhenAsap() {
        service.initiate(request("0", "kd1"), 10L);
        assertThat(course.getPaidAt()).isEqualTo(PAID_AT);
        assertThat(course.getProofDeadline()).isEqualTo(PAID_AT.plusHours(24));
    }

    @Test
    void proofDeadlineStartsFromScheduledDateWhenLater() {
        course.setScheduledAt(PAID_AT.plusDays(2));
        service.initiate(request("0", "kd2"), 10L);
        assertThat(course.getProofDeadline()).isEqualTo(PAID_AT.plusDays(2).plusHours(24));
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
    void validationLocksTheCourseRow() {
        course.setStatus("PROOFS_SUBMITTED");
        service.validateCourse(1L, 10L);
        verify(courses).findByIdForUpdate(1L);
        verify(escrow).release(course);
    }

    // ── Moyen de paiement selon le lieu indiqué à la création ──────────────────

    @org.junit.jupiter.api.Test
    void abroadClientMustPayByCard() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> com.confiancecoursier.backend.payment.service.PaymentService.requireMethodAllowed("ABROAD", "MTN"))
                .hasMessageContaining("carte bancaire");
        org.assertj.core.api.Assertions.assertThatCode(() -> com.confiancecoursier.backend.payment.service.PaymentService.requireMethodAllowed("ABROAD", "STRIPE"))
                .doesNotThrowAnyException();
    }

    @org.junit.jupiter.api.Test
    void cameroonClientMustPayByMobileMoney() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> com.confiancecoursier.backend.payment.service.PaymentService.requireMethodAllowed("CAMEROON", "STRIPE"))
                .hasMessageContaining("Mobile Money");
        org.assertj.core.api.Assertions.assertThatCode(() -> com.confiancecoursier.backend.payment.service.PaymentService.requireMethodAllowed("CAMEROON", "ORANGE"))
                .doesNotThrowAnyException();
    }

    @org.junit.jupiter.api.Test
    void unknownLocationAcceptsAnyMethod() {
        org.assertj.core.api.Assertions.assertThatCode(() -> com.confiancecoursier.backend.payment.service.PaymentService.requireMethodAllowed(null, "STRIPE"))
                .doesNotThrowAnyException();
    }
}
