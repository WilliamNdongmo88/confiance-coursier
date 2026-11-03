package com.confiancecoursier.backend.kyc.service;

import com.confiancecoursier.backend.kyc.api.dto.KycStatusResponse;
import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.kyc.repository.KycRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service KYC — soumission et consultation du statut.
 *
 * Note: Le stockage réel des fichiers sera implémenté dans TICK-024 (intégration MinIO).
 * Pour l'instant, le contrôleur reçoit les fichiers et ce service stocke des clés temporaires.
 */
@Service
public class KycService {

    private final KycRepository kycRepository;
    private final UserRepository userRepository;

    public KycService(KycRepository kycRepository, UserRepository userRepository) {
        this.kycRepository = kycRepository;
        this.userRepository = userRepository;
    }

    /**
     * Soumet une demande KYC pour un coursier.
     *
     * @param userId       ID du coursier
     * @param documentType CNI ou PASSPORT
     * @param frontFileKey clé du fichier recto (fournie par FileStorageService dans TICK-024)
     * @param backFileKey  clé du fichier verso
     * @param selfieFileKey clé du selfie
     * @return la soumission créée
     */
    @Transactional
    public KycSubmission submitKyc(Long userId, String documentType,
                                   String frontFileKey, String backFileKey, String selfieFileKey) {

        // 1. Vérifier que l'utilisateur existe et est bien un COURIER
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));

        if (!"COURIER".equals(user.getRole())) {
            throw new BusinessException("Seuls les coursiers peuvent soumettre un KYC.");
        }

        // 2. Refuser si une demande PENDING ou APPROVED existe déjà
        String currentKycStatus = user.getKycStatus();
        if ("PENDING".equals(currentKycStatus)) {
            throw new BusinessException("Vous avez déjà une demande KYC en cours de traitement.");
        }
        if ("APPROVED".equals(currentKycStatus)) {
            throw new BusinessException("Votre identité est déjà vérifiée.");
        }

        // 3. Créer la soumission
        KycSubmission submission = KycSubmission.builder()
                .userId(userId)
                .documentType(documentType)
                .frontFileKey(frontFileKey)
                .backFileKey(backFileKey)
                .selfieFileKey(selfieFileKey)
                .status("PENDING")
                .build();
        kycRepository.save(submission);

        // 4. Mettre à jour le kycStatus de l'utilisateur
        user.setKycStatus("PENDING");
        userRepository.save(user);

        return submission;
    }

    /**
     * Retourne le statut KYC courant de l'utilisateur.
     */
    public KycStatusResponse getMyStatus(Long userId) {
        return kycRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(KycStatusResponse::from)
                .orElse(KycStatusResponse.none());
    }

    // ─── Méthodes d'administration ────────────────────────────────────────

    /**
     * Liste toutes les soumissions KYC par statut (usage admin).
     *
     * @param status statut filtrant : PENDING, APPROVED, REJECTED (ou null pour tout)
     * @return la liste des soumissions correspondantes
     */
    public List<KycSubmission> getAllKycByStatus(String status) {
        if (status == null || status.isBlank()) {
            return kycRepository.findAll();
        }
        return kycRepository.findByStatus(status.toUpperCase());
    }

    /**
     * Approuve une soumission KYC.
     *
     * <p>Met à jour :
     * <ul>
     *   <li>{@code kycSubmission.status = APPROVED}</li>
     *   <li>{@code kycSubmission.reviewedBy / reviewedAt}</li>
     *   <li>{@code user.kycStatus = APPROVED}</li>
     * </ul>
     *
     * @param submissionId ID de la soumission KYC
     * @param adminId      ID de l'admin qui approuve
     * @return la soumission mise à jour
     */
    @Transactional
    public KycSubmission approveKyc(Long submissionId, Long adminId) {
        KycSubmission submission = kycRepository.findById(submissionId)
                .orElseThrow(() -> new BusinessException("Soumission KYC introuvable."));

        if (!"PENDING".equals(submission.getStatus())) {
            throw new BusinessException("Cette soumission KYC a déjà été traitée.");
        }

        submission.setStatus("APPROVED");
        submission.setReviewedBy(adminId);
        submission.setReviewedAt(LocalDateTime.now());
        kycRepository.save(submission);

        // Met à jour le statut KYC de l'utilisateur
        User user = userRepository.findById(submission.getUserId())
                .orElseThrow(() -> new BusinessException("Utilisateur de la soumission introuvable."));
        user.setKycStatus("APPROVED");
        userRepository.save(user);

        return submission;
    }

    /**
     * Rejette une soumission KYC avec une raison.
     *
     * <p>Met à jour :
     * <ul>
     *   <li>{@code kycSubmission.status = REJECTED}</li>
     *   <li>{@code kycSubmission.rejectionReason / reviewedBy / reviewedAt}</li>
     *   <li>{@code user.kycStatus = REJECTED}</li>
     * </ul>
     *
     * @param submissionId ID de la soumission KYC
     * @param adminId       ID de l'admin qui rejette
     * @param reason        raison du rejet (visible par le coursier)
     * @return la soumission mise à jour
     */
    @Transactional
    public KycSubmission rejectKyc(Long submissionId, Long adminId, String reason) {
        KycSubmission submission = kycRepository.findById(submissionId)
                .orElseThrow(() -> new BusinessException("Soumission KYC introuvable."));

        if (!"PENDING".equals(submission.getStatus())) {
            throw new BusinessException("Cette soumission KYC a déjà été traitée.");
        }

        submission.setStatus("REJECTED");
        submission.setRejectionReason(reason);
        submission.setReviewedBy(adminId);
        submission.setReviewedAt(LocalDateTime.now());
        kycRepository.save(submission);

        // Met à jour le statut KYC de l'utilisateur
        User user = userRepository.findById(submission.getUserId())
                .orElseThrow(() -> new BusinessException("Utilisateur de la soumission introuvable."));
        user.setKycStatus("REJECTED");
        userRepository.save(user);

        return submission;
    }
}
