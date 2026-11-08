package com.confiancecoursier.backend.payment.api;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.course.service.ProofDeadlinePolicy;
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
    private final ProofDeadlinePolicy deadlinePolicy;

    /** SIMULATION tant qu'aucun prestataire de paiement réel n'est branché (aucun débit effectué). */
    @org.springframework.beans.factory.annotation.Value("${app.payment.mode:SIMULATION}")
    private String paymentMode;

    public CommissionPublicController(CommissionService commissionService, ProofDeadlinePolicy deadlinePolicy) {
        this.commissionService = commissionService;
        this.deadlinePolicy = deadlinePolicy;
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
                "tarifMinimumCoursier",  settings.getTarifMinimumCoursier(),
                // TICK-065b : délais affichés au client (aucune valeur codée en dur dans le front)
                "maxExtensions",         deadlinePolicy.maxExtensions(),
                "overdueGraceHours",     deadlinePolicy.graceHours(),
                // Écran de paiement : délais réels (envoi des preuves, validation automatique)
                "proofDeadlineHours",    deadlinePolicy.deadlineHours(),
                "autoValidateHours",     deadlinePolicy.autoValidateHours(),
                "paymentMode",           paymentMode
        ));
    }
}
