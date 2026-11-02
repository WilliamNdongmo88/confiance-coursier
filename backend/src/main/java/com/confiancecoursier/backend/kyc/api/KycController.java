package com.confiancecoursier.backend.kyc.api;

import com.confiancecoursier.backend.kyc.api.dto.KycStatusResponse;
import com.confiancecoursier.backend.kyc.service.KycService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;

/**
 * Contrôleur KYC — accessibilité :
 *  - POST /api/kyc/submit   → COURIER uniquement (vérifié dans KycService)
 *  - GET  /api/kyc/my-status → tout utilisateur authentifié
 *
 * Les fichiers sont uploadés vers MinIO via {@link FileStorageService}.
 */
@RestController
@RequestMapping("/api/kyc")
@Validated
public class KycController {

    private final KycService kycService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Value("${minio.bucket-kyc}")
    private String kycBucket;

    public KycController(KycService kycService,
                         UserRepository userRepository,
                         FileStorageService fileStorageService) {
        this.kycService = kycService;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    /**
     * POST /api/kyc/submit
     * Accepte : multipart/form-data avec les champs :
     *   - documentType : CNI | PASSPORT
     *   - frontFile    : fichier recto
     *   - backFile     : fichier verso
     *   - selfieFile   : selfie
     *
     * Les fichiers sont uploadés vers MinIO (bucket {@code kyc-documents}).
     * Les clés retournées par MinIO sont stockées dans {@code kyc_submissions}.
     */
    @PostMapping(value = "/submit", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> submit(
            @RequestParam
            @NotBlank(message = "Le type de document est obligatoire.")
            @Pattern(regexp = "CNI|PASSPORT", message = "Le type doit être CNI ou PASSPORT.")
            String documentType,

            @RequestParam MultipartFile frontFile,
            @RequestParam MultipartFile backFile,
            @RequestParam MultipartFile selfieFile,

            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        String keyPrefix = "kyc/" + userId;

        // Upload des 3 fichiers vers MinIO — les clés résultantes sont des UUID uniques
        String frontKey  = fileStorageService.uploadFile(frontFile,  kycBucket, keyPrefix);
        String backKey   = fileStorageService.uploadFile(backFile,   kycBucket, keyPrefix);
        String selfieKey = fileStorageService.uploadFile(selfieFile, kycBucket, keyPrefix);

        var submission = kycService.submitKyc(userId, documentType, frontKey, backKey, selfieKey);

        return ResponseEntity.ok(Map.of(
                "message", "Votre demande KYC a été soumise et est en cours d'examen.",
                "submissionId", submission.getId(),
                "status", submission.getStatus()
        ));
    }

    /**
     * GET /api/kyc/my-status
     * Retourne le statut KYC de l'utilisateur connecté.
     */
    @GetMapping("/my-status")
    public ResponseEntity<KycStatusResponse> getMyStatus(Principal principal) {
        Long userId = resolveUserId(principal);
        return ResponseEntity.ok(kycService.getMyStatus(userId));
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private Long resolveUserId(Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}
