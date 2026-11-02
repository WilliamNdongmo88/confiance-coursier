package com.confiancecoursier.backend.kyc.api.dto;

import com.confiancecoursier.backend.kyc.domain.KycSubmission;

import java.time.LocalDateTime;

/**
 * Réponse indiquant le statut KYC courant de l'utilisateur connecté.
 */
public record KycStatusResponse(
        Long submissionId,
        String documentType,
        String status,
        String rejectionReason,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt
) {
    public static KycStatusResponse from(KycSubmission s) {
        return new KycStatusResponse(
                s.getId(),
                s.getDocumentType(),
                s.getStatus(),
                s.getRejectionReason(),
                s.getCreatedAt(),
                s.getReviewedAt()
        );
    }

    /** Utilisé quand aucune soumission n'existe encore */
    public static KycStatusResponse none() {
        return new KycStatusResponse(null, null, "NONE", null, null, null);
    }
}
