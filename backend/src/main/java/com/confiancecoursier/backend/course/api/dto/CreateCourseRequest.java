package com.confiancecoursier.backend.course.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateCourseRequest {

    @NotBlank(message = "La description est obligatoire")
    private String description;

    @NotBlank(message = "La zone est obligatoire")
    private String zone;

    @NotNull(message = "La date planifiée est obligatoire")
    private LocalDateTime scheduledAt;

    /** Personne à contacter sur place (facultatif). */
    @Size(max = 120, message = "Le nom du contact est trop long (120 caractères maximum)")
    private String contactName;

    @Pattern(regexp = "^$|^\\+?[0-9 ]{6,20}$", message = "Numéro de téléphone du contact invalide")
    private String contactPhone;
}