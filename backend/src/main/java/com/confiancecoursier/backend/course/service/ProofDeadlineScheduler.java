package com.confiancecoursier.backend.course.service;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Échéances de preuves (TICK-065b) : rappels, passage en OVERDUE, décision après le délai de grâce.
 * Toutes les 15 min par défaut ({@code app.scheduler.proof-deadline.cron}) ; ShedLock : une seule instance à la fois.
 */
@Component
public class ProofDeadlineScheduler {

    private final ProofDeadlineService proofDeadlineService;

    public ProofDeadlineScheduler(ProofDeadlineService proofDeadlineService) {
        this.proofDeadlineService = proofDeadlineService;
    }

    @Scheduled(cron = "${app.scheduler.proof-deadline.cron:0 5/15 * * * *}")
    @SchedulerLock(name = "proofDeadlines", lockAtMostFor = "PT30M", lockAtLeastFor = "PT1M")
    public void run() {
        proofDeadlineService.processDeadlines();
    }
}
