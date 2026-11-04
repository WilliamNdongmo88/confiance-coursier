package com.confiancecoursier.backend.kyc.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ─── Informations personnelles saisies lors du KYC ────────────────────────

    /** Prénom du coursier (tel que saisi à l'étape 1 du formulaire KYC). */
    @Column(name = "first_name", length = 100)
    private String firstName;

    /** Nom de famille du coursier. */
    @Column(name = "last_name", length = 100)
    private String lastName;

    /** Date de naissance (format ISO : YYYY-MM-DD). */
    @Column(name = "birth_date")
    private java.time.LocalDate birthDate;

    /** Nationalité déclarée par le coursier (ex : "Camerounaise"). */
    @Column(name = "nationality", length = 100)
    private String nationality;

    // ─── Documents ────────────────────────────────────────────────────────────

    /** CNI ou PASSPORT */
    @Column(name = "document_type", nullable = false)
    private String documentType;

    /** Clé S3/MinIO du recto du document */
    @Column(name = "front_file_key", nullable = false)
    private String frontFileKey;

    /** Clé S3/MinIO du verso du document */
    @Column(name = "back_file_key", nullable = false)
    private String backFileKey;

    /** Clé S3/MinIO du selfie */
    @Column(name = "selfie_file_key", nullable = false)
    private String selfieFileKey;

    /** Statut : PENDING, APPROVED, REJECTED */
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /** ID de l'admin qui a traité la demande */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
