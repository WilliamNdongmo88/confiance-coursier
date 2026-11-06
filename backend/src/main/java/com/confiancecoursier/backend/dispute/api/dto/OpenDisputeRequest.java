package com.confiancecoursier.backend.dispute.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OpenDisputeRequest(

    /** Code motif : L-C1..L-C6 côté client, L-F1..L-F4 côté coursier (le rôle est vérifié par DisputeService). */
    @NotBlank(message = "Le motif est obligatoire.")
    @Pattern(regexp = "L-C[1-6]|L-F[1-4]", message = "Code motif invalide (L-C1 à L-C6, L-F1 à L-F4).")
    String motifCode,

    @NotBlank(message = "La description est obligatoire.")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caractères.")
    String description
) {}
