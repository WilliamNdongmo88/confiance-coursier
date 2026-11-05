package com.confiancecoursier.backend.admin.api.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Réponse de {@code GET /api/admin/payout-settings}.
 *
 * <p>Coordonnées de reversement de l'admin — stockées dans
 * {@code platform_settings} sous forme de clés-valeurs.
 *
 * <p><strong>Aucune donnée sensible n'est traitée côté serveur :
 * ces informations servent uniquement de référence visuelle à l'admin
 * pour savoir sur quel compte envoyer les fonds manuellement.</strong>
 */
@Data
@Builder
public class PayoutSettingsResponse {

    // ── MTN Mobile Money ────────────────────────────────────────────────────
    private String mtnNumber;
    private String mtnName;

    // ── Orange Money ─────────────────────────────────────────────────────────
    private String orangeNumber;
    private String orangeName;

    // ── Virement bancaire ─────────────────────────────────────────────────────
    private String bankIban;
    private String bankName;
    private String bankAccountName;

    // ── Méthode préférée ──────────────────────────────────────────────────────
    /** MTN | ORANGE | BANK — méthode à utiliser en priorité pour les reversements. */
    private String preferredMethod;
}
