package com.confiancecoursier.backend.shared.util;

import io.minio.*;
import io.minio.errors.*;
import io.minio.http.Method;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service de stockage de fichiers vers MinIO.
 *
 * <p>Responsabilités :</p>
 * <ul>
 *   <li>Créer le bucket s'il n'existe pas encore (idempotent)</li>
 *   <li>Uploader un {@link MultipartFile} et retourner la clé unique</li>
 *   <li>Générer une URL présignée valable un temps limité (pour afficher les fichiers côté client)</li>
 * </ul>
 *
 * <p>La clé de fichier suit le format : {@code <prefix>/<uuid>.<extension>}</p>
 * <p>Exemple : {@code kyc/12/a3f1c2d4-uuid.jpg}</p>
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    /** Durée de validité par défaut des URLs présignées (en secondes). */
    private static final int PRESIGNED_URL_EXPIRY_SECONDS = (int) TimeUnit.HOURS.toSeconds(1);

    private final MinioClient minioClient;

    public FileStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    // ─── Upload ──────────────────────────────────────────────────────────────

    /**
     * Uploade un fichier vers le bucket MinIO spécifié.
     *
     * @param file       Fichier reçu depuis le contrôleur (multipart)
     * @param bucket     Nom du bucket (ex: {@code kyc-documents})
     * @param keyPrefix  Préfixe du chemin dans le bucket (ex: {@code kyc/42})
     * @return           La clé unique du fichier dans le bucket (ex: {@code kyc/42/uuid.jpg})
     * @throws FileStorageException en cas d'échec d'upload
     */
    public String uploadFile(MultipartFile file, String bucket, String keyPrefix) {
        ensureBucketExists(bucket);

        String extension = extractExtension(file.getOriginalFilename());
        String fileKey = keyPrefix + "/" + UUID.randomUUID() + extension;

        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(fileKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(resolveContentType(file))
                            .build()
            );
            log.info("Fichier uploadé vers MinIO : bucket={}, key={}", bucket, fileKey);
            return fileKey;
        } catch (MinioException | IOException | InvalidKeyException | NoSuchAlgorithmException e) {
            log.error("Échec de l'upload MinIO : bucket={}, key={}, erreur={}", bucket, fileKey, e.getMessage());
            throw new FileStorageException("Impossible de stocker le fichier : " + e.getMessage(), e);
        }
    }

    // ─── URL présignée ────────────────────────────────────────────────────────

    /**
     * Génère une URL présignée GET pour accéder temporairement à un fichier privé.
     *
     * @param fileKey  Clé du fichier dans le bucket
     * @param bucket   Nom du bucket
     * @return         URL HTTPS présignée valable {@value #PRESIGNED_URL_EXPIRY_SECONDS} secondes
     * @throws FileStorageException en cas d'échec
     */
    public String getPresignedUrl(String fileKey, String bucket) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(fileKey)
                            .expiry(PRESIGNED_URL_EXPIRY_SECONDS, TimeUnit.SECONDS)
                            .build()
            );
        } catch (MinioException | IOException | InvalidKeyException | NoSuchAlgorithmException e) {
            log.error("Impossible de générer l'URL présignée : bucket={}, key={}, erreur={}", bucket, fileKey, e.getMessage());
            throw new FileStorageException("Impossible de générer l'URL de téléchargement : " + e.getMessage(), e);
        }
    }

    // ─── Utilitaires internes ─────────────────────────────────────────────────

    /**
     * Crée le bucket s'il n'existe pas encore. Opération idempotente.
     */
    private void ensureBucketExists(String bucket) {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Bucket MinIO créé : {}", bucket);
            }
        } catch (MinioException | IOException | InvalidKeyException | NoSuchAlgorithmException e) {
            log.error("Impossible de vérifier/créer le bucket MinIO : bucket={}, erreur={}", bucket, e.getMessage());
            throw new FileStorageException("Impossible d'initialiser le bucket de stockage : " + e.getMessage(), e);
        }
    }

    /** Extrait l'extension d'un nom de fichier (ex: {@code ".jpg"}). Retourne {@code ""} si absent. */
    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return "." + filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    /** Résout le Content-Type du fichier. Fallback sur {@code application/octet-stream}. */
    private String resolveContentType(MultipartFile file) {
        String contentType = file.getContentType();
        return (contentType != null && !contentType.isBlank()) ? contentType : "application/octet-stream";
    }

    // ─── Exception métier ─────────────────────────────────────────────────────

    /**
     * Exception levée quand le stockage ou la lecture d'un fichier échoue.
     * Hérite de {@link RuntimeException} pour être interceptée par
     * {@link com.confiancecoursier.backend.shared.exception.GlobalExceptionHandler}.
     */
    public static class FileStorageException extends RuntimeException {
        public FileStorageException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
