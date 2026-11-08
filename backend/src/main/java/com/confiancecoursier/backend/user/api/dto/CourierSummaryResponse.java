package com.confiancecoursier.backend.user.api.dto;

import com.confiancecoursier.backend.user.domain.User;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CourierSummaryResponse {

    private Long id;
    private String fullName;
    private String initials;
    private BigDecimal averageRating;
    private int completedCourses;
    /** Ville du coursier (sa zone d'intervention), null si non renseignée. */
    private String zone;
    private boolean kycVerified;
    /** TICK-089 : moyen de déplacement (A_PIED | VELO | MOTO | VOITURE | TRICYCLE), null si non renseigné. */
    private String vehicle;
    /** TICK-089 : même ville que la course consultée (« proche »). */
    private boolean sameCity;

    /** Note affichée seulement si des avis existent (trustScore > 0) ; nombre réel de courses terminées. */
    public static CourierSummaryResponse fromUser(User user, int completedCourses, boolean sameCity) {
        String name = user.getFullName() != null ? user.getFullName() : user.getEmail();
        BigDecimal score = user.getTrustScore();
        return CourierSummaryResponse.builder()
                .id(user.getId())
                .fullName(name)
                .initials(computeInitials(name))
                .averageRating(score != null && score.signum() > 0 ? score : null)
                .completedCourses(completedCourses)
                .zone(user.getCity() == null || user.getCity().isBlank() ? null : user.getCity().trim())
                .kycVerified("APPROVED".equals(user.getKycStatus()))
                .vehicle(user.getVehicle())
                .sameCity(sameCity)
                .build();
    }

    private static String computeInitials(String name) {
        if (name == null || name.isBlank()) return "??";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(2, parts.length); i++) {
            if (!parts[i].isEmpty()) sb.append(Character.toUpperCase(parts[i].charAt(0)));
        }
        return sb.isEmpty() ? "??" : sb.toString();
    }
}
