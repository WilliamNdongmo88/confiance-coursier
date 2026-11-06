package com.confiancecoursier.backend.proof.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Controller REST pour les preuves de livraison.
 *
 * <h3>Endpoints :</h3>
 * <ul>
 *   <li>{@code POST   /api/courses/{courseId}/proofs}           — Téléverser une preuve en brouillon (coursier assigné)</li>
 *   <li>{@code DELETE /api/courses/{courseId}/proofs/{proofId}} — Retirer un brouillon (coursier assigné, IN_PROGRESS)</li>
 *   <li>{@code POST   /api/courses/{courseId}/proofs/submit}    — Soumettre les preuves : complétude vérifiée, démarre les 72 h</li>
 *   <li>{@code GET    /api/courses/{courseId}/proofs}           — Lister les preuves (client : seulement après soumission)</li>
 * </ul>
 *
 * <p>Toutes les routes sont sous {@code /api/courses/**} et couvertes par
 * {@code anyRequest().authenticated()} dans {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/courses/{courseId}/proofs")
@Validated  // active @Pattern sur les @RequestParam
public class ProofController {

    private final ProofService proofService;
    private final UserRepository userRepository;

    public ProofController(ProofService proofService, UserRepository userRepository) {
        this.proofService = proofService;
        this.userRepository = userRepository;
    }

    /**
     * Soumet une preuve pour une course.
     *
     * <p><b>Multipart form-data requis :</b>
     * <ul>
     *   <li>{@code file}      — fichier (image, vidéo ou PDF)</li>
     *   <li>{@code proofType} — {@code PHOTO}, {@code VIDEO} ou {@code RECEIPT}</li>
     * </ul>
     *
     * @param courseId  identifiant de la course (path variable)
     * @param file      fichier multipart
     * @param proofType type déclaré (validé par {@code @Pattern})
     * @return          {@link ProofResponse} avec URL présignée MinIO (1h)
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ProofResponse> submitProof(
            @PathVariable Long courseId,
            @RequestPart("file") MultipartFile file,
            @RequestParam
            @Pattern(regexp = "(?i)PHOTO|VIDEO|RECEIPT",
                     message = "proofType doit être PHOTO, VIDEO ou RECEIPT")
            String proofType) {

        Long courierId = getCurrentUserId();
        ProofResponse response = proofService.uploadProof(courseId, courierId, file, proofType);
        return ResponseEntity.ok(response);
    }

    /** Retire une preuve encore en brouillon (TICK-064). */
    @DeleteMapping("/{proofId}")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long courseId, @PathVariable Long proofId) {
        proofService.deleteDraftProof(courseId, proofId, getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Soumission finale (TICK-064) : 1 vidéo + au moins 1 photo (+ reçus si frais réels),
     * puis course PROOFS_SUBMITTED et auto-validation à 72 h. Idempotent.
     */
    @PostMapping("/submit")
    public ResponseEntity<ProofService.SubmissionResult> submit(@PathVariable Long courseId) {
        return ResponseEntity.ok(proofService.submitProofs(courseId, getCurrentUserId()));
    }

    /**
     * Retourne la liste des preuves d'une course avec leurs URLs présignées.
     *
     * @param courseId identifiant de la course
     * @return         liste de {@link ProofResponse}
     */
    @GetMapping
    public ResponseEntity<List<ProofResponse>> getProofs(@PathVariable Long courseId) {
        Long requesterId = getCurrentUserId();
        return ResponseEntity.ok(proofService.getProofs(courseId, requesterId));
    }

    // ─── Utilitaire privé ─────────────────────────────────────────────────────

    /** Extrait l'ID de l'utilisateur courant depuis le contexte Spring Security. */
    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));
        return user.getId();
    }
}
