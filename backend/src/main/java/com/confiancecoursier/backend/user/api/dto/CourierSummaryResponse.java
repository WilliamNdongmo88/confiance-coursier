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
    private String zone;
    private boolean kycVerified;

    public static CourierSummaryResponse fromUser(User user) {
        String name = user.getFullName() != null ? user.getFullName() : user.getEmail();
        String initials = computeInitials(name);
        String zone = user.getCity() != null ? user.getCity() : "Non précisée";

        return CourierSummaryResponse.builder()
                .id(user.getId())
                .fullName(name)
                .initials(initials)
                .averageRating(user.getTrustScore())
                .completedCourses(0) // sera calculé via le module review (Sprint 5)
                .zone(zone)
                .kycVerified(false)  // sera alimenté via le module KYC (Sprint 3)
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
