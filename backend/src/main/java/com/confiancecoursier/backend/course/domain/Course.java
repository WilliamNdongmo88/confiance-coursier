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
    @Column(name = "real_costs")
    private BigDecimal realCosts;

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

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        publishedAt = LocalDateTime.now();
    }
}