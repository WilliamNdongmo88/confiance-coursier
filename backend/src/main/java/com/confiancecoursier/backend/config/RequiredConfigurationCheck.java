package com.confiancecoursier.backend.config;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Vérifie, avant la création des beans, que les variables de configuration obligatoires sont définies (TICK-068).
 * Sans elle, Spring échoue sur la première variable manquante avec un message technique ;
 * ici le démarrage s'arrête avec la liste complète et un renvoi vers {@code backend/.env.example}.
 *
 * <p>Enregistrée dans {@code BackendApplication.main} (les tests Spring ne passent pas par là).
 */
public class RequiredConfigurationCheck implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    /** Toujours obligatoires (aucune valeur par défaut dans application.properties). */
    static final List<String> ALWAYS = List.of(
            "DB_PASSWORD", "JWT_SECRET_KEY", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY",
            "BREVO_API_KEY", "BREVO_SENDER_EMAIL");

    /** Obligatoires en plus en production (pas de valeur « localhost » par défaut). */
    static final List<String> PROD_ONLY = List.of(
            "DB_URL", "DB_USERNAME", "REDIS_HOST", "MINIO_URL", "FRONTEND_URL", "CORS_ALLOWED_ORIGINS");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        check(event.getEnvironment());
    }

    static void check(ConfigurableEnvironment env) {
        boolean prod = Arrays.asList(env.getActiveProfiles()).contains("prod");
        List<String> required = new ArrayList<>(ALWAYS);
        if (prod) required.addAll(PROD_ONLY);

        List<String> missing = required.stream()
                .filter(name -> {
                    String v = env.getProperty(name);
                    return v == null || v.isBlank();
                })
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Configuration " + (prod ? "de production " : "")
                    + "incomplète — variables manquantes : " + String.join(", ", missing)
                    + ". Définissez-les dans l'environnement ou dans backend/.env (modèle : backend/.env.example).");
        }
    }
}
