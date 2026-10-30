package com.confiancecoursier.backend.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OtpResponse {
    private String message;
    private boolean otpRequired;
}