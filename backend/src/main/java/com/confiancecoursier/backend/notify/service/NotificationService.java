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

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

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
                "sender", Map.of("email", senderEmail, "name", EmailLayout.BRAND),
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
                "KYC soumis — " + EmailLayout.BRAND,
                buildTemplate("Vérification d'identité en cours",
                        "Votre demande de vérification d'identité a été soumise et est en cours d'examen par notre équipe.",
                        "Vous serez notifié(e) dès qu'un administrateur aura traité votre dossier (généralement sous 24-48h)."));
    }

    public void notifyKycApproved(Long userId) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "KYC validé — " + EmailLayout.BRAND,
                buildTemplate("Identité vérifiée ✓",
                        "Félicitations ! Votre vérification d'identité a été approuvée.",
                        "Vous pouvez désormais proposer vos services et accepter des missions sur la plateforme."));
    }

    public void notifyKycRejected(Long userId, String reason) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "KYC refusé — " + EmailLayout.BRAND,
                buildTemplate("Vérification d'identité — action requise",
                        "Votre demande de vérification d'identité n'a pas pu être validée.",
                        "Raison : " + (reason != null ? reason : "Documents non conformes.") +
                        "<br/><br/>Vous pouvez soumettre une nouvelle demande après correction des éléments signalés."));
    }

    // ─── Notifications Course ─────────────────────────────────────────────────

    public void notifyCourseAssigned(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Nouvelle mission — " + EmailLayout.BRAND,
                buildTemplate("Vous avez une nouvelle mission !",
                        "Le client a accepté votre offre pour la course #" + courseId + ".",
                        "Rendez-vous dans votre espace pour discuter des détails et commencer la mission."));
    }

    /**
     * Un nouveau coursier a écrit au client sur sa course publiée (un email par coursier). Si son premier message
     * est une offre, le tarif proposé est indiqué et le bouton ouvre directement sa discussion.
     */
    public void notifyFirstReply(Long clientId, String courierName, String courseDescription, Long courseId,
                                 Long roomId, java.math.BigDecimal offerAmount) {
        String email = resolveEmail(clientId);
        if (email == null) return;
        String desc = courseDescription == null ? "" : courseDescription.strip();
        if (desc.length() > 90) desc = desc.substring(0, 87) + "…";
        desc = org.springframework.web.util.HtmlUtils.htmlEscape(desc);
        String name = org.springframework.web.util.HtmlUtils.htmlEscape(courierName);
        boolean offer = offerAmount != null && offerAmount.signum() > 0;
        String amount = offer ? xafFr(offerAmount) : null;
        String subject = offer
                ? courierName + " vous propose " + amount + " — " + EmailLayout.BRAND
                : "Un nouveau coursier vous a écrit — " + EmailLayout.BRAND;
        String lead = offer
                ? "<strong>" + name + "</strong> propose de faire votre course « " + desc + " » pour <strong>" + amount + "</strong>."
                : "<strong>" + name + "</strong> vous a écrit au sujet de votre course « " + desc + " ».";
        String detail = offer
                ? "Vous pouvez accepter son offre dans la discussion, lui poser vos questions ou comparer avec les autres coursiers. "
                  + "Votre paiement restera bloqué jusqu’à ce que vous validiez les preuves."
                : "Lisez son message, discutez du tarif et comparez avec les autres coursiers. "
                  + "Votre paiement restera bloqué jusqu’à ce que vous validiez les preuves.";
        sendEmail(email, subject,
                buildTemplate(offer ? "Nouvelle offre pour votre course" : "Un nouveau coursier vous a écrit", lead, detail,
                        offer ? "Voir son offre" : "Lire son message",
                        roomId != null ? "/chat/" + roomId : "/client/select-courier/" + courseId));
    }

    /** Montant XAF au format français (espaces fines), sans décimales. */
    private static String xafFr(java.math.BigDecimal v) {
        java.text.DecimalFormatSymbols sym = new java.text.DecimalFormatSymbols(java.util.Locale.FRANCE);
        sym.setGroupingSeparator(' ');
        return new java.text.DecimalFormat("#,##0", sym).format(v.setScale(0, java.math.RoundingMode.HALF_UP)) + " XAF";
    }

    public void notifyCourierNotRetained(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Résultat de votre offre — " + EmailLayout.BRAND,
                buildTemplate("Offre non retenue",
                        "Le client a choisi un autre coursier pour la course #" + courseId + ".",
                        "Ne vous découragez pas ! D'autres courses sont disponibles dans votre espace."));
    }

    public void notifyPaymentReceived(Long clientId, Long courierId, BigDecimal totalAmount) {
        String amount = formatXaf(totalAmount);
        // Client
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Paiement reçu — " + EmailLayout.BRAND,
                buildTemplate("Paiement confirmé",
                        "Votre paiement de " + amount + " a bien été reçu et séquestré (escrow).",
                        "Le coursier a été notifié et peut démarrer la mission. Les fonds seront libérés après validation des preuves ou automatiquement sous 72h."));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Paiement reçu — " + EmailLayout.BRAND,
                buildTemplate("Paiement séquestré",
                        "Le client a effectué le paiement de " + amount + " pour la mission.",
                        "Les fonds sont sécurisés en escrow et vous seront versés après validation de la livraison."));
    }

    public void notifyProofsSubmitted(Long clientId, Long courseId) {
        String email = resolveEmail(clientId);
        if (email != null) sendEmail(email,
                "Preuves de livraison soumises — " + EmailLayout.BRAND,
                buildTemplate("Preuves de livraison disponibles",
                        "Le coursier a soumis les preuves de livraison pour la course #" + courseId + ".",
                        "Vous avez 72h pour valider ou ouvrir un litige. Passé ce délai, la course sera automatiquement validée et les fonds libérés au coursier."));
    }

    public void notifyCourseValidated(Long courierId, Long courseId) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Course validée — " + EmailLayout.BRAND,
                buildTemplate("Fonds libérés",
                        "La course #" + courseId + " a été validée. Les fonds séquestrés vous ont été versés.",
                        "Merci pour votre travail ! N'oubliez pas de noter le client."));
    }

    public void notifyAutoValidation(Long clientId, Long courierId, Long courseId) {
        // Client
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Validation automatique — " + EmailLayout.BRAND,
                buildTemplate("Course validée automatiquement (72h)",
                        "La course #" + courseId + " a été automatiquement validée après expiration du délai de 72h.",
                        "Les fonds ont été libérés au coursier. Si vous rencontrez un problème, vous pouvez encore ouvrir un litige."));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Validation automatique — " + EmailLayout.BRAND,
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
                "Rappel : preuves attendues — " + EmailLayout.BRAND,
                buildTemplate("Vos preuves sont attendues",
                        "La course #" + courseId + " doit être justifiée avant le " + deadline.format(DEADLINE_FMT) + ".",
                        "Envoyez la vidéo, les photos et les reçus depuis votre espace. Passé ce délai, le client pourra annuler et être remboursé."));
    }

    public void notifyCourseOverdue(Long clientId, Long courierId, Long courseId) {
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Course en retard — " + EmailLayout.BRAND,
                buildTemplate("Échéance de preuves dépassée",
                        "La course #" + courseId + " est en retard : aucune preuve n'a été soumise à temps.",
                        "Vous pouvez encore envoyer vos preuves tant que le client n'a pas choisi d'annuler. Une annulation pour non-livraison est comptée comme incident."));
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Course en retard — " + EmailLayout.BRAND,
                buildTemplate("Le coursier n'a pas encore envoyé ses preuves",
                        "L'échéance de la course #" + courseId + " est dépassée. Vos fonds restent bloqués en séquestre.",
                        "Depuis le détail de la course, vous pouvez prolonger le délai, annuler et être remboursé, ou ouvrir un litige."));
    }

    public void notifyDeadlineExtended(Long courierId, Long courseId, java.time.LocalDateTime newDeadline) {
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                "Délai prolongé — " + EmailLayout.BRAND,
                buildTemplate("Le client vous accorde un délai",
                        "Nouvelle échéance pour la course #" + courseId + " : " + newDeadline.format(DEADLINE_FMT) + ".",
                        "Envoyez vos preuves avant cette date."));
    }

    public void notifyNoShowRefund(Long clientId, Long courierId, Long courseId, boolean automatic) {
        String clientEmail = resolveEmail(clientId);
        if (clientEmail != null) sendEmail(clientEmail,
                "Remboursement — " + EmailLayout.BRAND,
                buildTemplate("Course annulée et remboursée",
                        "La course #" + courseId + " a été annulée " + (automatic ? "automatiquement " : "")
                                + "pour non-livraison.",
                        "Le remboursement est en cours vers votre moyen de paiement."));
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Course annulée — " + EmailLayout.BRAND,
                buildTemplate("Course annulée pour non-livraison",
                        "La course #" + courseId + " a été annulée faute de preuves et le client a été remboursé.",
                        "Un incident de non-livraison a été enregistré. Deux incidents en 30 jours entraînent une suspension provisoire."));
    }

    public void notifyAutoDisputeNoShow(Long clientId, Long courierId, Long courseId) {
        String body = "La course #" + courseId + " est restée en retard sans décision : un litige a été ouvert automatiquement.";
        for (Long userId : new Long[]{clientId, courierId}) {
            String email = resolveEmail(userId);
            if (email != null) sendEmail(email,
                    "Litige ouvert automatiquement — " + EmailLayout.BRAND,
                    buildTemplate("Un administrateur va arbitrer", body,
                            "Des preuves partielles ou des achats ont été déclarés : les fonds restent bloqués jusqu'à la décision."));
        }
        notifyAdmins("Litige automatique (non-livraison) — " + EmailLayout.BRAND,
                buildTemplate("Litige automatique à arbitrer", body,
                        "Preuves déposées mais non soumises, ou frais réels engagés. Consultez les brouillons de preuves et le chat."));
    }

    // ─── Notifications Litige ─────────────────────────────────────────────────

    public void notifyDisputeOpened(Long openedById, Long courseId) {
        // Partie adverse : on notifie tous les admins
        notifyAdmins("Litige ouvert — " + EmailLayout.BRAND,
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
                "Décision sur votre litige — " + EmailLayout.BRAND,
                buildTemplate("Litige résolu",
                        "L'administrateur a rendu sa décision concernant votre litige.",
                        "Décision : " + decisionText));
        // Coursier
        String courierEmail = resolveEmail(courierId);
        if (courierEmail != null) sendEmail(courierEmail,
                "Décision sur votre litige — " + EmailLayout.BRAND,
                buildTemplate("Litige résolu",
                        "L'administrateur a rendu sa décision concernant votre litige.",
                        "Décision : " + decisionText));
    }

    // ─── Notifications Signalement ──────────────────────────────────────────────

    public void notifyReportReceived(Long reporterId, Long targetId) {
        notifyAdmins("Nouveau signalement — " + EmailLayout.BRAND,
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
                    "Décision sur signalement — " + EmailLayout.BRAND,
                    buildTemplate("Décision de la modération", decisionText,
                            "Si vous pensez que cette décision est injustifiée, vous pouvez contacter le support."));
        }
    }

    // ─── Notifications Notation ──────────────────────────────────────────────

    /**
     * Note reçue par un coursier. Le coursier est prévenu à chaque note ; les administrateurs seulement
     * pour une mauvaise note (≤ 2 étoiles), qui compte pour la suspension automatique.
     */
    public void notifyRatingReceived(Long courierId, int stars) {
        boolean bad = stars <= 2;
        String plural = stars > 1 ? "s" : "";
        String email = resolveEmail(courierId);
        if (email != null) sendEmail(email,
                (bad ? "Une note basse vous a été attribuée — " : "Vous avez reçu une note de " + stars + " étoile" + plural + " — ")
                        + EmailLayout.BRAND,
                buildTemplate(bad ? "Une note basse vous a été attribuée" : "Nouvelle note reçue",
                        "Un client vous a attribué <strong>" + stars + " étoile" + plural + " sur 5</strong> pour une course récente.",
                        bad ? "Plusieurs notes basses sur 30 jours peuvent entraîner une suspension provisoire de votre compte. "
                                + "Prenez connaissance du commentaire dans votre espace."
                            : "Merci pour votre travail : continuez ainsi !",
                        "Voir mon espace", "/courier/dashboard"));
        if (bad) {
            String name = org.springframework.web.util.HtmlUtils.htmlEscape(resolveName(courierId));
            notifyAdmins("Note basse : " + stars + " étoile" + plural + " pour " + resolveName(courierId) + " — " + EmailLayout.BRAND,
                    buildTemplate("Note basse attribuée à un coursier",
                            "<strong>" + name + "</strong> a reçu une note de <strong>" + stars + " étoile" + plural + " sur 5</strong>.",
                            "Vérifiez son historique : 2 notes de 2 étoiles ou moins en 30 jours entraînent une suspension automatique.",
                            "Ouvrir l’administration", "/admin/users"));
        }
    }

    private String resolveName(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getFullName() == null || u.getFullName().isBlank() ? "Coursier #" + userId : u.getFullName())
                .orElse("Coursier #" + userId);
    }

    public void notifySuspension(Long userId) {
        String email = resolveEmail(userId);
        if (email != null) sendEmail(email,
                "Suspension provisoire — " + EmailLayout.BRAND,
                buildTemplate("Votre compte a été suspendu",
                        "Votre compte a été suspendu provisoirement en raison de signalements ou de notes défavorables récents.",
                        "Un email de justification vous sera envoyé sous 72h. Si vous pensez qu'il s'agit d'une erreur, contactez le support."));
        notifyAdmins("Suspension automatique — " + EmailLayout.BRAND,
                buildTemplate("Suspension automatique déclenchée",
                        "L'utilisateur #" + userId + " a été suspendu automatiquement.",
                        "Vérifiez l'historique des notes et signalements pour confirmer ou lever la suspension."));
    }

    // ─── Notifications Badge ─────────────────────────────────────────────────

    public void notifyBadgeObtained(Long clientId, String badge) {
        String email = resolveEmail(clientId);
        if (email != null) sendEmail(email,
                "Badge obtenu — " + EmailLayout.BRAND,
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
        return buildTemplate(title, message, details, "Ouvrir mon espace", "/login");
    }

    /** Email standard : message, précision, et un bouton vers la page utile du site. */
    private String buildTemplate(String title, String message, String details, String ctaLabel, String ctaPath) {
        String site = frontendUrl.replaceAll("/+$", "");
        String body = EmailLayout.p(message) + (details == null || details.isBlank() ? "" : EmailLayout.p(details));
        return EmailLayout.render(site, title, body, ctaLabel, site + ctaPath, null);
    }
}
