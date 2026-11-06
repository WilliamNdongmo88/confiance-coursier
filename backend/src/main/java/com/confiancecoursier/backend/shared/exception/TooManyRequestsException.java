package com.confiancecoursier.backend.shared.exception;

/** Limite de fréquence dépassée (TICK-066) → HTTP 429. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
