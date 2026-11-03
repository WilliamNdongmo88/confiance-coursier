package com.confiancecoursier.backend.proof.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entité représentant une preuve de livraison soumise par le coursier.
 *
 * <p>Chaque preuve correspond à un fichier unique (photo, vidéo ou reçu)
 * stocké dans MinIO (bucket {@code delivery-proofs}).
 *
 * <p>Le hash SHA-256 du contenu du fichier est calculé avant l'upload pour
 * détecter et rejeter les doublons (même fichier soumis deux fois).
 */
@Entity
@Table(name = "proofs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant de la course associée. */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** Identifiant du coursier qui a soumis la preuve. */
    @Column(name = "courier_id", nullable = false)
    private Long courierId;

    /**
     * Type de preuve : {@code PHOTO}, {@code VIDEO} ou {@code RECEIPT}.
     */
    @Column(name = "proof_type", nullable = false, length = 20)
    private String proofType;

    /** Clé MinIO dans le bucket {@code delivery-proofs}. */
    @Column(name = "file_key", nullable = false)
    private String fileKey;

    /**
     * Hash SHA-256 du contenu du fichier (en hexadécimal).
     * Utilisé pour détecter les soumissions en double.
     */
    @Column(name = "file_hash", length = 64)
    private String fileHash;

    /** Taille du fichier en octets. */
    @Column(name = "file_size")
    private Long fileSize;

    /** Type MIME déclaré par le client (ex: {@code image/jpeg}, {@code video/mp4}). */
    @Column(name = "mime_type", length = 100)
    private String mimeType;

    /**
     * Latitude GPS au moment de la capture (optionnel).
     * columnDefinition forcé sur NUMERIC(10,7) pour correspondre exactement
     * à la table V2 — évite l'erreur Hibernate "found [numeric] but expecting [float(53)]".
     */
    @Column(columnDefinition = "NUMERIC(10,7)")
    private Double latitude;

    /** Longitude GPS au moment de la capture (optionnel). */
    @Column(columnDefinition = "NUMERIC(10,7)")
    private Double longitude;

    /** Date/heure de capture fournie par le client (optionnel). */
    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    /** Date/heure d'upload côté serveur (remplie par {@link #onUpload()}). */
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onUpload() {
        uploadedAt = LocalDateTime.now();
    }
}
