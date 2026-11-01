package com.confiancecoursier.backend.payment.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "escrow_ledger")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscrowEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** HOLD | RELEASE | REFUND */
    @Column(name = "entry_type", nullable = false)
    private String entryType;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** STRIPE | MTN | ORANGE | SIMULATED */
    private String provider;

    @Column(name = "provider_ref")
    private String providerRef;

    /** PENDING | CONFIRMED | FAILED */
    private String status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
