package com.confiancecoursier.backend.admin.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Requête de {@code PUT /api/admin/payout-settings}.
 *
 * <p>Tous les champs sont optionnels : un champ absent ne change pas, un champ vide est effacé.
 */
public record UpdatePayoutSettingsRequest(

        @Size(max = 30, message = "Numéro MTN trop long.")
        @Pattern(regexp = "^$|^[+]?[0-9 ]{8,20}$", message = "Numéro MTN invalide (chiffres, espaces et + uniquement).")
        String mtnNumber,

        @Size(max = 100, message = "Nom MTN trop long.")
        String mtnName,

        @Size(max = 30, message = "Numéro Orange trop long.")
        @Pattern(regexp = "^$|^[+]?[0-9 ]{8,20}$", message = "Numéro Orange invalide (chiffres, espaces et + uniquement).")
        String orangeNumber,

        @Size(max = 100, message = "Nom Orange trop long.")
        String orangeName,

        @Size(max = 50, message = "IBAN/RIB trop long.")
        @Pattern(regexp = "^$|^[A-Za-z0-9 ]{10,50}$", message = "IBAN/RIB invalide (lettres, chiffres et espaces uniquement).")
        String bankIban,

        @Size(max = 100, message = "Nom de banque trop long.")
        String bankName,

        @Size(max = 100, message = "Nom du titulaire trop long.")
        String bankAccountName,

        @Pattern(regexp = "^$|MTN|ORANGE|BANK", message = "Méthode invalide (MTN, ORANGE, BANK).")
        String preferredMethod
) {}
