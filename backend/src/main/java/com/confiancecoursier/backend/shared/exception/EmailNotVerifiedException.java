package com.confiancecoursier.backend.shared.exception;

/** Connexion d'un compte dont l'email n'a pas été confirmé par l'OTP d'inscription (TICK-074) → 403. */
public class EmailNotVerifiedException extends RuntimeException {
    public static final String CODE = "EMAIL_NOT_VERIFIED";

    public EmailNotVerifiedException() {
        super("Votre adresse email n'est pas encore vérifiée. Saisissez le code reçu par email ou demandez-en un nouveau.");
    }
}
