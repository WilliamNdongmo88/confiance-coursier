package com.confiancecoursier.backend.user.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    private String phone;

    /** Reversement des gains du coursier : MTN | ORANGE, et le numéro Mobile Money associé. */
    @Column(name = "payout_method", length = 10)
    private String payoutMethod;

    /** TICK-094 : suspension décidée par un administrateur (motif envoyé à la personne). */
    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    @Column(name = "suspended_at")
    private java.time.LocalDateTime suspendedAt;

    @Column(name = "suspended_by")
    private Long suspendedBy;

    @Column(name = "payout_number", length = 30)
    private String payoutNumber;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role; // CLIENT, COURIER, ADMIN

    private String country;
    private String city;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, SUSPENDED, BLOCKED

    @Column(name = "trust_score")
    @Builder.Default
    private BigDecimal trustScore = BigDecimal.ZERO;

    private String badge;

    /** Statut KYC du coursier : NONE, PENDING, APPROVED, REJECTED */
    @Column(name = "kyc_status", nullable = false)
    @Builder.Default
    private String kycStatus = "NONE";

    /** TICK-074 : email confirmé par l'OTP d'inscription (obligatoire pour se connecter). */
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Un compte ne peut utiliser l'application que s'il est ACTIVE (TICK-053). */
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
