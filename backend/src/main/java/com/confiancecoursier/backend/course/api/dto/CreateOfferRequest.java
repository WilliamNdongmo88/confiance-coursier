package com.confiancecoursier.backend.course.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateOfferRequest {

    @NotNull(message = "Le montant de l'offre est obligatoire")
    @DecimalMin(value = "0.01", message = "Le montant doit être supérieur à 0")
    private BigDecimal amount;

    @NotBlank(message = "Les détails de l'offre sont obligatoires")
    private String details;
}
