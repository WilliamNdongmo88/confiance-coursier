package com.confiancecoursier.backend.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Gère la génération, la validation et l'envoi des codes OTP par email.
 * <p>
 * L'envoi utilise l'API REST Brevo ({@code POST /v3/smtp/email}) avec la clé API
 * positionnée dans le header {@code api-key}. Cette approche évite les problèmes
 * d'authentification SMTP (le SMTP Brevo exige l'email de connexion du compte
 * comme username, distinct de l'email expéditeur).
 */
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final long OTP_VALIDITY_MINUTES = 5;
    private static final String OTP_PREFIX         = "otp:";
    private static final String ATTEMPTS_PREFIX    = "otp:attempts:";
    private static final String RATE_MINUTE_PREFIX = "otp:rl:min:";
    private static final String RATE_HOUR_PREFIX   = "otp:rl:hour:";
    private static final SecureRandom random = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final RestClient restClient;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${app.otp.sender-email:}")
    private String senderEmail;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${app.otp.app-name:ConfianceCoursier}")
    private String appName;

    @Value("${app.otp.email-enabled:true}")
    private boolean emailEnabled;

    @Value("${app.otp.dev-log:false}")
    private boolean devLog;

    /** TICK-066 : essais faux tolérés avant invalidation du code. */
    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts = 5;

    /** TICK-066 : envois maximum par heure, par email et par IP (plus 1 par minute). */
    @Value("${app.otp.max-sends-per-hour:5}")
    private int maxSendsPerHour = 5;

    public OtpService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.restClient = RestClient.create();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API publique
    // ─────────────────────────────────────────────────────────────────────────

    /** Génère et envoie un OTP (quota par email uniquement — ex. inscription). */
    public String generateOtp(String email) {
        return generateOtp(email, null);
    }

    /**
     * Génère un OTP à 6 chiffres (TTL 5 min), remet le compteur d'essais à zéro et envoie l'email.
     * Le quota d'envoi est consommé : 1 par minute et {@code maxSendsPerHour} par heure, par email et par IP.
     *
     * @throws com.confiancecoursier.backend.shared.exception.TooManyRequestsException si un quota est atteint
     */
    public String generateOtp(String email, String ip) {
        consumeSendQuota(email, ip);
        return issueOtp(email);
    }

    /** Génère et envoie un OTP sans consommer de quota (le quota a été consommé en amont). */
    public String issueOtp(String email) {
        String otpString = String.valueOf(100000 + random.nextInt(900000));
        String key = normalize(email);
        redisTemplate.opsForValue().set(OTP_PREFIX + key, otpString, Duration.ofMinutes(OTP_VALIDITY_MINUTES));
        redisTemplate.delete(ATTEMPTS_PREFIX + key);

        if (emailEnabled) {
            sendOtpEmail(email, otpString);
        }
        // DEV uniquement : journalise le code (app.otp.dev-log=false en production).
        if (devLog) {
            log.info("OTP généré pour {} : {}", email, otpString);
        }
        return otpString;
    }

    /**
     * Consomme le quota d'envoi (TICK-066). À appeler AVANT de savoir si le compte existe
     * (ex. renvoi d'OTP), pour qu'un 429 ne révèle pas l'existence d'un compte.
     */
    public void consumeSendQuota(String email, String ip) {
        consume("email:" + normalize(email), "cette adresse");
        if (ip != null && !ip.isBlank() && !isLoopback(ip)) {
            consume("ip:" + ip, "cet appareil");
        }
    }

    /**
     * Valide le code (usage unique). Au-delà de {@code maxAttempts} essais faux, le code est invalidé
     * et l'utilisateur doit en demander un nouveau.
     *
     * @return {@code true} si le code est correct et non expiré
     * @throws com.confiancecoursier.backend.shared.exception.TooManyRequestsException si les essais sont épuisés
     */
    public boolean validateOtp(String email, String inputOtp) {
        String key = normalize(email);
        String stored = redisTemplate.opsForValue().get(OTP_PREFIX + key);
        if (stored == null) {
            return false; // expiré, déjà utilisé ou invalidé
        }
        if (stored.equals(inputOtp)) {
            redisTemplate.delete(OTP_PREFIX + key);
            redisTemplate.delete(ATTEMPTS_PREFIX + key);
            return true;
        }
        Long attempts = redisTemplate.opsForValue().increment(ATTEMPTS_PREFIX + key);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(ATTEMPTS_PREFIX + key, Duration.ofMinutes(OTP_VALIDITY_MINUTES));
        }
        if (attempts != null && attempts >= maxAttempts) {
            redisTemplate.delete(OTP_PREFIX + key);
            redisTemplate.delete(ATTEMPTS_PREFIX + key);
            log.warn("[OTP] {} essais faux pour {} : code invalidé", attempts, email);
            throw new com.confiancecoursier.backend.shared.exception.TooManyRequestsException(
                    "Trop d'essais : ce code est invalidé. Demandez un nouveau code.");
        }
        return false;
    }

    private void consume(String subject, String label) {
        if (Boolean.FALSE.equals(redisTemplate.opsForValue()
                .setIfAbsent(RATE_MINUTE_PREFIX + subject, "1", Duration.ofMinutes(1)))) {
            throw new com.confiancecoursier.backend.shared.exception.TooManyRequestsException(
                    "Un code vient d'être envoyé à " + label + ". Patientez une minute avant d'en demander un autre.");
        }
        Long count = redisTemplate.opsForValue().increment(RATE_HOUR_PREFIX + subject);
        if (count != null && count == 1) {
            redisTemplate.expire(RATE_HOUR_PREFIX + subject, Duration.ofHours(1));
        }
        if (count != null && count > maxSendsPerHour) {
            throw new com.confiancecoursier.backend.shared.exception.TooManyRequestsException(
                    "Trop de codes demandés pour " + label + ". Réessayez dans une heure.");
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    /**
     * Le proxy de dev (ng serve) et un reverse proxy local présentent tous les clients en 127.0.0.1 :
     * limiter cette adresse bloquerait tout le monde. En production derrière un proxy, activer
     * {@code app.security.trust-forwarded-for} pour obtenir la vraie IP.
     */
    private static boolean isLoopback(String ip) {
        return ip.equals("127.0.0.1") || ip.equals("::1") || ip.equals("0:0:0:0:0:0:0:1");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Envoi REST Brevo (best-effort — une erreur d'envoi ne bloque pas l'OTP)
    // ─────────────────────────────────────────────────────────────────────────

    private void sendOtpEmail(String to, String otp) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            log.warn("BREVO_API_KEY non configurée — envoi email désactivé. "
                    + "Positionnez la clé dans backend/.env pour activer l'envoi réel.");
            return;
        }

        // Corps JSON de l'email transactionnel Brevo
        Map<String, Object> body = Map.of(
                "sender", Map.of("email", senderEmail, "name", com.confiancecoursier.backend.notify.service.EmailLayout.BRAND),
                "to", List.of(Map.of("email", to)),
                "subject", "Votre code de vérification — " + com.confiancecoursier.backend.notify.service.EmailLayout.BRAND,
                "htmlContent", buildHtmlTemplate(otp)
        );

        try {
            restClient.post()
                    .uri("https://api.brevo.com/v3/smtp/email")
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        byte[] bytes = resp.getBody().readAllBytes();
                        String respBody = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                        log.error("Brevo API erreur {} — {}", resp.getStatusCode(), respBody);
                    })
                    .toBodilessEntity();

            log.info("Email OTP envoyé via Brevo API à {}", to);

        } catch (Exception e) {
            log.error("Échec d'envoi de l'email OTP à {} via Brevo API : {}", to, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Template HTML
    // ─────────────────────────────────────────────────────────────────────────

    private String buildHtmlTemplate(String otp) {
        String site = frontendUrl.replaceAll("/+$", "");
        String body = com.confiancecoursier.backend.notify.service.EmailLayout.p(
                "Voici votre code à usage unique. Il est valable <strong>5 minutes</strong>.")
                + "<p style=\"margin:16px 0 4px;text-align:center;\"><span style=\"display:inline-block;font-size:30px;"
                + "font-weight:800;letter-spacing:8px;color:#123b32;background:#e4f1e8;border-radius:10px;padding:14px 20px;\">"
                + otp + "</span></p>";
        return com.confiancecoursier.backend.notify.service.EmailLayout.render(site, "Vérification de votre compte", body,
                null, null, "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.");
    }
}
