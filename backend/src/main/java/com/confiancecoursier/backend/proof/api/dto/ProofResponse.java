package com.confiancecoursier.backend.proof.api.dto;

import com.confiancecoursier.backend.proof.domain.Proof;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour une preuve de livraison.
 *
 * <p>Le champ {@code presignedUrl} est peuplé par {@code ProofService}
 * au moment de la lecture — il n'est jamais persisté en base.
 */
public record ProofResponse(
        Long id,
        Long courseId,
        Long courierId,
        String proofType,
        String fileKey,
        /** URL présignée MinIO valable 1h pour afficher/télécharger le fichier. */
        String presignedUrl,
        Long fileSize,
        String mimeType,
        Double latitude,
        Double longitude,
        LocalDateTime capturedAt,
        LocalDateTime uploadedAt
) {
    /**
     * Construit un {@link ProofResponse} à partir de l'entité JPA.
     *
     * @param proof        entité persistée
     * @param presignedUrl URL présignée générée par MinIO (1h)
     */
    public static ProofResponse from(Proof proof, String presignedUrl) {
        return new ProofResponse(
                proof.getId(),
                proof.getCourseId(),
                proof.getCourierId(),
                proof.getProofType(),
                proof.getFileKey(),
                presignedUrl,
                proof.getFileSize(),
                proof.getMimeType(),
                proof.getLatitude(),
                proof.getLongitude(),
                proof.getCapturedAt(),
                proof.getUploadedAt()
        );
    }
}
