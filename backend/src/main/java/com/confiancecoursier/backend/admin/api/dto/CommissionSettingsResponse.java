package com.confiancecoursier.backend.admin.api.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Réponse de {@code GET /api/admin/commissions}.
 *
 * <p>Expose la configuration actuelle des commissions et du tarif minimum.
 * Si aucun paramètre n'a été configuré en base, les valeurs par défaut sont renvoyées.
 */
@Data
@Builder
public class CommissionSettingsResponse {

    private BigDecimal commissionRateClient;
    private BigDecimal commissionRateCourier;
    private BigDecimal tarifMinimumCoursier;
    private String currency;

    /** Valeurs par défaut de la plateforme (spec fonctionnelle §1.1 + §9). */
    public static CommissionSettingsResponse defaults() {
        return CommissionSettingsResponse.builder()
                .commissionRateClient(BigDecimal.ZERO)
                .commissionRateCourier(new BigDecimal("20"))
                .tarifMinimumCoursier(new BigDecimal("5000"))
                .currency("XAF")
                .build();
    }
}
