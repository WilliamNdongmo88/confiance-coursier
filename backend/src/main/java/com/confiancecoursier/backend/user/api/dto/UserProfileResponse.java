package com.confiancecoursier.backend.user.api.dto;

import com.confiancecoursier.backend.user.domain.User;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO renvoyé par {@code GET /api/users/me}.
 *
 * Contient toutes les informations publiques du profil de l'utilisateur connecté.
 * Le mot de passe ({@code passwordHash}) n'est jamais inclus.
 */
@Data
@Builder
public class UserProfileResponse {

    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private String role;
    private String country;
    private String city;
    private String status;
    private BigDecimal trustScore;
    private String badge;
    private String kycStatus;
    private String initials;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Construit un {@link UserProfileResponse} depuis l'entité {@link User}.
     *
     * @param user l'utilisateur authentifié
     * @return le profil sérialisable
     */
    public static UserProfileResponse fromUser(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .country(user.getCountry())
                .city(user.getCity())
                .status(user.getStatus())
                .trustScore(user.getTrustScore())
                .badge(user.getBadge())
                .kycStatus(user.getKycStatus())
                .initials(computeInitials(user))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private static String computeInitials(User user) {
        String name = user.getFullName();
        if (name == null || name.isBlank()) {
            // Fallback sur l'email (partie avant @)
            String email = user.getEmail();
            return email != null && !email.isBlank()
                    ? String.valueOf(Character.toUpperCase(email.charAt(0)))
                    : "?";
        }
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(2, parts.length); i++) {
            if (!parts[i].isEmpty()) sb.append(Character.toUpperCase(parts[i].charAt(0)));
        }
        return sb.isEmpty() ? "?" : sb.toString();
    }
}
