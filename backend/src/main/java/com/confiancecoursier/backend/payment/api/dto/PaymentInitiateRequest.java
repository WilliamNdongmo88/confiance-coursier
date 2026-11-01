package com.confiancecoursier.backend.payment.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentInitiateRequest {

    @NotNull(message = "courseId est obligatoire")
    private Long courseId;

    /** Tarif fixé avec le coursier dans le chat */
    @NotNull
    @DecimalMin(value = "1", message = "Le tarif coursier doit être > 0")
    private BigDecimal tarifCoursier;

    /** Frais réels déclarés par le client (achats) */
    @NotNull
    @DecimalMin(value = "0", inclusive = true, message = "Les frais réels ne peuvent pas être négatifs")
    private BigDecimal fraisReels;

    /** STRIPE | MTN | ORANGE */
    @NotBlank(message = "La méthode de paiement est obligatoire")
    private String paymentMethod;
}
