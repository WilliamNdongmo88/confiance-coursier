package com.confiancecoursier.backend.review.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corps de la requête {@code POST /api/courses/{courseId}/review}.
 */
public record SubmitReviewRequest(

    /** Note de 1 (très mauvais) à 5 (excellent). */
    @NotNull(message = "La note est obligatoire.")
    @Min(value = 1, message = "La note minimale est 1.")
    @Max(value = 5, message = "La note maximale est 5.")
    Integer stars,

    /** Commentaire libre (optionnel, max 1000 caractères). */
    @Size(max = 1000, message = "Le commentaire ne peut pas dépasser 1000 caractères.")
    String comment
) {}
