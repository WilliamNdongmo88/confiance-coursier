package com.confiancecoursier.backend.admin.api.dto;

import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.user.domain.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Réponse détaillée d'une soumission KYC pour le back-office admin.
 *
 * <p>Inclut les informations personnelles saisies par le coursier lors de la soumission
 * (à comparer visuellement avec les documents), les informations du compte utilisateur,
 * ainsi que les URLs présignées des fichiers (générées par le contrôleur).
 */
public record AdminKycResponse(
    Long id,
    Long userId,
    // ─── Informations du compte ─────────────────────────────────────────────
    String userFullName,
    String userEmail,
    // ─── Informations personnelles déclarées lors du KYC ────────────────────
    String firstName,
    String lastName,
    LocalDate birthDate,
    String nationality,
    // ─── Document ───────────────────────────────────────────────────────────
    String documentType,
    String status,
    String rejectionReason,
    LocalDateTime submittedAt,
    LocalDateTime reviewedAt,
    // ─── Fichiers (URLs présignées MinIO) ────────────────────────────────────
    String frontFileUrl,
    String backFileUrl,
    String selfieFileUrl
) {
    /**
     * Construit la réponse à partir de l'entité KYC, de l'utilisateur propriétaire
     * et des URLs présignées générées par MinIO.
     */
    public static AdminKycResponse of(KycSubmission s, User user,
                                      String frontFileUrl,
                                      String backFileUrl,
                                      String selfieFileUrl) {
        return new AdminKycResponse(
                s.getId(),
                s.getUserId(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                s.getFirstName(),
                s.getLastName(),
                s.getBirthDate(),
                s.getNationality(),
                s.getDocumentType(),
                s.getStatus(),
                s.getRejectionReason(),
                s.getCreatedAt(),
                s.getReviewedAt(),
                frontFileUrl,
                backFileUrl,
                selfieFileUrl
        );
    }
}
