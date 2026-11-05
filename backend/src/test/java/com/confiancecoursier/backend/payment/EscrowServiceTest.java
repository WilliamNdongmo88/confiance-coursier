package com.confiancecoursier.backend.payment;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TICK-061 — séquestre : chaque clôture écrit des sorties négatives et la somme du ledger vaut 0.
 *
 * <p>Scénario E2E-1 : tarif 5 000, frais réels 15 000, frais client 5 %, commission coursier 20 %.
 * base 20 000 → frais client 1 000 → total 21 000 ; commission 1 000 →
 * coursier 4 000 + 15 000 = 19 000 ; plateforme 1 000 + 1 000 = 2 000.
 */
class EscrowServiceTest {

    private final List<EscrowEntry> ledger = new ArrayList<>();
    private EscrowRepository escrowRepository;
    private CourseRepository courseRepository;
    private CommissionService commissionService;
    private EscrowService escrow;

    @BeforeEach
    void setUp() {
        escrowRepository = mock(EscrowRepository.class);
        courseRepository = mock(CourseRepository.class);
        commissionService = mock(CommissionService.class);

        when(escrowRepository.save(any(EscrowEntry.class))).thenAnswer(i -> {
            EscrowEntry e = i.getArgument(0);
            ledger.add(e);
            return e;
        });
        when(escrowRepository.sumByCourseId(anyLong())).thenAnswer(i -> sum(i.getArgument(0)));
        when(escrowRepository.existsByCourseIdAndEntryType(anyLong(), anyString())).thenAnswer(i ->
                ledger.stream().anyMatch(e -> e.getCourseId().equals(i.getArgument(0))
                        && e.getEntryType().equals(i.getArgument(1))));

        escrow = new EscrowService(escrowRepository, courseRepository, commissionService);
    }

