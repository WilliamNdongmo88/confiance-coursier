package com.confiancecoursier.backend.kyc.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Requête de soumission KYC.
 * Les fichiers (recto, verso, selfie) sont reçus en multipart/form-data par le contrôleur.
 * Ce DTO transporte les champs texte de la requête.
 */
public record KycSubmitRequest(

        @NotBlank(message = "Le type de document est obligatoire.")
        @Pattern(regexp = "CNI|PASSPORT", message = "Le type doit être CNI ou PASSPORT.")
        String documentType
) {}
