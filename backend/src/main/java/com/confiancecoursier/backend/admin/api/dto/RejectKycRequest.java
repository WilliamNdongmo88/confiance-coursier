package com.confiancecoursier.backend.admin.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corps de la requête {@code POST /api/admin/kyc/{id}/reject}.
 */
public record RejectKycRequest(

    @NotBlank(message = "La raison du rejet est obligatoire.")
    @Size(min = 10, max = 500, message = "La raison doit contenir entre 10 et 500 caractères.")
    String rejectionReason
) {}
