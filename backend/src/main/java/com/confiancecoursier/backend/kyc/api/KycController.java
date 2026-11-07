package com.confiancecoursier.backend.kyc.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.kyc.api.dto.KycStatusResponse;
import com.confiancecoursier.backend.kyc.service.KycService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.LocalDate;
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

    private static final long KYC_MAX_FILE_BYTES = 10L * 1024 * 1024;


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
     *   - firstName    : prénom
     *   - lastName     : nom de famille
     *   - birthDate    : date de naissance (YYYY-MM-DD)
     *   - nationality  : nationalité
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
            @NotBlank(message = "Le prénom est obligatoire.")
            String firstName,

            @RequestParam
            @NotBlank(message = "Le nom de famille est obligatoire.")
            String lastName,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate birthDate,

            @RequestParam(required = false)
            String nationality,

            @RequestParam
            @NotBlank(message = "Le type de document est obligatoire.")
            @Pattern(regexp = "CNI|PASSPORT", message = "Le type doit être CNI ou PASSPORT.")
            String documentType,

            @RequestParam(required = false)
            @Pattern(regexp = "^$|MTN|ORANGE", message = "Moyen de reversement invalide (MTN ou ORANGE).")
            String payoutMethod,

            @RequestParam(required = false)
            @Pattern(regexp = "^$|^[+]?[0-9 ]{8,20}$", message = "Numéro de reversement invalide.")
            String payoutNumber,

            @RequestParam MultipartFile frontFile,
            @RequestParam MultipartFile backFile,
            @RequestParam MultipartFile selfieFile,

            Principal principal
    ) {
        Long userId = resolveUserId(principal);
        String keyPrefix = "kyc/" + userId;

        // La limite multipart globale est passée à 60 Mo pour les vidéos de preuve (TICK-064) :
        // les documents KYC gardent leur limite de 10 Mo.
        for (MultipartFile f : new MultipartFile[]{frontFile, backFile, selfieFile}) {
            if (f.getSize() > KYC_MAX_FILE_BYTES) {
                throw new com.confiancecoursier.backend.shared.exception.BusinessException(
                        "Chaque document KYC doit faire 10 Mo maximum.");
            }
        }

        // Upload des 3 fichiers vers MinIO — les clés résultantes sont des UUID uniques
        String frontKey  = fileStorageService.uploadFile(frontFile,  kycBucket, keyPrefix);
        String backKey   = fileStorageService.uploadFile(backFile,   kycBucket, keyPrefix);
        String selfieKey = fileStorageService.uploadFile(selfieFile, kycBucket, keyPrefix);

        var submission = kycService.submitKyc(
                userId,
                firstName, lastName, birthDate, nationality,
                documentType,
                frontKey, backKey, selfieKey
        );

        // Coordonnées de reversement des gains (enregistrées sur le compte du coursier)
        if (payoutMethod != null && !payoutMethod.isBlank() && payoutNumber != null && !payoutNumber.isBlank()) {
            userRepository.findById(userId).ifPresent(u -> {
                u.setPayoutMethod(payoutMethod.trim());
                u.setPayoutNumber(payoutNumber.trim());
                userRepository.save(u);
            });
        }

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
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));
        return user.getId();
    }
}
