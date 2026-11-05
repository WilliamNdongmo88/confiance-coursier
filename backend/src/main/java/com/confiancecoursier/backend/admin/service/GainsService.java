package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse;
import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse.CourseGainEntry;
import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse.MonthlyGain;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service de calcul des gains de la plateforme.
 *
 * <p>TICK-061 : les gains sont lus <b>uniquement</b> depuis les lignes {@code PLATFORM_FEE}
 * du registre de séquestre (frais de service client + commission coursier), et non depuis
 * le statut des courses. Les frais conservés lors d'un remboursement total ou d'un partage
 * sont donc comptés, et une course remboursée intégralement ne rapporte rien.
 */
@Service
public class GainsService {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final CourseRepository courseRepository;
    private final EscrowRepository escrowRepository;

    public GainsService(CourseRepository courseRepository, EscrowRepository escrowRepository) {
        this.courseRepository = courseRepository;
        this.escrowRepository = escrowRepository;
    }

    @Transactional(readOnly = true)
    public GainsStatsResponse getStats() {

        // ── Métriques globales ──────────────────────────────────────────────
        BigDecimal totalGains      = escrowRepository.sumPlatformFees();
        BigDecimal totalVolume     = escrowRepository.sumClosedVolume();
        long       totalCourses    = courseRepository.countByStatus("COMPLETED");
        BigDecimal gainsThisMonth  = escrowRepository.sumPlatformFeesThisMonth();
        BigDecimal gainsLastMonth  = escrowRepository.sumPlatformFeesLastMonth();

        // ── Historique mensuel ──────────────────────────────────────────────
        List<Object[]> rawMonthly = escrowRepository.findMonthlyGains();
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
                .findTop50ByStatusInAndPlatformFeeAmountIsNotNullOrderByCompletedAtDesc(List.of("COMPLETED", "REFUNDED"));
        Map<Long, BigDecimal> feeByCourse = new HashMap<>();
        if (!recentRaw.isEmpty()) {
            for (Object[] row : escrowRepository.sumPlatformFeeByCourse(recentRaw.stream().map(Course::getId).toList())) {
                feeByCourse.put((Long) row[0], toBD(row[1]));
            }
        }
        List<CourseGainEntry> recentCourses = recentRaw.stream().map(c ->
                CourseGainEntry.builder()
                        .courseId(c.getId())
                        .completedAt(c.getCompletedAt() != null ? c.getCompletedAt().format(DT_FMT) : null)
                        .totalAmount(c.getTotalAmount())
                        .commissionAmount(c.getCommissionAmount())
                        .platformFeeAmount(feeByCourse.getOrDefault(c.getId(), BigDecimal.ZERO))
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
