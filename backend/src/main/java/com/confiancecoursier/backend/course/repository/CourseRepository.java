package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    // Récupère toutes les courses avec un statut donné (ex: PUBLISHED)
    List<Course> findByStatusOrderByCreatedAtDesc(String status);

    // Récupère toutes les courses d'un client
    List<Course> findByClientIdOrderByCreatedAtDesc(Long clientId);

    // Récupère toutes les missions d'un coursier
    List<Course> findByCourierIdOrderByCreatedAtDesc(Long courierId);

    // ─── Gains plateforme ──────────────────────────────────────────────────

    /** Somme des gains plateforme sur toutes les courses COMPLETED. */
    @Query("SELECT COALESCE(SUM(c.platformFeeAmount), 0) FROM Course c " +
           "WHERE c.status = 'COMPLETED' AND c.platformFeeAmount IS NOT NULL")
    BigDecimal sumPlatformFees();

    /** Volume brut total (total_amount) des courses COMPLETED. */
    @Query("SELECT COALESCE(SUM(c.totalAmount), 0) FROM Course c " +
           "WHERE c.status = 'COMPLETED'")
    BigDecimal sumTotalVolume();

    /** Nombre de courses COMPLETED. */
    long countByStatus(String status);

    /** Gains du mois courant. */
    @Query("SELECT COALESCE(SUM(c.platformFeeAmount), 0) FROM Course c " +
           "WHERE c.status = 'COMPLETED' AND c.platformFeeAmount IS NOT NULL " +
           "AND FUNCTION('DATE_TRUNC', 'month', c.completedAt) = FUNCTION('DATE_TRUNC', 'month', CURRENT_TIMESTAMP)")
    BigDecimal sumPlatformFeesThisMonth();

    /** Gains du mois précédent. */
    @Query(value = "SELECT COALESCE(SUM(platform_fee_amount), 0) FROM courses " +
                   "WHERE status = 'COMPLETED' AND platform_fee_amount IS NOT NULL " +
                   "AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')",
           nativeQuery = true)
    BigDecimal sumPlatformFeesLastMonth();

    /** Historique mensuel : [year_month, nb_courses, gains, volume]. */
    @Query(value = "SELECT TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month, " +
                   "COUNT(*) AS nb_courses, " +
                   "COALESCE(SUM(platform_fee_amount), 0) AS gains, " +
                   "COALESCE(SUM(total_amount), 0) AS volume " +
                   "FROM courses " +
                   "WHERE status = 'COMPLETED' AND platform_fee_amount IS NOT NULL " +
                   "GROUP BY DATE_TRUNC('month', completed_at) " +
                   "ORDER BY DATE_TRUNC('month', completed_at) DESC",
           nativeQuery = true)
    List<Object[]> findMonthlyGains();

    /** Détail des 50 dernières courses complétées avec gains. */
    List<Course> findTop50ByStatusAndPlatformFeeAmountIsNotNullOrderByCompletedAtDesc(String status);
}
