package com.confiancecoursier.backend.payment.repository;

import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Registre de séquestre. Convention de signe (TICK-061) : HOLD est positif,
 * COURIER_PAYOUT / PLATFORM_FEE / REFUND_CLIENT sont négatifs.
 * Pour une course clôturée, la somme de ses lignes vaut 0.
 */
@Repository
public interface EscrowRepository extends JpaRepository<EscrowEntry, Long> {

    /** Toutes les entrées d'une course. */
    List<EscrowEntry> findByCourseId(Long courseId);

    /** Idempotence : vérifie si un HOLD existe déjà pour cette clé. */
    Optional<EscrowEntry> findByIdempotencyKey(String idempotencyKey);

    boolean existsByCourseIdAndEntryType(Long courseId, String entryType);

    /** Somme algébrique des lignes d'une course (0 pour une course clôturée). */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM EscrowEntry e WHERE e.courseId = :courseId")
    BigDecimal sumByCourseId(@Param("courseId") Long courseId);

    // ─── Gains plateforme (lus uniquement depuis PLATFORM_FEE) ───────────────

    @Query("SELECT COALESCE(-SUM(e.amount), 0) FROM EscrowEntry e WHERE e.entryType = 'PLATFORM_FEE'")
    BigDecimal sumPlatformFees();

    @Query(value = "SELECT COALESCE(-SUM(amount), 0) FROM escrow_ledger " +
                   "WHERE entry_type = 'PLATFORM_FEE' " +
                   "AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())",
           nativeQuery = true)
    BigDecimal sumPlatformFeesThisMonth();

    @Query(value = "SELECT COALESCE(-SUM(amount), 0) FROM escrow_ledger " +
                   "WHERE entry_type = 'PLATFORM_FEE' " +
                   "AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')",
           nativeQuery = true)
    BigDecimal sumPlatformFeesLastMonth();

    /** Volume encaissé (HOLD) des courses dont le séquestre est clôturé. */
    @Query(value = "SELECT COALESCE(SUM(h.amount), 0) FROM escrow_ledger h " +
                   "WHERE h.entry_type = 'HOLD' AND EXISTS (" +
                   "  SELECT 1 FROM escrow_ledger o WHERE o.course_id = h.course_id AND o.entry_type <> 'HOLD')",
           nativeQuery = true)
    BigDecimal sumClosedVolume();

    /** Historique mensuel : [year_month, nb_courses, gains, volume] — mois de clôture du séquestre. */
    @Query(value = "SELECT TO_CHAR(DATE_TRUNC('month', f.created_at), 'YYYY-MM') AS month, " +
                   "COUNT(DISTINCT f.course_id) AS nb_courses, " +
                   "COALESCE(-SUM(f.amount), 0) AS gains, " +
                   "COALESCE(SUM((SELECT SUM(h.amount) FROM escrow_ledger h " +
                   "              WHERE h.course_id = f.course_id AND h.entry_type = 'HOLD')), 0) AS volume " +
                   "FROM escrow_ledger f " +
                   "WHERE f.entry_type = 'PLATFORM_FEE' " +
                   "GROUP BY DATE_TRUNC('month', f.created_at) " +
                   "ORDER BY DATE_TRUNC('month', f.created_at) DESC",
           nativeQuery = true)
    List<Object[]> findMonthlyGains();

    /** Frais plateforme effectivement perçus par course : [course_id, fee]. */
    @Query("SELECT e.courseId, -SUM(e.amount) FROM EscrowEntry e " +
           "WHERE e.entryType = 'PLATFORM_FEE' AND e.courseId IN :courseIds GROUP BY e.courseId")
    List<Object[]> sumPlatformFeeByCourse(@Param("courseIds") Collection<Long> courseIds);
}
