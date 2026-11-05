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
     * POST /api/admin/disputes/{id}/resolve
     *
     * Résout un litige. Body JSON : { "decision": "LIBERATION", "refundAmount": 5000 }
     * Décisions : REMBOURSEMENT_TOTAL | REMBOURSEMENT_PARTIEL | LIBERATION | SANCTION.
     * refundAmount est obligatoire pour REMBOURSEMENT_PARTIEL.
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<DisputeResponse> resolve(@PathVariable Long id,
                                                   @RequestBody ResolveDisputeRequest body) {
        Long adminId = getCurrentAdminId();
        return ResponseEntity.ok(
                disputeService.resolveDispute(id, adminId, body.decision(), body.refundAmount()));
    }

    /** DTO inline pour la résolution d'un litige. */
    public record ResolveDisputeRequest(
            String decision,
            java.math.BigDecimal refundAmount
    ) {}

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private Long getCurrentAdminId() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Administrateur non trouvé."))
                .getId();
    }
}
