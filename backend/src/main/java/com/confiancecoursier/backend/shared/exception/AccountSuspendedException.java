package com.confiancecoursier.backend.shared.exception;

/**
 * Levée lorsqu'un compte dont le statut n'est pas {@code ACTIVE} tente d'utiliser
 * l'application (login, refresh). Mappée en HTTP 403 par {@link GlobalExceptionHandler} — TICK-053.
 */
public class AccountSuspendedException extends RuntimeException {
    public static final String DEFAULT_MESSAGE =
            "Votre compte est suspendu. Contactez le support pour plus d'informations.";

    public AccountSuspendedException() {
        super(DEFAULT_MESSAGE);
    }
}
