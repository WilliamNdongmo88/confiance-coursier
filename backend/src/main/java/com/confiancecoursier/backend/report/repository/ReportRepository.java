package com.confiancecoursier.backend.report.repository;

import com.confiancecoursier.backend.report.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatus(String status);

    /** Signalements reçus par un utilisateur après une date donnée (fenêtre glissante 30j). */
    List<Report> findByTargetIdAndCreatedAtAfter(Long targetId, LocalDateTime since);

    /** TICK-063 : le signaleur a-t-il déjà signalé cette cible dans la fenêtre ? */
    boolean existsByReporterIdAndTargetIdAndCreatedAtAfter(Long reporterId, Long targetId, LocalDateTime since);

    /**
     * TICK-063 : nombre de <b>signaleurs distincts</b> ayant signalé la cible depuis {@code since}
     * et partageant au moins une course avec elle (client ↔ coursier). Les signalements rejetés
     * par l'admin ne comptent pas.
     */
    @Query("SELECT COUNT(DISTINCT r.reporterId) FROM Report r " +
           "WHERE r.targetId = :targetId AND r.createdAt > :since " +
           "AND (r.decision IS NULL OR r.decision <> 'REJET') " +
           "AND EXISTS (SELECT 1 FROM Course c WHERE " +
           "  (c.clientId = r.reporterId AND c.courierId = :targetId) OR " +
           "  (c.courierId = r.reporterId AND c.clientId = :targetId))")
    long countDistinctReportersWithSharedCourse(@Param("targetId") Long targetId,
                                                @Param("since") LocalDateTime since);

    /** Signalements reçus par ce compte (résumé admin). */
    long countByTargetId(Long targetId);
}
