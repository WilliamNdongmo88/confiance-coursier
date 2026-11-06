package com.confiancecoursier.backend.admin.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.admin.api.dto.CommissionSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdateCommissionRequest;
import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur admin pour la configuration des commissions.
 *
 * <p>Toutes les routes sont sécurisées par {@code ROLE_ADMIN} dans {@code SecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET /api/admin/commissions}  — paramètres actuels</li>
 *   <li>{@code PUT /api/admin/commissions}  — mise à jour des taux + tarif minimum</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/commissions")
public class AdminCommissionController {

    private final CommissionService commissionService;
    private final UserRepository userRepository;

    public AdminCommissionController(CommissionService commissionService, UserRepository userRepository) {
        this.commissionService = commissionService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/admin/commissions
     *
     * Retourne la configuration actuelle des commissions.
     * Si aucun paramètre n'a été configuré, les valeurs par défaut sont renvoyées.
     */
    @GetMapping
    public ResponseEntity<CommissionSettingsResponse> getCommissions() {
        return ResponseEntity.ok(commissionService.getCommissionSettings());
    }

    /**
     * PUT /api/admin/commissions
     *
     * Met à jour les paramètres de commission (taux client, taux coursier, tarif minimum).
     * Les valeurs sont stockées dans {@code platform_settings}.
     */
    @PutMapping
    public ResponseEntity<CommissionSettingsResponse> updateCommissions(
            @Valid @RequestBody UpdateCommissionRequest request) {
        Long adminId = getCurrentAdminId();
        return ResponseEntity.ok(commissionService.updateCommissionSettings(request, adminId));
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private Long getCurrentAdminId() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Administrateur non trouvé."))
                .getId();
    }
}
