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

    private String currency = "XAF";

    @Column(name = "escrow_status")
    private String escrowStatus;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

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