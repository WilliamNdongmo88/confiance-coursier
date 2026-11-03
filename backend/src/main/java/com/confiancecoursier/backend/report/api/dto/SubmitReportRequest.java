package com.confiancecoursier.backend.report.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SubmitReportRequest(

    @NotBlank(message = "L'identifiant de l'utilisateur signalé est obligatoire.")
    String targetId,

    @NotBlank(message = "Le motif est obligatoire.")
    @Pattern(regexp = "harcelement|fraude|injures|faux|autre",
             message = "Motif invalide. Valeurs : harcelement, fraude, injures, faux, autre.")
    String motif,

    @NotBlank(message = "La description est obligatoire.")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caractères.")
    String description
) {}
