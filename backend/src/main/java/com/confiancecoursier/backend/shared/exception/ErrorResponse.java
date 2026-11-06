package com.confiancecoursier.backend.shared.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private int status;
    private String message;
    private LocalDateTime timestamp;
    /** Code machine facultatif pour que le front réagisse sans analyser le message (ex. EMAIL_NOT_VERIFIED — TICK-074). */
    private String code;

    public ErrorResponse(int status, String message, LocalDateTime timestamp) {
        this(status, message, timestamp, null);
    }

    public ErrorResponse(int status, String message, LocalDateTime timestamp, String code) {
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
        this.code = code;
    }
}
