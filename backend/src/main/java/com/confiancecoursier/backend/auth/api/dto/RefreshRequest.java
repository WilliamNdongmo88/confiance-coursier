package com.confiancecoursier.backend.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Corps de requête pour {@code POST /api/auth/refresh} et {@code POST /api/auth/logout}.
 * Contient le refresh token à valider ou à invalider.
 */
@Data
@AllArgsConstructor
public class RefreshRequest {

    @NotBlank(message = "Le refresh token est obligatoire.")
    private String refreshToken;
}
