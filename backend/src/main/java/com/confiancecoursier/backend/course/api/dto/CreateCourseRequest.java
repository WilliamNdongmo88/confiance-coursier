package com.confiancecoursier.backend.course.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    // Optionnel : le client peut suggérer un budget initial
    private Double suggestedBudget;
}