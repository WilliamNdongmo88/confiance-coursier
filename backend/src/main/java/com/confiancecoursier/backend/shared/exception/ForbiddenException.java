package com.confiancecoursier.backend.shared.exception;

/**
 * Accès refusé à une ressource appartenant à un autre utilisateur (IDOR, etc.).
 * <p>TICK-056 : distinguish from a generic BusinessException (400) — access denials must be 403.
 * <p>TICK-067 : utilisé pour tous les contrôles de rôle par route.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
