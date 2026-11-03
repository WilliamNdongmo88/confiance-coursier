package com.confiancecoursier.backend.report.repository;

import com.confiancecoursier.backend.report.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatus(String status);
    /** Signalements reçus par un utilisateur après une date donnée (fenêtre glissante 30j). */
    List<Report> findByTargetIdAndCreatedAtAfter(Long targetId, LocalDateTime since);
}
