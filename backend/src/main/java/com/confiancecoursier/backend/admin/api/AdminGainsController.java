package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.admin.api.dto.GainsStatsResponse;
import com.confiancecoursier.backend.admin.service.GainsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Historique des gains de la plateforme.
 *
 * <p>Accessible uniquement aux administrateurs ({@code ROLE_ADMIN}).
 * Sécurisé via la règle {@code /api/admin/**} dans {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/admin/gains")
public class AdminGainsController {

    private final GainsService gainsService;

    public AdminGainsController(GainsService gainsService) {
        this.gainsService = gainsService;
    }

    /**
     * GET /api/admin/gains
     * Retourne les métriques globales, l'historique mensuel
     * et le détail des 50 dernières courses complétées.
     */
    @GetMapping
    public ResponseEntity<GainsStatsResponse> getGains() {
        return ResponseEntity.ok(gainsService.getStats());
    }
}
