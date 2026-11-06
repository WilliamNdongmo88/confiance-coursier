package com.confiancecoursier.backend.admin.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.admin.api.dto.AdminKycResponse;
import com.confiancecoursier.backend.admin.api.dto.RejectKycRequest;
import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.kyc.service.KycService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur admin pour la gestion des KYC.
 *
 * <p>Toutes les routes sont sécurisées par {@code ROLE_ADMIN} dans {@code SecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET  /api/admin/kyc}                 — liste des soumissions (filtre optionnel {@code ?status=})</li>
 *   <li>{@code POST /api/admin/kyc/{id}/approve}   — approuver un KYC</li>
 *   <li>{@code POST /api/admin/kyc/{id}/reject}    — rejeter un KYC avec raison</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/kyc")
public class AdminKycController {

    private final KycService kycService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Value("${minio.bucket-kyc}")
    private String kycBucket;

    public AdminKycController(KycService kycService,
                              UserRepository userRepository,
                              FileStorageService fileStorageService) {
        this.kycService = kycService;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    /**
     * GET /api/admin/kyc?status=PENDING
     *
     * Liste toutes les soumissions KYC. Le paramètre {@code status} est optionnel.
     */
    @GetMapping
    public ResponseEntity<List<AdminKycResponse>> listKyc(
            @RequestParam(required = false) String status) {

        List<KycSubmission> submissions = kycService.getAllKycByStatus(status);

        List<AdminKycResponse> response = submissions.stream()
                .map(sub -> {
                    User user = userRepository.findById(sub.getUserId()).orElse(null);
                    String frontUrl  = presignedUrl(sub.getFrontFileKey());
                    String backUrl   = presignedUrl(sub.getBackFileKey());
                    String selfieUrl = presignedUrl(sub.getSelfieFileKey());
                    return AdminKycResponse.of(sub, user, frontUrl, backUrl, selfieUrl);
                })
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/admin/kyc/{id}/approve
     *
     * Approuve une soumission KYC. Le coursier passe en {@code kycStatus = APPROVED}.
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<AdminKycResponse> approve(@PathVariable Long id) {
        Long adminId = getCurrentAdminId();
        KycSubmission submission = kycService.approveKyc(id, adminId);
        User user = userRepository.findById(submission.getUserId()).orElse(null);
        return ResponseEntity.ok(AdminKycResponse.of(submission, user, null, null, null));
    }

    /**
     * POST /api/admin/kyc/{id}/reject
     *
     * Rejette une soumission KYC avec une raison. Le coursier passe en {@code kycStatus = REJECTED}.
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<AdminKycResponse> reject(@PathVariable Long id,
                                                   @Valid @RequestBody RejectKycRequest request) {
        Long adminId = getCurrentAdminId();
        KycSubmission submission = kycService.rejectKyc(id, adminId, request.rejectionReason());
        User user = userRepository.findById(submission.getUserId()).orElse(null);
        return ResponseEntity.ok(AdminKycResponse.of(submission, user, null, null, null));
    }

    /**
     * DELETE /api/admin/kyc/{id}
     *
     * Supprime une soumission KYC rejetée et ses fichiers MinIO.
     * Seules les soumissions au statut {@code REJECTED} peuvent être supprimées.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kycService.deleteRejectedKyc(id);
        return ResponseEntity.noContent().build(); // 204
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private String presignedUrl(String fileKey) {
        if (fileKey == null || fileKey.isBlank()) return null;
        try {
            return fileStorageService.getPresignedUrl(fileKey, kycBucket);
        } catch (Exception e) {
            // Ne pas bloquer le listing si une URL échoue
            return null;
        }
    }

    private Long getCurrentAdminId() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Administrateur non trouvé."))
                .getId();
    }
}
