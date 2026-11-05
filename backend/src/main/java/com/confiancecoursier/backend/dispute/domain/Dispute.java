package com.confiancecoursier.backend.dispute.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Litige ouvert par un client ou un coursier sur une course.
 *
 * <p>Statuts possibles : {@code OPEN}, {@code RESOLVED}, {@code CLOSED}
 * <p>Décisions possibles (admin) : {@code REMBOURSEMENT_TOTAL}, {@code REMBOURSEMENT_PARTIEL},
 * {@code LIBERATION}, {@code SANCTION}
 */
@Entity
@Table(name = "disputes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Dispute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "opened_by", nullable = false)
    private Long openedBy;

    /** Code de motif : L-C1..L-C6 (client) ou L-F1..L-F4 (coursier). */
    @Column(name = "motif_code", nullable = false, length = 10)
    private String motifCode;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** OPEN | RESOLVED | CLOSED */
    @Builder.Default
    private String status = "OPEN";

    /** REMBOURSEMENT_TOTAL | REMBOURSEMENT_PARTIEL | LIBERATION | SANCTION */
    private String decision;

    /** Montant remboursé au client (utilisé pour REMBOURSEMENT_PARTIEL). */
    @Column(name = "refund_amount", precision = 12, scale = 2)
    private java.math.BigDecimal refundAmount;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
