package com.confiancecoursier.backend.payment.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler Spring qui déclenche l'auto-validation des courses
 * dont les preuves ont été soumises depuis plus de 72 heures
 * sans que le client ait validé ou ouvert un litige.
 *
 * <p>Fréquence : toutes les heures (cron {@code 0 0 * * * *}).
 * Configurable via la propriété {@code app.scheduler.validation.cron}
 * si nécessaire en production.
 */
@Component
public class ValidationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ValidationScheduler.class);

    private final PaymentService paymentService;

    public ValidationScheduler(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Toutes les heures, à la minute 0 : auto-valide les courses dont
     * {@code auto_validate_at <= NOW()} et {@code status = PROOFS_SUBMITTED}.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void autoValidate() {
        log.info("[SCHEDULER] Déclenchement auto-validation des courses expirées…");
        int count = paymentService.autoValidateExpiredCourses();
        if (count > 0) {
            log.info("[SCHEDULER] {} course(s) auto-validée(s).", count);
        } else {
            log.debug("[SCHEDULER] Aucune course à auto-valider.");
        }
    }
}