    private BigDecimal sum(Long courseId) {
        return ledger.stream().filter(e -> e.getCourseId().equals(courseId))
                .map(EscrowEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal amountOf(String type) {
        return ledger.stream().filter(e -> e.getEntryType().equals(type))
                .map(EscrowEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Course E2E-1 payée : HOLD de 21 000 écrit via EscrowService. */
    private Course paidCourse() {
        Course c = Course.builder()
                .id(1L).clientId(10L).courierId(20L).description("Riz Mokolo").status("IN_PROGRESS")
                .courseAmount(new BigDecimal("5000"))
                .realCosts(new BigDecimal("15000"))
                .commissionRate(new BigDecimal("5"))
                .commissionAmount(new BigDecimal("1000"))
                .commissionRateCourier(new BigDecimal("20"))
                .totalAmount(new BigDecimal("21000"))
                .courierAmount(new BigDecimal("19000"))
                .platformFeeAmount(new BigDecimal("2000"))
                .build();
        escrow.hold(c, new BigDecimal("21000"), "MTN", "PAY-1", "key-1");
        return c;
    }

    @Test
    void holdIsPositiveAndPlacesFundsInEscrow() {
        Course c = paidCourse();
        assertThat(c.getEscrowStatus()).isEqualTo("HELD");
        assertThat(amountOf("HOLD")).isEqualByComparingTo("21000");
    }

    @Test
    void secondHoldIsRefused() {
        Course c = paidCourse();
        assertThatThrownBy(() -> escrow.hold(c, new BigDecimal("21000"), "MTN", "PAY-2", "key-2"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void releasePaysCourierAndPlatformAndBalancesLedger() {
        Course c = paidCourse();
        escrow.release(c);

        assertThat(amountOf("COURIER_PAYOUT")).isEqualByComparingTo("-19000");
        assertThat(amountOf("PLATFORM_FEE")).isEqualByComparingTo("-2000");
        assertThat(sum(1L)).isEqualByComparingTo("0");
        assertThat(c.getStatus()).isEqualTo("COMPLETED");
        assertThat(c.getEscrowStatus()).isEqualTo("RELEASED");
    }

    @Test
    void releaseTwiceIsRefused() {
        Course c = paidCourse();
        escrow.release(c);
        assertThatThrownBy(() -> escrow.release(c)).isInstanceOf(ConflictException.class);
        assertThat(sum(1L)).isEqualByComparingTo("0");
    }

    @Test
    void fullRefundKeepsClientServiceFeeByDefault() {
        Course c = paidCourse();
        escrow.refundTotal(c, false);

        assertThat(amountOf("REFUND_CLIENT")).isEqualByComparingTo("-20000"); // tarif + frais réels
        assertThat(amountOf("PLATFORM_FEE")).isEqualByComparingTo("-1000");   // frais de service client
        assertThat(sum(1L)).isEqualByComparingTo("0");
        assertThat(c.getStatus()).isEqualTo("REFUNDED");
        assertThat(c.getEscrowStatus()).isEqualTo("REFUNDED");
        assertThat(c.getRefundPlatformFees()).isFalse();
    }

    @Test
    void fullRefundWithFeesReturnsEverything() {
        Course c = paidCourse();
        escrow.refundTotal(c, true);

        assertThat(amountOf("REFUND_CLIENT")).isEqualByComparingTo("-21000");
        assertThat(amountOf("PLATFORM_FEE")).isEqualByComparingTo("0");
        assertThat(sum(1L)).isEqualByComparingTo("0");
        assertThat(c.getRefundPlatformFees()).isTrue();
    }

    @Test
    void splitFiftyFiftyBalancesLedger() {
        Course c = paidCourse();
        escrow.split(c, new BigDecimal("10500"));

        assertThat(amountOf("REFUND_CLIENT")).isEqualByComparingTo("-10500");
        assertThat(amountOf("PLATFORM_FEE")).isEqualByComparingTo("-2000");
        assertThat(amountOf("COURIER_PAYOUT")).isEqualByComparingTo("-8500");
        assertThat(sum(1L)).isEqualByComparingTo("0");
        assertThat(c.getStatus()).isEqualTo("COMPLETED");
        assertThat(c.getEscrowStatus()).isEqualTo("SPLIT");
    }

    @Test
    void splitWithLargeRefundCapsPlatformFeeAndStaysBalanced() {
        // Ancien défaut : remboursement de 20 000 → coursier 0 mais plateforme 2 000 → écart de 1 000
        Course c = paidCourse();
        escrow.split(c, new BigDecimal("20000"));

        assertThat(amountOf("REFUND_CLIENT")).isEqualByComparingTo("-20000");
        assertThat(amountOf("PLATFORM_FEE")).isEqualByComparingTo("-1000");
        assertThat(amountOf("COURIER_PAYOUT")).isEqualByComparingTo("0");
        assertThat(sum(1L)).isEqualByComparingTo("0");
    }

    @Test
    void splitAmountMustBeStrictlyBetweenZeroAndTotal() {
        Course c = paidCourse();
        assertThatThrownBy(() -> escrow.split(c, null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> escrow.split(c, BigDecimal.ZERO)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> escrow.split(c, new BigDecimal("21000"))).isInstanceOf(BusinessException.class);
        assertThat(ledger).hasSize(1); // seul le HOLD
    }

    @Test
    void disputedFundsCanStillBeSettled() {
        Course c = paidCourse();
        escrow.markDisputed(c);
        assertThat(c.getEscrowStatus()).isEqualTo("DISPUTED");
        escrow.refundTotal(c, false);
        assertThat(sum(1L)).isEqualByComparingTo("0");
    }

    @Test
    void unpaidCourseCannotBeSettled() {
        Course c = Course.builder().id(2L).clientId(10L).description("x").status("ASSIGNED").build();
        assertThatThrownBy(() -> escrow.release(c)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> escrow.refundTotal(c, false)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> escrow.markDisputed(c)).isInstanceOf(ConflictException.class);
    }

    @Test
    void refundSettingDefaultsToFalse() {
        when(commissionService.getBooleanSetting("refund_platform_fees_on_full_refund", false)).thenReturn(false);
        assertThat(escrow.shouldRefundPlatformFeesOnFullRefund()).isFalse();
    }
}
