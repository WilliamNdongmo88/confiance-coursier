package com.confiancecoursier.backend.proof.api;

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
 *   <li>{@code POST /api/courses/{courseId}/proofs} — Soumettre une preuve (coursier assigné uniquement)</li>
 *   <li>{@code GET  /api/courses/{courseId}/proofs} — Lister les preuves (client propriétaire + coursier assigné)</li>
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
        ProofResponse response = proofService.submitProof(courseId, courierId, file, proofType);
        return ResponseEntity.ok(response);
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
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}
