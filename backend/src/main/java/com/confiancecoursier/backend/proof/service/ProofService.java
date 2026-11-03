package com.confiancecoursier.backend.proof.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;
import com.confiancecoursier.backend.proof.domain.Proof;
import com.confiancecoursier.backend.proof.repository.ProofRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

/**
 * Service gérant la soumission et la lecture des preuves de livraison.
 *
 * <h3>Règles métier :</h3>
 * <ul>
 *   <li>Seul le coursier assigné à la course peut soumettre des preuves.</li>
 *   <li>La course doit être en statut {@code IN_PROGRESS} ou {@code PROOFS_SUBMITTED}.</li>
 *   <li>Maximum 10 preuves par course.</li>
 *   <li>Les doublons (même hash SHA-256) sont rejetés.</li>
 *   <li>Lors du premier appel, la course passe de {@code IN_PROGRESS} à {@code PROOFS_SUBMITTED}
 *       et {@code autoValidateAt} est fixé à +72h.</li>
 * </ul>
 */
@Service
public class ProofService {

    private static final Logger log = LoggerFactory.getLogger(ProofService.class);

    /** Nombre maximum de preuves acceptées par course. */
    private static final int MAX_PROOFS_PER_COURSE = 10;

    /** Durée avant auto-validation en heures. */
    private static final int AUTO_VALIDATE_HOURS = 72;

    /** Types de preuves valides. */
    private static final Set<String> VALID_PROOF_TYPES = Set.of("PHOTO", "VIDEO", "RECEIPT");

    private final ProofRepository proofRepository;
    private final CourseRepository courseRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;

    @Value("${minio.bucket-proofs}")
    private String proofsBucket;

    public ProofService(ProofRepository proofRepository,
                        CourseRepository courseRepository,
                        FileStorageService fileStorageService,
                        NotificationService notificationService) {
        this.proofRepository = proofRepository;
        this.courseRepository = courseRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    // ─── Soumission d'une preuve ──────────────────────────────────────────────

    /**
     * Soumet une preuve pour une course.
     *
     * @param courseId  identifiant de la course
     * @param courierId identifiant du coursier authentifié
     * @param file      fichier multipart (photo, vidéo ou reçu)
     * @param proofType type déclaré : {@code PHOTO}, {@code VIDEO} ou {@code RECEIPT}
     * @return          DTO de la preuve créée avec URL présignée (1h)
     * @throws BusinessException si les règles métier ne sont pas respectées
     */
    @Transactional
    public ProofResponse submitProof(Long courseId, Long courierId,
                                     MultipartFile file, String proofType) {

        // — Validation du type de preuve
        String normalizedType = proofType.toUpperCase();
        if (!VALID_PROOF_TYPES.contains(normalizedType)) {
            throw new BusinessException(
                    "Type de preuve invalide. Valeurs acceptées : PHOTO, VIDEO, RECEIPT.");
        }

        // — Récupération et vérifications de la course
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        if (!courierId.equals(course.getCourierId())) {
            throw new BusinessException(
                    "Vous n'êtes pas le coursier assigné à cette course.");
        }

        String status = course.getStatus();
        if (!"IN_PROGRESS".equals(status) && !"PROOFS_SUBMITTED".equals(status)) {
            throw new BusinessException(
                    "Les preuves ne peuvent être soumises que pour une course en cours (IN_PROGRESS ou PROOFS_SUBMITTED). "
                    + "Statut actuel : " + status);
        }

        // — Limite de 10 preuves
        long existing = proofRepository.countByCourseId(courseId);
        if (existing >= MAX_PROOFS_PER_COURSE) {
            throw new BusinessException(
                    "Le nombre maximum de preuves (" + MAX_PROOFS_PER_COURSE + ") est atteint pour cette course.");
        }

        // — Calcul du hash SHA-256 (anti-doublon)
        String fileHash = computeSha256(file);
        proofRepository.findByCourseIdAndFileHash(courseId, fileHash)
                .ifPresent(duplicate -> {
                    throw new BusinessException(
                            "Ce fichier a déjà été soumis pour cette course.");
                });

        // — Upload vers MinIO
        String keyPrefix = "proofs/" + courseId + "/" + courierId;
        String fileKey = fileStorageService.uploadFile(file, proofsBucket, keyPrefix);

        // — Persistance de la preuve
        Proof proof = Proof.builder()
                .courseId(courseId)
                .courierId(courierId)
                .proofType(normalizedType)
                .fileKey(fileKey)
                .fileHash(fileHash)
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .build();

        Proof saved = proofRepository.save(proof);
        log.info("Preuve soumise : courseId={}, courierId={}, type={}, key={}",
                courseId, courierId, normalizedType, fileKey);

        // — Transition de statut : IN_PROGRESS → PROOFS_SUBMITTED (au premier appel)
        if ("IN_PROGRESS".equals(course.getStatus())) {
            course.setStatus("PROOFS_SUBMITTED");
            course.setAutoValidateAt(LocalDateTime.now().plusHours(AUTO_VALIDATE_HOURS));
            courseRepository.save(course);
            log.info("Course {} passée à PROOFS_SUBMITTED, auto-validation à {}",
                    courseId, course.getAutoValidateAt());

            // Notification email au client
            notificationService.notifyProofsSubmitted(course.getClientId(), courseId);
        }

        // — Génération de l'URL présignée (1h) pour la réponse
        String presignedUrl = fileStorageService.getPresignedUrl(fileKey, proofsBucket);

        return ProofResponse.from(saved, presignedUrl);
    }

    // ─── Lecture des preuves ──────────────────────────────────────────────────

    /**
     * Retourne la liste des preuves d'une course avec leurs URLs présignées.
     *
     * <p>Accessible par le client propriétaire ET par le coursier assigné.
     *
     * @param courseId    identifiant de la course
     * @param requesterId identifiant de l'utilisateur authentifié
     * @return            liste ordonnée par date d'upload ascendante
     */
    public List<ProofResponse> getProofs(Long courseId, Long requesterId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));

        boolean isClient  = course.getClientId().equals(requesterId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(requesterId);

        if (!isClient && !isCourier) {
            throw new BusinessException("Vous n'avez pas accès aux preuves de cette course.");
        }

        return proofRepository.findByCourseIdOrderByUploadedAtAsc(courseId)
                .stream()
                .map(proof -> {
                    String url = fileStorageService.getPresignedUrl(proof.getFileKey(), proofsBucket);
                    return ProofResponse.from(proof, url);
                })
                .toList();
    }

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    /**
     * Calcule le hash SHA-256 du contenu du fichier en hexadécimal.
     *
     * @param file fichier multipart
     * @return     64 caractères hex (ex: {@code "e3b0c44298fc..."})
     * @throws BusinessException si le hash ne peut pas être calculé
     */
    private String computeSha256(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(file.getBytes());
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 est garanti présent dans tout JDK — ne devrait jamais arriver
            throw new BusinessException("Impossible de calculer le hash du fichier (algorithme indisponible).");
        } catch (IOException e) {
            throw new BusinessException("Impossible de lire le fichier pour le calcul du hash : " + e.getMessage());
        }
    }
}
