package com.confiancecoursier.backend.report.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Signalement d'un comportement inapproprié d'un utilisateur.
 *
 * <p>Règle : 3 signalements en 30 jours → suspension automatique de la cible.
 */
@Entity
@Table(name = "reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** harcelement | fraude | injures | faux | autre */
    @Column(nullable = false, length = 30)
    private String motif;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** OPEN | PROCESSED | REJECTED */
    @Builder.Default
    private String status = "OPEN";

    /** SUSPENSION | AVERTISSEMENT | REJET */
    private String decision;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
