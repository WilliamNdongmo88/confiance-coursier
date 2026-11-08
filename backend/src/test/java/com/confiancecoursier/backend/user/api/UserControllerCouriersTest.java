package com.confiancecoursier.backend.user.api;

import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.review.repository.ReviewRepository;
import com.confiancecoursier.backend.user.api.dto.CourierSummaryResponse;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** TICK-089 — coursiers proposés au client : ceux de la ville de la course d'abord, données réelles. */
class UserControllerCouriersTest {

    private static User courier(long id, String name, String city, String vehicle, String score) {
        return User.builder().id(id).email(id + "@t.cm").fullName(name).role("COURIER").status("ACTIVE")
                .kycStatus("APPROVED").city(city).vehicle(vehicle).trustScore(new BigDecimal(score)).build();
    }

    @Test
    void couriersOfTheCourseCityComeFirstAndKeepTheirRatingOrder() {
        UserRepository users = mock(UserRepository.class);
        CourseRepository courses = mock(CourseRepository.class);
        // Ordre du dépôt : par note décroissante
        when(users.findByRoleAndStatusAndKycStatusOrderByTrustScoreDesc("COURIER", "ACTIVE", "APPROVED")).thenReturn(List.of(
                courier(1, "Mba Kevin", "Douala", "MOTO", "4.8"),
                courier(2, "Talla Varnelle", "Yaoundé", "VOITURE", "4.5"),
                courier(3, "Tchinda Bertholt", " yaounde ", null, "0")));
        when(courses.countByCourierIdAndStatus(2L, "COMPLETED")).thenReturn(12L);

        List<CourierSummaryResponse> list = new UserController(users, mock(ReviewRepository.class), courses)
                .getAvailableCouriers("Yaounde").getBody();

        assertThat(list).extracting(CourierSummaryResponse::getId).containsExactly(2L, 3L, 1L);
        assertThat(list.get(0).isSameCity()).isTrue();
        assertThat(list.get(0).getCompletedCourses()).isEqualTo(12);
        assertThat(list.get(0).getVehicle()).isEqualTo("VOITURE");
        assertThat(list.get(0).isKycVerified()).isTrue();
        assertThat(list.get(1).getAverageRating()).isNull();   // pas encore noté : pas de note inventée
        assertThat(list.get(2).isSameCity()).isFalse();
    }

    @Test
    void cityComparisonIgnoresCaseAccentsAndSpaces() {
        assertThat(UserController.normalizeCity("  Ngaoundéré ")).isEqualTo(UserController.normalizeCity("ngaoundere"));
        assertThat(UserController.normalizeCity(null)).isEmpty();
    }
}
