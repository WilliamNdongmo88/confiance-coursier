package com.confiancecoursier.backend.admin.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Requête de {@code PUT /api/admin/payout-settings}.
 *
 * <p>Tous les champs sont optionnels : seuls les champs non nuls
 * fournis dans la requête sont persistés (upsert partiel).
 */
public record UpdatePayoutSettingsRequest(

        @Size(max = 30, message = "Numéro MTN trop long.")
        String mtnNumber,

        @Size(max = 100, message = "Nom MTN trop long.")
        String mtnName,

        @Size(max = 30, message = "Numéro Orange trop long.")
        String orangeNumber,

        @Size(max = 100, message = "Nom Orange trop long.")
        String orangeName,

        @Size(max = 50, message = "IBAN/RIB trop long.")
        String bankIban,

        @Size(max = 100, message = "Nom de banque trop long.")
        String bankName,

        @Size(max = 100, message = "Nom du titulaire trop long.")
        String bankAccountName,

        @Pattern(regexp = "MTN|ORANGE|BANK", message = "Méthode invalide (MTN, ORANGE, BANK).")
        String preferredMethod
) {}
