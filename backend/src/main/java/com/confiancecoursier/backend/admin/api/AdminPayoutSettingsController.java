package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.admin.api.dto.PayoutSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdatePayoutSettingsRequest;
import com.confiancecoursier.backend.admin.service.PayoutSettingsService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Coordonnées de reversement de l'administrateur.
 *
 * <p>Accessible uniquement aux administrateurs ({@code ROLE_ADMIN}).
 * Sécurisé via la règle {@code /api/admin/**} dans {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/admin/payout-settings")
public class AdminPayoutSettingsController {

    private final PayoutSettingsService payoutSettingsService;
    private final UserRepository        userRepository;

    public AdminPayoutSettingsController(PayoutSettingsService payoutSettingsService,
                                         UserRepository userRepository) {
        this.payoutSettingsService = payoutSettingsService;
        this.userRepository        = userRepository;
    }

    /**
     * GET /api/admin/payout-settings
     * Retourne les coordonnées de reversement actuellement configurées.
     */
    @GetMapping
    public ResponseEntity<PayoutSettingsResponse> getSettings() {
        return ResponseEntity.ok(payoutSettingsService.getSettings());
    }

    /**
     * PUT /api/admin/payout-settings
     * Met à jour (ou crée) les coordonnées de reversement.
     */
    @PutMapping
    public ResponseEntity<PayoutSettingsResponse> updateSettings(
            @Valid @RequestBody UpdatePayoutSettingsRequest request) {
        Long adminId = getCurrentUserId();
        return ResponseEntity.ok(payoutSettingsService.updateSettings(request, adminId));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}
