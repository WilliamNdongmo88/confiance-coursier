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
                "sender",      Map.of("email", senderEmail, "name", com.confiancecoursier.backend.notify.service.EmailLayout.BRAND),
                "to",          List.of(Map.of("email", to)),
                "subject",     "Réinitialisation de votre mot de passe — " + com.confiancecoursier.backend.notify.service.EmailLayout.BRAND,
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
        String safe = org.springframework.web.util.HtmlUtils.htmlEscape(name == null ? "" : name);
        String body = com.confiancecoursier.backend.notify.service.EmailLayout.p("Bonjour <strong>" + safe + "</strong>,")
                + com.confiancecoursier.backend.notify.service.EmailLayout.p(
                "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable <strong>15 minutes</strong>.");
        return com.confiancecoursier.backend.notify.service.EmailLayout.render(frontendUrl, "Réinitialisation du mot de passe",
                body, "Choisir un nouveau mot de passe", resetLink,
                "Si vous n’avez pas demandé cette réinitialisation, ignorez cet email : votre mot de passe ne sera pas modifié.");
    }
}
