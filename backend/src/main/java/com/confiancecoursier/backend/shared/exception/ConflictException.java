package com.confiancecoursier.backend.shared.exception;

/**
 * Exception métier levée quand une opération est impossible en raison de l'état
 * actuel de la ressource (ex : course déjà payée, double paiement).
 * Mappe vers HTTP 409 Conflict.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
