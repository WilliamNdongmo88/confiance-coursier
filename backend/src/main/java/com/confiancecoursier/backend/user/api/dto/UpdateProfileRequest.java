package com.confiancecoursier.backend.user.api.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Corps de la requête {@code PUT /api/users/me}.
 *
 * Seuls les champs de profil non-sensibles sont modifiables.
 * L'email est en lecture seule (clé d'authentification).
 * Le mot de passe est géré via le flux reset-password.
 * Le rôle, le statut et le trustScore ne sont pas modifiables par l'utilisateur.
 */
@Data
public class UpdateProfileRequest {

    @Size(max = 255, message = "Le nom complet ne doit pas dépasser 255 caractères.")
    private String fullName;

    @Size(max = 20, message = "Le numéro de téléphone ne doit pas dépasser 20 caractères.")
    private String phone;

    @Size(max = 100, message = "Le pays ne doit pas dépasser 100 caractères.")
    private String country;

    @Size(max = 100, message = "La ville ne doit pas dépasser 100 caractères.")
    private String city;
}
