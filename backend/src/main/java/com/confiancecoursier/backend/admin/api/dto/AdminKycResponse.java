package com.confiancecoursier.backend.admin.api.dto;

import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.user.domain.User;

import java.time.LocalDateTime;

/**
 * Réponse détaillée d'une soumission KYC pour le back-office admin.
 *
 * <p>Inclut les informations de l'utilisateur propriétaire de la soumission
 * ainsi que les URLs présignées des fichiers (générées par le contrôleur).
 */
public record AdminKycResponse(
    Long id,
    Long userId,
    String userFullName,
    String userEmail,
    String documentType,
    String status,
    String rejectionReason,
    LocalDateTime submittedAt,
    LocalDateTime reviewedAt,
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
