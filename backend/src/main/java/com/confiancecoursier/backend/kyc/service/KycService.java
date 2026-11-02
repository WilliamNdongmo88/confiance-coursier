package com.confiancecoursier.backend.kyc.service;

import com.confiancecoursier.backend.kyc.api.dto.KycStatusResponse;
import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.kyc.repository.KycRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
