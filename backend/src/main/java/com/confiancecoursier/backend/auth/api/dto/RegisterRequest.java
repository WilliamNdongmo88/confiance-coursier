package com.confiancecoursier.backend.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    private String password;

    @NotBlank(message = "Le nom complet est obligatoire")
    private String fullName;

    private String phone;

    /**
     * Seuls CLIENT et COURIER sont autorisés à l'inscription publique.
     * Le rôle ADMIN ne peut jamais être obtenu par cette voie (TICK-051).
     */
    @NotBlank(message = "Le rôle est obligatoire")
    @Pattern(regexp = "(?i)\\s*(CLIENT|COURIER)\\s*", message = "Rôle invalide : seuls CLIENT ou COURIER sont autorisés")
    private String role;
}