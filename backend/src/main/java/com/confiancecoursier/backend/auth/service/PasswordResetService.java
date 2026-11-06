package com.confiancecoursier.backend.auth.service;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gère le flux "mot de passe oublié" :
 * <ol>
 *   <li>Génère un token sécurisé (UUID), le stocke en Redis (TTL 15 min)</li>
 *   <li>Envoie un email avec le lien de réinitialisation via l'API REST Brevo</li>
 *   <li>Valide le token et met à jour le mot de passe</li>
 * </ol>
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Duration TOKEN_TTL = Duration.ofMinutes(15);
    private static final String KEY_PREFIX  = "pwd-reset:";

    private final StringRedisTemplate redisTemplate;
    private final UserRepository      userRepository;
    private final PasswordEncoder     passwordEncoder;
    private final RestClient          restClient;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${app.otp.sender-email:}")
    private String senderEmail;

    @Value("${app.otp.app-name:ConfianceCoursier}")
    private String appName;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    public PasswordResetService(StringRedisTemplate redisTemplate,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.redisTemplate  = redisTemplate;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.restClient     = RestClient.create();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API publique
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Démarre le flux de réinitialisation.
     * Silencieux si l'email est inconnu (évite l'énumération de comptes).
     */
    public void initiateReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            redisTemplate.opsForValue().set(KEY_PREFIX + token, email, TOKEN_TTL);
            sendResetEmail(email, user.getFullName(), token);
        });
    }

    /**
     * Valide le token et met à jour le mot de passe.
     *
     * @throws BusinessException si le token est invalide ou expiré
     */
    public void resetPassword(String token, String newPassword) {
        String email = redisTemplate.opsForValue().get(KEY_PREFIX + token);
        if (email == null) {
            throw new BusinessException("Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalide le token immédiatement après utilisation (usage unique)
        redisTemplate.delete(KEY_PREFIX + token);

        log.info("Mot de passe réinitialisé pour {}", email);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Envoi email via Brevo REST API
    // ─────────────────────────────────────────────────────────────────────────

    private void sendResetEmail(String to, String fullName, String token) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            // TICK-068 : le jeton n'est jamais journalisé (il permet de changer le mot de passe)
            log.warn("BREVO_API_KEY non configurée — email de réinitialisation non envoyé à {}.", to);
            return;
        }

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        String displayName = (fullName != null && !fullName.isBlank()) ? fullName : to;

        Map<String, Object> body = Map.of(
                "sender",      Map.of("email", senderEmail, "name", appName),
                "to",          List.of(Map.of("email", to)),
                "subject",     "Réinitialisation de votre mot de passe — " + appName,
                "htmlContent", buildEmailTemplate(displayName, resetLink)
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
                        log.error("Brevo erreur {} — {}",
                                resp.getStatusCode(),
                                new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
                    })
                    .toBodilessEntity();

            log.info("Email reset envoyé à {}", to);
        } catch (Exception e) {
            log.error("Échec d'envoi email reset à {} : {}", to, e.getMessage());
        }
    }

    private String buildEmailTemplate(String name, String resetLink) {
        return """
                <!DOCTYPE html>
                <html lang="fr">
                  <head><meta charset="UTF-8"/></head>
                  <body style="margin:0;padding:0;background:#f7f8f5;font-family:Inter,Arial,Helvetica,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                           style="background:#f7f8f5;padding:32px 12px;">
                      <tr><td align="center">
                        <table role="presentation" width="440" cellpadding="0" cellspacing="0"
                               style="background:#ffffff;border:1px solid #e2e8e2;border-radius:16px;overflow:hidden;">
                          <tr><td style="background:#123b32;padding:24px 28px;">
                            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.03em;">%s</span>
                          </td></tr>
                          <tr><td style="padding:28px;">
                            <h2 style="margin:0 0 8px;color:#18271f;font-size:20px;">Réinitialisation du mot de passe</h2>
                            <p style="margin:0 0 8px;color:#6d7a71;font-size:14px;line-height:1.5;">
                              Bonjour <strong>%s</strong>,
                            </p>
                            <p style="margin:0 0 24px;color:#6d7a71;font-size:14px;line-height:1.5;">
                              Vous avez demandé à réinitialiser votre mot de passe.
                              Cliquez sur le bouton ci-dessous — ce lien est valable <strong>15 minutes</strong>.
                            </p>
                            <p style="text-align:center;margin:0 0 24px;">
                              <a href="%s"
                                 style="display:inline-block;padding:14px 28px;background:#123b32;color:#ffffff;
                                        font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">
                                Réinitialiser mon mot de passe
                              </a>
                            </p>
                            <p style="margin:0 0 8px;color:#94a199;font-size:12px;line-height:1.5;">
                              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                            </p>
                            <p style="margin:0 0 16px;word-break:break-all;">
                              <a href="%s" style="color:#123b32;font-size:12px;">%s</a>
                            </p>
                            <p style="margin:0;color:#94a199;font-size:12px;line-height:1.5;">
                              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                              Votre mot de passe ne sera pas modifié.
                            </p>
                          </td></tr>
                        </table>
                        <p style="margin:18px 0 0;color:#94a199;font-size:11px;">© %s — Plateforme de coursier de confiance.</p>
                      </td></tr>
                    </table>
                  </body>
                </html>
                """.formatted(appName, name, resetLink, resetLink, resetLink, appName);
    }
}
