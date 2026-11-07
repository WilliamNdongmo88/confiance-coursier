package com.confiancecoursier.backend.course.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    // Nullable au départ, rempli quand le client accepte une offre
    @Column(name = "courier_id")
    private Long courierId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private String zone;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    /** Personne à contacter sur place (facultatif). */
    @Column(name = "contact_name", length = 120)
    private String contactName;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(nullable = false)
    private String status = "PUBLISHED";

    @Column(name = "course_amount")
    private BigDecimal courseAmount;

    @Column(name = "commission_rate")
    private BigDecimal commissionRate;

    @Column(name = "commission_amount")
    private BigDecimal commissionAmount;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    /** Taux de commission coursier (snapshot au moment du paiement). */
    @Column(name = "commission_rate_courier")
    private BigDecimal commissionRateCourier;

    /** Montant net reversé au coursier = tarifCoursier - commissionCoursier. */
    @Column(name = "courier_amount")
    private BigDecimal courierAmount;

    /** Gains totaux de la plateforme = fraisServiceClient + commissionCoursier. */
    @Column(name = "platform_fee_amount")
    private BigDecimal platformFeeAmount;

    @Builder.Default
    private String currency = "XAF";

    @Column(name = "escrow_status")
    private String escrowStatus;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** Frais réels déclarés par le client (achats avancés par le coursier). */
    @Builder.Default
    @Column(name = "real_costs", nullable = false)
    private BigDecimal realCosts = BigDecimal.ZERO;

    /** Clé d'idempotence pour éviter le double paiement (UNIQUE en base). */
    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "auto_validate_at")
    private LocalDateTime autoValidateAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "accepted_offer_id")
    private Long acceptedOfferId;

    /** Paramètre « rembourser les frais plateforme » figé au moment de la décision de remboursement (TICK-061). */
    @Column(name = "refund_platform_fees")
    private Boolean refundPlatformFees;

    /** Échéance de dépôt des preuves : max(scheduledAt, paidAt) + proof_deadline_hours (TICK-065b). */
    @Column(name = "proof_deadline")
    private LocalDateTime proofDeadline;

    /** Nombre de prolongations accordées par le client (max_extensions). */
    @Builder.Default
    @Column(name = "extension_count", nullable = false)
    private Integer extensionCount = 0;

    /** Date du passage en OVERDUE (point de départ du délai de grâce). */
    @Column(name = "overdue_since")
    private LocalDateTime overdueSince;

    /** Rappel « échéance − N h » déjà envoyé au coursier. */
    @Column(name = "proof_reminder_sent_at")
    private LocalDateTime proofReminderSentAt;

    /** Verrou optimiste (TICK-060) — complète le verrou pessimiste de findByIdForUpdate. */
    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        publishedAt = LocalDateTime.now();
        if (realCosts == null) realCosts = BigDecimal.ZERO;
        if (extensionCount == null) extensionCount = 0;
    }
}