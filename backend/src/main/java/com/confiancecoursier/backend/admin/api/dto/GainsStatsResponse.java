package com.confiancecoursier.backend.admin.api.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Réponse de {@code GET /api/admin/gains}.
 *
 * <p>Contient les métriques globales de gains de la plateforme
 * ainsi que l'historique mensuel et le détail par course.
 */
@Data
@Builder
public class GainsStatsResponse {

    /** Gains totaux cumulés toutes périodes confondues. */
    private BigDecimal totalGains;

    /** Volume brut total payé par les clients (COMPLETED). */
    private BigDecimal totalVolume;

    /** Nombre total de courses complétées. */
    private long totalCourses;

    /** Gains du mois courant. */
    private BigDecimal gainsThisMonth;

    /** Gains du mois précédent. */
    private BigDecimal gainsLastMonth;

    /** Historique mensuel des gains (trié du plus récent au plus ancien). */
    private List<MonthlyGain> monthly;

    /** Détail des dernières courses (max 50). */
    private List<CourseGainEntry> recentCourses;

    // ── Sous-types ──────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class MonthlyGain {
        /** Format : "2026-11" */
        private String month;
        private BigDecimal gains;
        private BigDecimal volume;
        private long      nbCourses;
    }

    @Data
    @Builder
    public static class CourseGainEntry {
        private Long       courseId;
        /** Description de la course (pour la reconnaître dans la liste). */
        private String     description;
        /** COMPLETED (payée au coursier ou partagée) | REFUNDED (client remboursé). */
        private String     status;
        /** RELEASED | REFUNDED | SPLIT : issue du séquestre. */
        private String     escrowStatus;
        private String     completedAt;
        private BigDecimal totalAmount;
        private BigDecimal commissionAmount;
        private BigDecimal platformFeeAmount;
        private BigDecimal courierAmount;
        private BigDecimal commissionRate;
        private BigDecimal commissionRateCourier;
    }
}
