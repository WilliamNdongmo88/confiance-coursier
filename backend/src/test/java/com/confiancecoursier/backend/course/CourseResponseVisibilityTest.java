package com.confiancecoursier.backend.course;

import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.api.dto.CourseResponse.Viewer;
import com.confiancecoursier.backend.course.domain.Course;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TICK-070 — données financières et de suivi selon la personne qui consulte.
 * Course E2E-1 : tarif 5 000, achats 15 000, frais client 5 % (1 000), commission 20 % (1 000) → net 19 000.
 */
class CourseResponseVisibilityTest {

    private static final LocalDateTime PAID = LocalDateTime.of(2026, 11, 6, 10, 0);

    private static Course paid() {
        return Course.builder().id(1L).clientId(10L).courierId(20L).description("Riz Mokolo").status("PROOFS_SUBMITTED")
                .courseAmount(new BigDecimal("5000")).realCosts(new BigDecimal("15000"))
                .commissionRate(new BigDecimal("5")).commissionAmount(new BigDecimal("1000"))
                .commissionRateCourier(new BigDecimal("20")).courierAmount(new BigDecimal("19000"))
                .totalAmount(new BigDecimal("21000")).platformFeeAmount(new BigDecimal("2000"))
                .paidAt(PAID).autoValidateAt(PAID.plusHours(96)).escrowStatus("HELD").build();
    }

    @Test
    void clientSeesHisFeesButNotTheCourierCommission() {
        CourseResponse r = CourseResponse.of(paid(), 5L, Viewer.CLIENT, "Awa", "Jean");

        assertThat(r.getCommissionRate()).isEqualByComparingTo("5");
        assertThat(r.getCommissionAmount()).isEqualByComparingTo("1000");
        assertThat(r.getTotalAmount()).isEqualByComparingTo("21000");
        assertThat(r.getRealCosts()).isEqualByComparingTo("15000");
        assertThat(r.getCommissionRateCourier()).isNull();
        assertThat(r.getCourierCommissionAmount()).isNull();
        assertThat(r.getCourierAmount()).isNull();
    }

    @Test
    void courierSeesNetAndCommissionButNotClientFees() {
        CourseResponse r = CourseResponse.of(paid(), 5L, Viewer.COURIER, "Awa", "Jean");

        assertThat(r.getCourierAmount()).isEqualByComparingTo("19000");
        assertThat(r.getCourierCommissionAmount()).isEqualByComparingTo("1000");
        assertThat(r.getCommissionRateCourier()).isEqualByComparingTo("20");
        assertThat(r.getCommissionRate()).isNull();
        assertThat(r.getCommissionAmount()).isNull();
        assertThat(r.getTotalAmount()).isNull();
    }

    @Test
    void adminSeesEverything() {
        CourseResponse r = CourseResponse.of(paid(), null, Viewer.ADMIN, "Awa", "Jean");
        assertThat(r.getCommissionAmount()).isEqualByComparingTo("1000");
        assertThat(r.getCourierAmount()).isEqualByComparingTo("19000");
    }

    @Test
    void trackingDataAndNamesAreExposedToBothParties() {
        for (Viewer v : new Viewer[]{Viewer.CLIENT, Viewer.COURIER}) {
            CourseResponse r = CourseResponse.of(paid(), 5L, v, "Awa", "Jean");
            assertThat(r.getPaidAt()).isEqualTo(PAID);
            assertThat(r.getAutoValidateAt()).isEqualTo(PAID.plusHours(96));
            assertThat(r.getEscrowStatus()).isEqualTo("HELD");
            assertThat(r.getClientName()).isEqualTo("Awa");
            assertThat(r.getCourierName()).isEqualTo("Jean");
        }
    }

    @Test
    void courierBrowsingAPublishedRequestSeesNoPaymentAmounts() {
        Course published = Course.builder().id(2L).clientId(10L).description("x").status("PUBLISHED").build();
        CourseResponse r = CourseResponse.of(published, null, Viewer.OTHER, "Awa", null);
        assertThat(r.getTotalAmount()).isNull();
        assertThat(r.getCommissionAmount()).isNull();
        assertThat(r.getCourierAmount()).isNull();
        assertThat(r.getCourierName()).isNull();
        assertThat(r.getClientName()).isEqualTo("Awa");
    }
}
