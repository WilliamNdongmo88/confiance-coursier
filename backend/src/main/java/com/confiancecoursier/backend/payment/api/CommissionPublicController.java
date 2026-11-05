package com.confiancecoursier.backend.payment.api;

import com.confiancecoursier.backend.admin.service.CommissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint public (tout utilisateur authentifié) exposant uniquement le taux
 * de frais client — utilisé par la page de paiement Angular.
 *
 * <p>Distinct de {@code AdminCommissionController} qui est réservé ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/commissions")
public class CommissionPublicController {

    private final CommissionService commissionService;

    public CommissionPublicController(CommissionService commissionService) {
        this.commissionService = commissionService;
    }

    /**
     * GET /api/commissions/public
     * Retourne les paramètres publics nécessaires au frontend :
     * - commissionRateClient  : frais de service client (%)
     * - commissionRateCourier : commission prélevée sur le tarif coursier (%)
     * - tarifMinimumCoursier  : montant minimum d'une offre (XAF)
     * Accessible à tous les utilisateurs authentifiés (CLIENT, COURIER, ADMIN).
     */
    @GetMapping("/public")
    public ResponseEntity<Map<String, Object>> getPublicSettings() {
        var settings = commissionService.getCommissionSettings();
        return ResponseEntity.ok(Map.of(
                "commissionRateClient",  settings.getCommissionRateClient(),
                "commissionRateCourier", settings.getCommissionRateCourier(),
                "tarifMinimumCoursier",  settings.getTarifMinimumCoursier()
        ));
    }
}
