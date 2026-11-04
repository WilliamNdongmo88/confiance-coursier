package com.confiancecoursier.backend.shared.util;

import io.minio.*;
import io.minio.errors.*;
import io.minio.http.Method;import org.slf4j.Logger;
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

        String originalName = sanitizeFilename(file.getOriginalFilename());
        // Format : <prefix>/<uuid>_<nom-original>
        // Le UUID garantit l'unicité même si deux fichiers ont le même nom.
        String fileKey = keyPrefix + "/" + UUID.randomUUID() + "_" + originalName;

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

    // ─── Suppression ─────────────────────────────────────────────────────────

    /**
     * Supprime un fichier du bucket MinIO.
     * Opération best-effort : si la clé est nulle/vide ou si le fichier n'existe pas,
     * on loggue un avertissement sans lever d'exception.
     *
     * @param fileKey  Clé du fichier dans le bucket (ex: {@code kyc/42/uuid.jpg})
     * @param bucket   Nom du bucket
     */
    public void deleteFile(String fileKey, String bucket) {
        if (fileKey == null || fileKey.isBlank()) {
            log.warn("deleteFile ignoré : fileKey vide (bucket={})", bucket);
            return;
        }
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(fileKey)
                            .build()
            );
            log.info("Fichier supprimé de MinIO : bucket={}, key={}", bucket, fileKey);
        } catch (MinioException | IOException | InvalidKeyException | NoSuchAlgorithmException e) {
            // On loggue mais on ne bloque pas — l'objet est peut-être déjà absent
            log.warn("Impossible de supprimer le fichier MinIO : bucket={}, key={}, erreur={}", bucket, fileKey, e.getMessage());
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

    /**
     * Nettoie un nom de fichier pour un stockage sûr :
     * <ul>
     *   <li>Remplace les espaces et caractères spéciaux par {@code _}</li>
     *   <li>Supprime les séquences de traversée de chemin ({@code ../})</li>
     *   <li>Limite à 100 caractères</li>
     *   <li>Fallback sur {@code "fichier"} si le nom est vide après nettoyage</li>
     * </ul>
     */
    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "fichier";
        }
        // Garder seulement le nom de base (pas de chemin)
        String name = filename.replaceAll(".*/", "").replaceAll(".*\\\\", "");
        // Remplacer les caractères non alphanumériques (sauf . - _) par _
        name = name.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        // Supprimer les points en début de nom (fichiers cachés Unix)
        name = name.replaceAll("^\\.+", "");
        // Limiter la longueur
        if (name.length() > 100) {
            String ext = extractExtension(name);
            name = name.substring(0, 100 - ext.length()) + ext;
        }
        return name.isBlank() ? "fichier" : name;
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
