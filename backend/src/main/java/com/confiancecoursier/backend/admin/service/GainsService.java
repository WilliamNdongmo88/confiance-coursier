package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse;
import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse.CourseGainEntry;
import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse.MonthlyGain;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service de calcul des gains de la plateforme.
 *
 * <p>Les gains sont lus depuis la colonne {@code platform_fee_amount}
 * de la table {@code courses} (ajoutée en V9).
 *
 * <p>Pour les courses antérieures à V9 (platform_fee_amount IS NULL),
 * les données sont simplement exclues des totaux.
 */
@Service
public class GainsService {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final CourseRepository courseRepository;

    public GainsService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public GainsStatsResponse getStats() {

        // ── Métriques globales ──────────────────────────────────────────────
        BigDecimal totalGains      = courseRepository.sumPlatformFees();
        BigDecimal totalVolume     = courseRepository.sumTotalVolume();
        long       totalCourses    = courseRepository.countByStatus("COMPLETED");
        BigDecimal gainsThisMonth  = courseRepository.sumPlatformFeesThisMonth();
        BigDecimal gainsLastMonth  = courseRepository.sumPlatformFeesLastMonth();

        // ── Historique mensuel ──────────────────────────────────────────────
        List<Object[]> rawMonthly = courseRepository.findMonthlyGains();
        List<MonthlyGain> monthly = new ArrayList<>(rawMonthly.size());
        for (Object[] row : rawMonthly) {
            monthly.add(MonthlyGain.builder()
                    .month(String.valueOf(row[0]))
                    .nbCourses(((Number) row[1]).longValue())
                    .gains(toBD(row[2]))
                    .volume(toBD(row[3]))
                    .build());
        }

        // ── Détail des 50 dernières courses ────────────────────────────────
        List<Course> recentRaw = courseRepository
                .findTop50ByStatusAndPlatformFeeAmountIsNotNullOrderByCompletedAtDesc("COMPLETED");
        List<CourseGainEntry> recentCourses = recentRaw.stream().map(c ->
                CourseGainEntry.builder()
                        .courseId(c.getId())
                        .completedAt(c.getCompletedAt() != null ? c.getCompletedAt().format(DT_FMT) : null)
                        .totalAmount(c.getTotalAmount())
                        .commissionAmount(c.getCommissionAmount())
                        .platformFeeAmount(c.getPlatformFeeAmount())
                        .courierAmount(c.getCourierAmount())
                        .commissionRate(c.getCommissionRate())
                        .commissionRateCourier(c.getCommissionRateCourier())
                        .build()
        ).toList();

        return GainsStatsResponse.builder()
                .totalGains(totalGains)
                .totalVolume(totalVolume)
                .totalCourses(totalCourses)
                .gainsThisMonth(gainsThisMonth)
                .gainsLastMonth(gainsLastMonth)
                .monthly(monthly)
                .recentCourses(recentCourses)
                .build();
    }

    private BigDecimal toBD(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal bd) return bd;
        return new BigDecimal(o.toString());
    }
}
