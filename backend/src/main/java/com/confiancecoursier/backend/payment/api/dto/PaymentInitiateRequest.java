package com.confiancecoursier.backend.payment.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Corps de la requête POST /api/payment/initiate (TICK-060).
 *
 * <p>Le tarif du coursier n'est PAS transmis par le client : il est lu
 * depuis {@code course.courseAmount} (fixé lors de l'acceptation de l'offre).
 * Le client ne peut pas falsifier le montant.
 */
@Data
public class PaymentInitiateRequest {

    @NotNull(message = "courseId est obligatoire")
    private Long courseId;

    /**
     * Frais réels déclarés par le client (achats avancés par le coursier).
     * 0 est autorisé (course sans achats).
     */
    @NotNull
    @DecimalMin(value = "0", inclusive = true, message = "Les frais réels ne peuvent pas être négatifs")
    private BigDecimal fraisReels;

    /** STRIPE | MTN | ORANGE */
    @NotBlank(message = "La méthode de paiement est obligatoire")
    @Pattern(regexp = "STRIPE|MTN|ORANGE", message = "Méthode de paiement invalide (STRIPE, MTN ou ORANGE)")
    private String paymentMethod;

    /**
     * Clé d'idempotence fournie par le client (UUID v4 recommandé).
     * Si la même clé est rejouée, la réponse existante est renvoyée sans double débit.
     */
    @NotBlank(message = "idempotencyKey est obligatoire")
    @Size(max = 64, message = "idempotencyKey : 64 caractères maximum")
    private String idempotencyKey;
}
