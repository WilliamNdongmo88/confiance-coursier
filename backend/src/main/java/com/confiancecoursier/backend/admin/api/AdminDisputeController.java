package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.dispute.service.DisputeService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur admin pour la gestion des litiges.
 *
 * <p>Toutes les routes sont sécurisées par {@code ROLE_ADMIN} dans {@code SecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET  /api/admin/disputes}                  — liste des litiges (filtre {@code ?status=})</li>
 *   <li>{@code POST /api/admin/disputes/{id}/resolve}    — résoudre un litige</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/disputes")
public class AdminDisputeController {

    private final DisputeService disputeService;
    private final UserRepository userRepository;

    public AdminDisputeController(DisputeService disputeService, UserRepository userRepository) {
        this.disputeService = disputeService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/admin/disputes?status=OPEN
     *
     * Liste tous les litiges. Le paramètre {@code status} est optionnel.
     */
    @GetMapping
    public ResponseEntity<List<DisputeResponse>> listDisputes(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(disputeService.getDisputesByStatus(status));
    }

    /**
     * POST /api/admin/disputes/{id}/resolve?decision=LIBERATION
     *
     * Résout un litige. Décisions acceptées :
     * {@code REMBOURSEMENT_TOTAL}, {@code REMBOURSEMENT_PARTIEL}, {@code LIBERATION}, {@code SANCTION}.
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<DisputeResponse> resolve(@PathVariable Long id,
                                                   @RequestParam String decision) {
        Long adminId = getCurrentAdminId();
        return ResponseEntity.ok(disputeService.resolveDispute(id, adminId, decision));
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private Long getCurrentAdminId() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Administrateur non trouvé."))
                .getId();
    }
}
