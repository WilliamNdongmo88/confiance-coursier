package com.confiancecoursier.backend.shared.exception;

/**
 * Ressource absente (TICK-067) → HTTP 404.
 * Sous-classe de {@link BusinessException} pour que les {@code catch} existants restent valides.
 */
public class NotFoundException extends BusinessException {
    public NotFoundException(String message) {
        super(message);
    }
}
