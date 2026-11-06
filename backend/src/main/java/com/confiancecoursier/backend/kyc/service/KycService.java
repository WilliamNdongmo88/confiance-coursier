package com.confiancecoursier.backend.kyc.service;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.kyc.api.dto.KycStatusResponse;
import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import com.confiancecoursier.backend.kyc.repository.KycRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
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
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;

    @Value("${minio.bucket-kyc}")
    private String kycBucket;

    public KycService(KycRepository kycRepository, UserRepository userRepository,
                      NotificationService notificationService,
                      FileStorageService fileStorageService) {
        this.kycRepository = kycRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Soumet une demande KYC pour un coursier.
     *
     * @param userId        ID du coursier
     * @param firstName     Prénom déclaré
     * @param lastName      Nom de famille déclaré
     * @param birthDate     Date de naissance (ISO : YYYY-MM-DD)
     * @param nationality   Nationalité déclarée
     * @param documentType  CNI ou PASSPORT
     * @param frontFileKey  clé du fichier recto (fournie par FileStorageService)
     * @param backFileKey   clé du fichier verso
     * @param selfieFileKey clé du selfie
     * @return la soumission créée
     */
    @Transactional
    public KycSubmission submitKyc(Long userId,
                                   String firstName, String lastName,
                                   java.time.LocalDate birthDate, String nationality,
                                   String documentType,
                                   String frontFileKey, String backFileKey, String selfieFileKey) {

        // 1. Vérifier que l'utilisateur existe et est bien un COURIER
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));

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
                .firstName(firstName)
                .lastName(lastName)
                .birthDate(birthDate)
                .nationality(nationality)
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

        // 5. Notification email
        notificationService.notifyKycSubmitted(userId);

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
                .orElseThrow(() -> new NotFoundException("Soumission KYC introuvable."));

        if (!"PENDING".equals(submission.getStatus())) {
            throw new BusinessException("Cette soumission KYC a déjà été traitée.");
        }

        submission.setStatus("APPROVED");
        submission.setReviewedBy(adminId);
        submission.setReviewedAt(LocalDateTime.now());
        kycRepository.save(submission);

        // Met à jour le statut KYC de l'utilisateur
        User user = userRepository.findById(submission.getUserId())
                .orElseThrow(() -> new NotFoundException("Utilisateur de la soumission introuvable."));
        user.setKycStatus("APPROVED");
        userRepository.save(user);

        // Notification email
        notificationService.notifyKycApproved(submission.getUserId());

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
                .orElseThrow(() -> new NotFoundException("Soumission KYC introuvable."));

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
                .orElseThrow(() -> new NotFoundException("Utilisateur de la soumission introuvable."));
        user.setKycStatus("REJECTED");
        userRepository.save(user);

        // Notification email
        notificationService.notifyKycRejected(submission.getUserId(), reason);

        return submission;
    }

    /**
     * Supprime une soumission KYC rejetée ainsi que ses fichiers MinIO.
     *
     * <p>Règles :
     * <ul>
     *   <li>La soumission doit être au statut {@code REJECTED}</li>
     *   <li>Les 3 fichiers (recto, verso, selfie) sont supprimés de MinIO (best-effort)</li>
     *   <li>La ligne {@code kyc_submissions} est supprimée de la BDD</li>
     *   <li>Si le coursier n'a plus aucune soumission KYC, son {@code kycStatus} repasse à {@code NONE}</li>
     * </ul>
     *
     * @param submissionId ID de la soumission à supprimer
     */
    @Transactional
    public void deleteRejectedKyc(Long submissionId) {
        KycSubmission submission = kycRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Soumission KYC introuvable."));

        if (!"REJECTED".equals(submission.getStatus())) {
            throw new BusinessException("Seules les soumissions KYC rejetées peuvent être supprimées.");
        }

        // 1. Supprimer les fichiers MinIO (best-effort — ne bloque pas si le fichier est déjà absent)
        fileStorageService.deleteFile(submission.getFrontFileKey(),  kycBucket);
        fileStorageService.deleteFile(submission.getBackFileKey(),   kycBucket);
        fileStorageService.deleteFile(submission.getSelfieFileKey(), kycBucket);

        // 2. Mémoriser l'userId avant suppression
        Long userId = submission.getUserId();

        // 3. Supprimer la ligne en base
        kycRepository.delete(submission);

        // 4. Si ce coursier n'a plus aucune soumission, repasser kycStatus à NONE
        userRepository.findById(userId).ifPresent(user -> {
            boolean hasOtherSubmissions = !kycRepository.findByUserId(userId).isEmpty();
            if (!hasOtherSubmissions) {
                user.setKycStatus("NONE");
                userRepository.save(user);
            }
        });
    }
}
