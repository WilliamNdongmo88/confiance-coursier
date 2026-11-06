package com.confiancecoursier.backend.proof.service;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;
import com.confiancecoursier.backend.proof.domain.Proof;
import com.confiancecoursier.backend.proof.repository.ProofRepository;
import com.confiancecoursier.backend.proof.service.ProofFileInspector.Kind;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Preuves de livraison (TICK-064).
 *
 * <h3>Cycle de vie</h3>
 * <ol>
 *   <li><b>Brouillon</b> : tant que la course est {@code IN_PROGRESS}, le coursier assigné téléverse
 *       ses fichiers un par un ({@link #uploadProof}) et peut en retirer ({@link #deleteDraftProof}).
 *       Le client ne voit pas les brouillons. Renvoyer un fichier déjà reçu (reprise après coupure)
 *       renvoie la preuve existante au lieu d'une erreur de doublon.</li>
 *   <li><b>Soumission</b> : {@link #submitProofs} vérifie la complétude — 1 vidéo, au moins 1 photo,
 *       au moins 1 reçu si des frais réels ont été payés — puis passe la course en
 *       {@code PROOFS_SUBMITTED} et démarre les 72 h d'auto-validation.</li>
 * </ol>
 *
 * <h3>Contrôles serveur</h3>
 * Type réel du fichier (signature d'octets, pas le Content-Type déclaré), taille (vidéo 30 Mo,
 * photo/reçu 10 Mo), durée vidéo ≤ 10 s quand elle est lisible (MP4/MOV/3GP ; sinon « à vérifier »),
 * 10 fichiers maximum, 1 seule vidéo.
 */
@Service
public class ProofService {

    private static final Logger log = LoggerFactory.getLogger(ProofService.class);

    static final int  MAX_PROOFS_PER_COURSE = 10;
    static final int  AUTO_VALIDATE_HOURS   = 72;
    static final long MAX_VIDEO_BYTES       = 30L * 1024 * 1024;
    static final long MAX_IMAGE_BYTES       = 10L * 1024 * 1024;
    /** 10 s, avec une tolérance d'arrondi des encodeurs mobiles. */
    static final long MAX_VIDEO_DURATION_MS = 10_500;

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

    // ─── Téléversement d'un brouillon ─────────────────────────────────────────

    @Transactional
    public ProofResponse uploadProof(Long courseId, Long courierId, MultipartFile file, String proofType) {
        String type = proofType == null ? "" : proofType.trim().toUpperCase();
        if (!VALID_PROOF_TYPES.contains(type)) {
            throw new BusinessException("Type de preuve invalide. Valeurs acceptées : PHOTO, VIDEO, RECEIPT.");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Le fichier est vide.");
        }

        // Verrou de ligne : les envois parallèles et la soumission finale sont sérialisés
        Course course = lockCourse(courseId);
        requireAssignedCourier(course, courierId);
        requireDraftStage(course);

        byte[] content = readBytes(file);
        String fileHash = sha256(content);

        // Reprise après échec réseau : le même fichier renvoie la preuve existante (pas d'erreur de doublon)
        Optional<Proof> already = proofRepository.findByCourseIdAndFileHash(courseId, fileHash);
        if (already.isPresent()) {
            Proof existing = already.get();
            if (!existing.getProofType().equals(type)) {
                throw new BusinessException("Ce fichier a déjà été envoyé comme " + label(existing.getProofType()) + ".");
            }
            return toResponse(existing);
        }

        // Taille et type réel
        long maxBytes = "VIDEO".equals(type) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.getSize() > maxBytes) {
            throw new BusinessException("Fichier trop volumineux : " + (maxBytes / 1024 / 1024) + " Mo maximum pour "
                    + label(type) + ".");
        }
        Kind kind = ProofFileInspector.detect(content)
                .orElseThrow(() -> new BusinessException("Format de fichier non reconnu."));
        if (!accepts(type, kind)) {
            throw new BusinessException("Format non accepté pour " + label(type) + " ("
                    + kind.mimeType + "). " + acceptedFormats(type));
        }

        // Limites de nombre
        if (proofRepository.countByCourseId(courseId) >= MAX_PROOFS_PER_COURSE) {
            throw new BusinessException("Le nombre maximum de preuves (" + MAX_PROOFS_PER_COURSE + ") est atteint.");
        }
        if ("VIDEO".equals(type) && proofRepository.countByCourseIdAndProofType(courseId, "VIDEO") > 0) {
            throw new BusinessException("Une vidéo a déjà été envoyée. Supprimez-la pour en envoyer une autre.");
        }

        // Durée vidéo (lisible pour MP4/MOV/3GP)
        Long durationMs = null;
        if (kind.isVideo()) {
            durationMs = ProofFileInspector.videoDurationMillis(content).orElse(null);
            if (durationMs != null && durationMs > MAX_VIDEO_DURATION_MS) {
                throw new BusinessException("La vidéo dure " + Math.round(durationMs / 1000.0)
                        + " s : 10 secondes maximum.");
            }
        }

        String fileKey = fileStorageService.uploadFile(file, proofsBucket, "proofs/" + courseId + "/" + courierId);
        Proof saved = proofRepository.save(Proof.builder()
                .courseId(courseId)
                .courierId(courierId)
                .proofType(type)
                .fileKey(fileKey)
                .fileHash(fileHash)
                .fileSize(file.getSize())
                .mimeType(kind.mimeType)   // type détecté, pas celui déclaré par le navigateur
                .videoDurationMs(durationMs)
                .build());
        log.info("Preuve (brouillon) : courseId={} courierId={} type={} mime={} durationMs={}",
                courseId, courierId, type, kind.mimeType, durationMs);
        return toResponse(saved);
    }

    // ─── Retrait d'un brouillon ───────────────────────────────────────────────

    @Transactional
    public void deleteDraftProof(Long courseId, Long proofId, Long courierId) {
        Course course = lockCourse(courseId);
        requireAssignedCourier(course, courierId);
        requireDraftStage(course);

        Proof proof = proofRepository.findById(proofId)
                .filter(p -> p.getCourseId().equals(courseId))
                .orElseThrow(() -> new NotFoundException("Preuve introuvable."));
        proofRepository.delete(proof);
        fileStorageService.deleteFile(proof.getFileKey(), proofsBucket);
        log.info("Preuve (brouillon) supprimée : courseId={} proofId={}", courseId, proofId);
    }

    // ─── Soumission finale ────────────────────────────────────────────────────

    /**
     * Vérifie la complétude puis passe la course en PROOFS_SUBMITTED (démarre les 72 h).
     * Idempotent : un nouvel appel sur une course déjà soumise renvoie l'état courant.
     */
    @Transactional
    public SubmissionResult submitProofs(Long courseId, Long courierId) {
        Course course = lockCourse(courseId);
        requireAssignedCourier(course, courierId);

        if ("PROOFS_SUBMITTED".equals(course.getStatus())) {
            return new SubmissionResult(course.getStatus(), course.getAutoValidateAt());
        }
        requireDraftStage(course);

        long videos   = proofRepository.countByCourseIdAndProofType(courseId, "VIDEO");
        long photos   = proofRepository.countByCourseIdAndProofType(courseId, "PHOTO");
        long receipts = proofRepository.countByCourseIdAndProofType(courseId, "RECEIPT");
        boolean receiptsRequired = course.getRealCosts() != null && course.getRealCosts().compareTo(BigDecimal.ZERO) > 0;

        StringBuilder missing = new StringBuilder();
        if (videos < 1)   missing.append(" une vidéo (10 s maximum) ;");
        if (photos < 1)   missing.append(" au moins une photo ;");
        if (receiptsRequired && receipts < 1) missing.append(" au moins un reçu d'achat (frais réels déclarés) ;");
        if (!missing.isEmpty()) {
            throw new BusinessException("Preuves incomplètes. Il manque :" + missing.substring(0, missing.length() - 1) + ".");
        }

        course.setStatus("PROOFS_SUBMITTED");
        course.setAutoValidateAt(LocalDateTime.now().plusHours(AUTO_VALIDATE_HOURS));
        courseRepository.save(course);
        log.info("Course {} : preuves soumises ({} vidéo, {} photo(s), {} reçu(s)), auto-validation à {}",
                courseId, videos, photos, receipts, course.getAutoValidateAt());

        notificationService.notifyProofsSubmitted(course.getClientId(), courseId);
        return new SubmissionResult(course.getStatus(), course.getAutoValidateAt());
    }

    public record SubmissionResult(String status, LocalDateTime autoValidateAt) {}

    // ─── Lecture ──────────────────────────────────────────────────────────────

    /**
     * Preuves d'une course. Le coursier assigné voit aussi ses brouillons ;
     * le client ne voit les preuves qu'une fois soumises.
     */
    public List<ProofResponse> getProofs(Long courseId, Long requesterId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course introuvable."));

        boolean isClient  = course.getClientId().equals(requesterId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(requesterId);
        if (!isClient && !isCourier) {
            throw new ForbiddenException("Vous n'avez pas accès aux preuves de cette course.");
        }
        if (isClient && !isCourier && ("IN_PROGRESS".equals(course.getStatus()) || "OVERDUE".equals(course.getStatus()))) {
            return List.of(); // brouillons du coursier : pas encore soumis
        }
        return proofRepository.findByCourseIdOrderByUploadedAtAsc(courseId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    private Course lockCourse(Long courseId) {
        return courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new NotFoundException("Course introuvable."));
    }

    private static void requireAssignedCourier(Course course, Long courierId) {
        if (courierId == null || !courierId.equals(course.getCourierId())) {
            throw new ForbiddenException("Vous n'êtes pas le coursier assigné à cette course.");
        }
    }

    /** Brouillons modifiables en IN_PROGRESS, et en OVERDUE tant que le client n'a pas tranché (TICK-065b). */
    private static void requireDraftStage(Course course) {
        if (!"IN_PROGRESS".equals(course.getStatus()) && !"OVERDUE".equals(course.getStatus())) {
            throw new ConflictException("Les preuves ne peuvent être modifiées que pour une course payée en cours "
                    + "(statut actuel : " + course.getStatus() + ").");
        }
    }

    static boolean accepts(String type, Kind kind) {
        return switch (type) {
            case "VIDEO"   -> kind.isVideo();
            case "PHOTO"   -> kind.isImage();
            case "RECEIPT" -> kind.isImage() || kind == Kind.PDF;
            default        -> false;
        };
    }

    private static String acceptedFormats(String type) {
        return switch (type) {
            case "VIDEO"   -> "Formats acceptés : MP4, MOV, 3GP, WebM.";
            case "PHOTO"   -> "Formats acceptés : JPG, PNG, WebP, HEIC.";
            default        -> "Formats acceptés : JPG, PNG, WebP, HEIC, PDF.";
        };
    }

    private static String label(String type) {
        return switch (type) {
            case "VIDEO" -> "une vidéo";
            case "PHOTO" -> "une photo";
            default      -> "un reçu";
        };
    }

    private ProofResponse toResponse(Proof proof) {
        return ProofResponse.from(proof, fileStorageService.getPresignedUrl(proof.getFileKey(), proofsBucket));
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BusinessException("Impossible de lire le fichier : " + e.getMessage());
        }
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }
}
