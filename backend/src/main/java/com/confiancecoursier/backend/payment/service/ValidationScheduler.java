package com.confiancecoursier.backend.payment.service;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Déclenche l'auto-validation des courses dont les preuves sont soumises depuis 72 h
 * sans validation ni litige (TICK-065).
 *
 * <p>Fréquence : toutes les 15 minutes par défaut (propriété {@code app.scheduler.validation.cron}),
 * pour qu'une course soit libérée au plus tard 15 min après l'échéance.
 * ShedLock garantit une seule exécution simultanée, même avec plusieurs instances.
 */
@Component
public class ValidationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ValidationScheduler.class);

    private final AutoValidationService autoValidationService;

    public ValidationScheduler(AutoValidationService autoValidationService) {
        this.autoValidationService = autoValidationService;
    }

    @Scheduled(cron = "${app.scheduler.validation.cron:0 */15 * * * *}")
    @SchedulerLock(name = "autoValidateCourses", lockAtMostFor = "PT30M", lockAtLeastFor = "PT1M")
    public void autoValidate() {
        log.debug("[SCHEDULER] Auto-validation des courses expirées…");
        autoValidationService.autoValidateDueCourses();
    }
}
