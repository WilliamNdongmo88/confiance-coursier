package com.confiancecoursier.backend.dispute.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OpenDisputeRequest(

    /** Code motif : L-C1..L-C6 côté client, L-F1..L-F4 côté coursier. */
    @NotBlank(message = "Le motif est obligatoire.")
    @Pattern(regexp = "L-[CF][1-6]", message = "Code motif invalide (ex: L-C1, L-F2).")
    String motifCode,

    @NotBlank(message = "La description est obligatoire.")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caractères.")
    String description
) {}
