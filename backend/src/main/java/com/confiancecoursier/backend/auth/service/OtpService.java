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
    private static final SecureRandom random = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final RestClient restClient;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${app.otp.sender-email:}")
    private String senderEmail;

    @Value("${app.otp.app-name:ConfianceCoursier}")
    private String appName;

    @Value("${app.otp.email-enabled:true}")
    private boolean emailEnabled;

    @Value("${app.otp.dev-log:false}")
    private boolean devLog;

    public OtpService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.restClient = RestClient.create();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API publique
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Génère un OTP à 6 chiffres, le stocke dans Redis (TTL 5 min) et envoie
     * l'email si {@code app.otp.email-enabled=true}.
     *
     * @param email adresse du destinataire
     * @return le code OTP généré (utile pour les tests)
     */
    public String generateOtp(String email) {
        int otp = 100000 + random.nextInt(900000);
        String otpString = String.valueOf(otp);

        redisTemplate.opsForValue().set(
                "otp:" + email,
                otpString,
                Duration.ofMinutes(OTP_VALIDITY_MINUTES)
        );

        if (emailEnabled) {
            sendOtpEmail(email, otpString);
        }

        // DEV uniquement : journalise le code pour permettre la vérification manuelle.
        // Passer app.otp.dev-log=false en production.
        if (devLog) {
            log.info("OTP généré pour {} : {}", email, otpString);
        }

        return otpString;
    }

    /**
     * Valide le code OTP et le supprime de Redis dès qu'il est utilisé (usage unique).
     *
     * @param email    adresse ayant déclenché la génération
     * @param inputOtp code saisi par l'utilisateur
     * @return {@code true} si le code est correct et non expiré
     */
    public boolean validateOtp(String email, String inputOtp) {
        String storedOtp = redisTemplate.opsForValue().get("otp:" + email);
        if (storedOtp != null && storedOtp.equals(inputOtp)) {
            redisTemplate.delete("otp:" + email);
            return true;
        }
        return false;
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
                "sender", Map.of("email", senderEmail, "name", appName),
                "to", List.of(Map.of("email", to)),
                "subject", "Votre code de vérification — " + appName,
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
        return """
                <!DOCTYPE html>
                <html lang="fr">
                  <head><meta charset="UTF-8"/></head>
                  <body style="margin:0;padding:0;background:#f7f8f5;font-family:Inter,Arial,Helvetica,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                           style="background:#f7f8f5;padding:32px 12px;">
                      <tr><td align="center">
                        <table role="presentation" width="420" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border:1px solid #e2e8e2;border-radius:16px;overflow:hidden;">
                          <tr><td style="background:#123b32;padding:24px 28px;">
                            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.03em;">%s</span>
                          </td></tr>
                          <tr><td style="padding:28px;">
                            <h2 style="margin:0 0 12px;color:#18271f;font-size:20px;">Vérification de votre compte</h2>
                            <p style="margin:0 0 20px;color:#6d7a71;font-size:14px;line-height:1.5;">
                              Voici votre code à usage unique. Il est valable <strong>5 minutes</strong>.
                            </p>
                            <p style="margin:0 0 8px;text-align:center;">
                              <span style="display:inline-block;font-size:30px;font-weight:800;letter-spacing:8px;
                                           color:#123b32;background:#e4f1e8;border-radius:10px;padding:14px 20px;">%s</span>
                            </p>
                            <p style="margin:22px 0 0;color:#94a199;font-size:12px;line-height:1.5;">
                              Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                            </p>
                          </td></tr>
                        </table>
                        <p style="margin:18px 0 0;color:#94a199;font-size:11px;">© %s — Plateforme de coursier de confiance.</p>
                      </td></tr>
                    </table>
                  </body>
                </html>
                """.formatted(appName, otp, appName);
    }
}
