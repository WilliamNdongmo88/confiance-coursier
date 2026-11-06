package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.admin.service.CommissionService;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Paramètres de l'échéance de preuves (TICK-065b), lus dans {@code platform_settings}
 * avec les valeurs par défaut du plan (§3.1 bis). Une valeur nulle ou invalide retombe sur le défaut.
 */
@Component
public class ProofDeadlinePolicy {

    public static final int DEFAULT_DEADLINE_HOURS = 24;
    public static final int DEFAULT_REMINDER_HOURS_BEFORE = 6;
    public static final int DEFAULT_GRACE_HOURS = 48;
    public static final int DEFAULT_MAX_EXTENSIONS = 2;
    /** Durées de prolongation proposées au client. */
    public static final java.util.Set<Integer> ALLOWED_EXTENSION_HOURS = java.util.Set.of(12, 24);

    private final CommissionService settings;

    public ProofDeadlinePolicy(CommissionService settings) {
        this.settings = settings;
    }

    public int deadlineHours() {
        return positive(settings.getIntSetting("proof_deadline_hours", DEFAULT_DEADLINE_HOURS), DEFAULT_DEADLINE_HOURS);
    }

    public int reminderHoursBefore() {
        return positive(settings.getIntSetting("proof_reminder_hours_before", DEFAULT_REMINDER_HOURS_BEFORE),
                DEFAULT_REMINDER_HOURS_BEFORE);
    }

    public int graceHours() {
        return positive(settings.getIntSetting("overdue_grace_hours", DEFAULT_GRACE_HOURS), DEFAULT_GRACE_HOURS);
    }

    /** 0 est admis (aucune prolongation). */
    public int maxExtensions() {
        return settings.getIntSetting("max_extensions", DEFAULT_MAX_EXTENSIONS);
    }

    /** Non-livraison : le client récupère-t-il aussi les frais de service ? (défaut : oui — décision D3). */
    public boolean refundPlatformFeesOnNoShow() {
        return settings.getBooleanSetting("refund_platform_fees_on_courier_no_show", true);
    }

    /** Échéance au paiement : max(date prévue, date de paiement) + délai. « Dès que possible » : paiement + délai. */
    public LocalDateTime deadlineFor(LocalDateTime scheduledAt, LocalDateTime paidAt) {
        LocalDateTime start = scheduledAt != null && scheduledAt.isAfter(paidAt) ? scheduledAt : paidAt;
        return start.plusHours(deadlineHours());
    }

    private static int positive(int value, int fallback) {
        return value > 0 ? value : fallback;
    }
}
