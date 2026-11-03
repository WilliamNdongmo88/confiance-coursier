package com.confiancecoursier.backend.admin.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Corps de la requête {@code PUT /api/admin/commissions}.
 *
 * <p>Définit les paramètres de monétisation de la plateforme :
 * <ul>
 *   <li>{@code commissionRateClient} — pourcentage prélevé au client (défaut 0 %).</li>
 *   <li>{@code commissionRateCourier} — pourcentage prélevé au coursier (défaut 20 %).</li>
 *   <li>{@code tarifMinimumCoursier} — tarif minimum en XAF qu'un coursier peut proposer (bloquant).</li>
 * </ul>
 */
public record UpdateCommissionRequest(

    @NotNull(message = "Le taux client est obligatoire.")
    @DecimalMin(value = "0.0", message = "Le taux client ne peut pas être négatif.")
    @Max(value = 100, message = "Le taux client ne peut pas dépasser 100 %.")
    BigDecimal commissionRateClient,

    @NotNull(message = "Le taux coursier est obligatoire.")
    @DecimalMin(value = "0.0", message = "Le taux coursier ne peut pas être négatif.")
    @Max(value = 100, message = "Le taux coursier ne peut pas dépasser 100 %.")
    BigDecimal commissionRateCourier,

    @NotNull(message = "Le tarif minimum est obligatoire.")
    @DecimalMin(value = "0.0", message = "Le tarif minimum ne peut pas être négatif.")
    BigDecimal tarifMinimumCoursier
) {}
