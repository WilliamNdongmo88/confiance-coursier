package com.confiancecoursier.backend.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    /** OTP requis uniquement pour la connexion admin. Null/vide pour les autres rôles. */
    private String otp;
}
