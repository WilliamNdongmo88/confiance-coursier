package com.confiancecoursier.backend.notify.service;

import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Service central d'envoi d'emails transactionnels via l'API REST Brevo.
 *
 * <p>Reprend la même approche que {@link com.confiancecoursier.backend.auth.service.OtpService} :
 * utilisation de {@code RestClient} avec le header {@code api-key} de Brevo.
 *
 * <h3>Événements couverts (spec fonctionnelle §10) :</h3>
 * <ul>
 *   <li>KYC soumis / validé / rejeté → Coursier</li>
 *   <li>Course assignée → Coursier</li>
 *   <li>Paiement reçu → Client + Coursier</li>
 *   <li>Preuves soumises → Client</li>
 *   <li>Course validée → Coursier</li>
 *   <li>Validation auto (72h) → Client + Coursier</li>
 *   <li>Litige ouvert → Admin + partie adverse</li>
 *   <li>Décision litige → Client + Coursier</li>
 *   <li>Signalement reçu → Admin</li>
 *   <li>Décision signalement → Utilisateur signalé</li>
 *   <li>Mauvaise note reçue → Coursier + Admin</li>
 *   <li>Suspension provisoire → Coursier + Admin</li>
 * </ul>
 *
 * <p>Tous les envois sont <strong>best-effort</strong> : une erreur Brevo est journalisée
 * mais ne bloque jamais l'opération métier déclencheuse.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestClient restClient;
    private final UserRepository userRepository;

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${app.otp.sender-email:}")
    private String senderEmail;

    @Value("${app.otp.app-name:ConfianceCoursier}")
    private String appName;

    @Value("${app.otp.email-enabled:true}")
    private boolean emailEnabled;

    public NotificationService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.restClient = RestClient.create();
    }

    // ─── Envoi générique ──────────────────────────────────────────────────────

    /**
     * Envoie un email HTML via l'API REST Brevo (best-effort).
     *
     * @param to        adresse email du destinataire
     * @param subject    sujet de l'email
     * @param htmlBody   corps HTML de l'email
     */
    public void sendEmail(String to, String subject, String htmlBody) {
        if (!emailEnabled) return;
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            log.warn("BREVO_API_KEY non configurée — envoi email désactivé.");
            return;
        }
        if (to == null || to.isBlank()) {
            log.warn("Adresse email destinataire vide — envoi annulé.");
            return;
        }

        Map<String, Object> body = Map.of(
                "sender", Map.of("email", senderEmail, "name", appName),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", htmlBody
        );

        try {
            restClient.post()
                    .uri(BREVO_API_URL)
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

            log.info("Email envoyé via Brevo à {} — sujet: {}", to, subject);

        } catch (Exception e) {
            log.error("Échec d'envoi email à {} via Brevo : {}", to, e.getMessage());
        }
    }

    // ─── Notifications KYC ───────────────────────────────────────────────────

    public void notifyKycSubmitted(Long userId) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "KYC soumis — " + appName,
                buildTemplate("Vérification d'identité en cours",
                        "Votre demande de vérification d'identité a été soumise et est en cours d'examen par notre équipe.",
                        "Vous serez notifié(e) dès qu'un administrateur aura traité votre dossier (généralement sous 24-48h)."));
    }

    public void notifyKycApproved(Long userId) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "KYC validé — " + appName,
                buildTemplate("Identité vérifiée ✓",
                        "Félicitations ! Votre vérification d'identité a été approuvée.",
                        "Vous pouvez désormais proposer vos services et accepter des missions sur la plateforme."));
    }

    public void notifyKycRejected(Long userId, String reason) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "KYC refusé — " + appName,
                buildTemplate("Vérification d'identité — action requise",
                        "Votre demande de vérification d'identité n'a pas pu être validée.",
                        "Raison : " + (reason != null ? reason : "Documents non conformes.") +
                        "<br/><br/>Vous pouvez soumettre une nouvelle demande après correction des éléments signalés."));
    }

    // ─── Notifications Course ─────────────────────────────────────────────────

    public void notifyCourseAssigned(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Nouvelle mission — " + appName,
                buildTemplate("Vous avez une nouvelle mission !",
                        "Le client a accepté votre offre pour la course #" + courseId + ".",
                        "Rendez-vous dans votre espace pour discuter des détails et commencer la mission."));
    }

    public void notifyCourierNotRetained(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Résultat de votre offre — " + appName,
                buildTemplate("Offre non retenue",
                        "Le client a choisi un autre coursier pour la course #" + courseId + ".",
                        "Ne vous découragez pas ! D'autres courses sont disponibles dans votre espace."));
    }

    public void notifyPaymentReceived(Long clientId, Long courierId, BigDecimal totalAmount) {
        String amount = formatXaf(totalAmount);
        // Client
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Paiement reçu — " + appName,
                buildTemplate("Paiement confirmé",
                        "Votre paiement de " + amount + " a bien été reçu et séquestré (escrow).",
                        "Le coursier a été notifié et peut démarrer la mission. Les fonds seront libérés après validation des preuves ou automatiquement sous 72h."));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Paiement reçu — " + appName,
                buildTemplate("Paiement séquestré",
                        "Le client a effectué le paiement de " + amount + " pour la mission.",
                        "Les fonds sont sécurisés en escrow et vous seront versés après validation de la livraison."));
    }

    public void notifyProofsSubmitted(Long clientId, Long courseId) {
        String email = resolveEmail(clientId);
        if (email != null) sendEmail(email,
                "Preuves de livraison soumises — " + appName,
                buildTemplate("Preuves de livraison disponibles",
                        "Le coursier a soumis les preuves de livraison pour la course #" + courseId + ".",
                        "Vous avez 72h pour valider ou ouvrir un litige. Passé ce délai, la course sera automatiquement validée et les fonds libérés au coursier."));
    }

    public void notifyCourseValidated(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Course validée — " + appName,
                buildTemplate("Fonds libérés",
                        "La course #" + courseId + " a été validée. Les fonds séquestrés vous ont été versés.",
                        "Merci pour votre travail ! N'oubliez pas de noter le client."));
    }

    public void notifyAutoValidation(Long clientId, Long courierId, Long courseId) {
        // Client
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Validation automatique — " + appName,
                buildTemplate("Course validée automatiquement (72h)",
                        "La course #" + courseId + " a été automatiquement validée après expiration du délai de 72h.",
                        "Les fonds ont été libérés au coursier. Si vous rencontrez un problème, vous pouvez encore ouvrir un litige."));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Validation automatique — " + appName,
                buildTemplate("Course validée automatiquement (72h)",
                        "La course #" + courseId + " a été automatiquement validée après 72h. Les fonds vous ont été versés.",
                        "Merci pour votre travail ! N'oubliez pas de noter le client."));
    }

    // ─── Échéance de preuves / non-livraison (TICK-065b) ─────────────────────

    private static final java.time.format.DateTimeFormatter DEADLINE_FMT =
            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    public void notifyProofDeadlineReminder(Long courierId, Long courseId, java.time.LocalDateTime deadline) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Rappel : preuves attendues — " + appName,
                buildTemplate("Vos preuves sont attendues",
                        "La course #" + courseId + " doit être justifiée avant le " + deadline.format(DEADLINE_FMT) + ".",
                        "Envoyez la vidéo, les photos et les reçus depuis votre espace. Passé ce délai, le client pourra annuler et être remboursé."));
    }

    public void notifyCourseOverdue(Long clientId, Long courierId, Long courseId) {
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Course en retard — " + appName,
                buildTemplate("Échéance de preuves dépassée",
                        "La course #" + courseId + " est en retard : aucune preuve n'a été soumise à temps.",
                        "Vous pouvez encore envoyer vos preuves tant que le client n'a pas choisi d'annuler. Une annulation pour non-livraison est comptée comme incident."));
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Course en retard — " + appName,
                buildTemplate("Le coursier n'a pas encore envoyé ses preuves",
                        "L'échéance de la course #" + courseId + " est dépassée. Vos fonds restent bloqués en séquestre.",
                        "Depuis le détail de la course, vous pouvez prolonger le délai, annuler et être remboursé, ou ouvrir un litige."));
    }

    public void notifyDeadlineExtended(Long courierId, Long courseId, java.time.LocalDateTime newDeadline) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Délai prolongé — " + appName,
                buildTemplate("Le client vous accorde un délai",
                        "Nouvelle échéance pour la course #" + courseId + " : " + newDeadline.format(DEADLINE_FMT) + ".",
                        "Envoyez vos preuves avant cette date."));
    }

    public void notifyNoShowRefund(Long clientId, Long courierId, Long courseId, boolean automatic) {
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Remboursement — " + appName,
                buildTemplate("Course annulée et remboursée",
                        "La course #" + courseId + " a été annulée " + (automatic ? "automatiquement " : "")
                                + "pour non-livraison.",
                        "Le remboursement est en cours vers votre moyen de paiement."));
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Course annulée — " + appName,
                buildTemplate("Course annulée pour non-livraison",
                        "La course #" + courseId + " a été annulée faute de preuves et le client a été remboursé.",
                        "Un incident de non-livraison a été enregistré. Deux incidents en 30 jours entraînent une suspension provisoire."));
    }

    public void notifyAutoDisputeNoShow(Long clientId, Long courierId, Long courseId) {
        String body = "La course #" + courseId + " est restée en retard sans décision : un litige a été ouvert automatiquement.";
        for (Long userId : new Long[]{clientId, courierId}) {
            String email = resolveEmail(userId);
            if (email != null) sendEmail(email,
                    "Litige ouvert automatiquement — " + appName,
                    buildTemplate("Un administrateur va arbitrer", body,
                            "Des preuves partielles ou des achats ont été déclarés : les fonds restent bloqués jusqu'à la décision."));
        }
        notifyAdmins("Litige automatique (non-livraison) — " + appName,
                buildTemplate("Litige automatique à arbitrer", body,
                        "Preuves déposées mais non soumises, ou frais réels engagés. Consultez les brouillons de preuves et le chat."));
    }

    // ─── Notifications Litige ─────────────────────────────────────────────────

    public void notifyDisputeOpened(Long openedById, Long courseId) {
        // Partie adverse : on notifie tous les admins
        notifyAdmins("Litige ouvert — " + appName,
                buildTemplate("Nouveau litige à arbitrer",
                        "Un litige a été ouvert sur la course #" + courseId + ".",
                        "Consultez le back-office pour examiner les preuves et l'historique du chat."));
    }

    public void notifyDisputeResolved(Long clientId, Long courierId, String decision) {
        String decisionText = switch (decision) {
            case "REMBOURSEMENT_TOTAL" -> "Remboursement total du client";
            case "REMBOURSEMENT_PARTIEL" -> "Remboursement partiel du client";
            case "LIBERATION" -> "Libération des fonds au coursier";
            default -> "Décision : " + decision;
        };
        // Client
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Décision sur votre litige — " + appName,
                buildTemplate("Litige résolu",
                        "L'administrateur a rendu sa décision concernant votre litige.",
                        "Décision : " + decisionText));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Décision sur votre litige — " + appName,
                buildTemplate("Litige résolu",
                        "L'administrateur a rendu sa décision concernant votre litige.",
                        "Décision : " + decisionText));
    }

    // ─── Notifications Signalement ──────────────────────────────────────────────

    public void notifyReportReceived(Long reporterId, Long targetId) {
        notifyAdmins("Nouveau signalement — " + appName,
                buildTemplate("Nouveau signalement à examiner",
                        "Un signalement a été soumis contre l'utilisateur #" + targetId + ".",
                        "Consultez le back-office pour examiner le signalement et prendre une décision."));
    }

    public void notifyReportDecision(Long targetId, String decision) {
        String email = resolveEmail(targetId);
        if (email != null) {
            String decisionText = switch (decision) {
                case "SUSPENSION" -> "Votre compte a été suspendu suite à un signalement.";
                case "AVERTISSEMENT" -> "Vous avez reçu un avertissement suite à un signalement.";
                default -> "Le signalement vous concernant a été classé sans suite.";
            };
            sendEmail(email,
                    "Décision sur signalement — " + appName,
                    buildTemplate("Décision de la modération", decisionText,
                            "Si vous pensez que cette décision est injustifiée, vous pouvez contacter le support."));
        }
    }

    // ─── Notifications Notation ──────────────────────────────────────────────

    public void notifyBadRating(Long courierId, int stars) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Vous avez reçu une note — " + appName,
                buildTemplate("Nouvelle note reçue",
                        "Vous avez reçu une note de " + stars + " étoile(s) sur une course récente.",
                        stars <= 2
                                ? "Attention : plusieurs mauvaises notes peuvent entraîner une suspension provisoire de votre compte."
                                : "Merci pour votre travail et continuez ainsi !"));
        // Notifier aussi les admins
        notifyAdmins("Mauvaise note reçue — " + appName,
                buildTemplate("Alerte notation",
                        "Le coursier #" + courierId + " a reçu une note de " + stars + " étoile(s).",
                        stars <= 2
                                ? "⚠ Cette note est ≤ 2⭐. Vérifiez l'historique du coursier (règle : 2 notes ≤ 2⭐ en 30j → suspension)."
                                : "Note satisfaisante, aucune action requise."));
    }

    public void notifySuspension(Long userId) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "Suspension provisoire — " + appName,
                buildTemplate("Votre compte a été suspendu",
                        "Votre compte a été suspendu provisoirement en raison de signalements ou de notes défavorables récents.",
                        "Un email de justification vous sera envoyé sous 72h. Si vous pensez qu'il s'agit d'une erreur, contactez le support."));
        notifyAdmins("Suspension automatique — " + appName,
                buildTemplate("Suspension automatique déclenchée",
                        "L'utilisateur #" + userId + " a été suspendu automatiquement.",
                        "Vérifiez l'historique des notes et signalements pour confirmer ou lever la suspension."));
    }

    // ─── Notifications Badge ─────────────────────────────────────────────────

    public void notifyBadgeObtained(Long clientId, String badge) {
        String email = resolveEmail(clientId);
        if (email != null) sendEmail(email,
                "Badge obtenu — " + appName,
                buildTemplate("Félicitations ! 🎉",
                        "Vous avez obtenu le badge : " + badge + " !",
                        "Merci d'être un client de confiance sur la plateforme."));
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    /** Résout l'email d'un utilisateur à partir de son ID. */
    private String resolveEmail(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse(null);
    }

    /** Notifie tous les utilisateurs ayant le rôle ADMIN. */
    private void notifyAdmins(String subject, String htmlBody) {
        List<User> admins = userRepository.findByRole("ADMIN");
        for (User admin : admins) {
            sendEmail(admin.getEmail(), subject, htmlBody);
        }
    }

    private String formatXaf(BigDecimal amount) {
        if (amount == null) return "—";
        return String.format("%,.0f XAF", amount);
    }

    /**
     * Construit le template HTML standard des emails transactionnels.
     * Reprend le design de l'email OTP (en-tête vert, carte blanche, etc.).
     *
     * @param title    titre affiché dans l'en-tête de la carte
     * @param message  message principal
     * @param details  message secondaire (action attendue, info complémentaire)
     * @return le HTML complet prêt à envoyer
     */
    private String buildTemplate(String title, String message, String details) {
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
                            <h2 style="margin:0 0 12px;color:#18271f;font-size:20px;">%s</h2>
                            <p style="margin:0 0 16px;color:#6d7a71;font-size:14px;line-height:1.6;">%s</p>
                            <p style="margin:0;color:#94a199;font-size:13px;line-height:1.6;">%s</p>
                          </td></tr>
                        </table>
                        <p style="margin:18px 0 0;color:#94a199;font-size:11px;">© %s — Plateforme de coursier de confiance.</p>
                      </td></tr>
                    </table>
                  </body>
                </html>
                """.formatted(appName, title, message, details, appName);
    }
}
