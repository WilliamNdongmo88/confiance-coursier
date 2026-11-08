package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.course.service.ProofDeadlinePolicy;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TICK-093 — règles de remboursement et délais, modifiables par l'administrateur. Les valeurs sont lues là où elles
 * servent ({@link ProofDeadlinePolicy}, {@code EscrowService}) : un changement s'applique aux prochains calculs.
 * Une échéance déjà fixée sur une course payée ne bouge pas.
 *
 * <p>Bornes (identiques dans l'écran admin) : échéance 1 à 168 h ; rappel 1 à 48 h et avant l'échéance ;
 * délai de grâce 1 à 168 h ; prolongations 0 à 5.
 */
@Service
public class PlatformRulesService {

    public static final String KEY_REFUND_FEES_FULL_REFUND = "refund_platform_fees_on_full_refund";
    public static final String KEY_REFUND_FEES_NO_SHOW     = "refund_platform_fees_on_courier_no_show";
    public static final String KEY_DEADLINE_HOURS          = "proof_deadline_hours";
    public static final String KEY_REMINDER_HOURS          = "proof_reminder_hours_before";
    public static final String KEY_GRACE_HOURS             = "overdue_grace_hours";
    public static final String KEY_MAX_EXTENSIONS          = "max_extensions";

    public static final int MAX_DEADLINE_HOURS = 168;
    public static final int MAX_REMINDER_HOURS = 48;
    public static final int MAX_GRACE_HOURS = 168;
    public static final int MAX_EXTENSIONS = 5;

    private final CommissionService settings;
    private final ProofDeadlinePolicy policy;

    public PlatformRulesService(CommissionService settings, ProofDeadlinePolicy policy) {
        this.settings = settings;
        this.policy = policy;
    }

    public record Rules(boolean refundFeesOnFullRefund, boolean refundFeesOnNoShow, int proofDeadlineHours,
                        int reminderHoursBefore, int overdueGraceHours, int maxExtensions) {}

    public Rules get() {
        return new Rules(
                settings.getBooleanSetting(KEY_REFUND_FEES_FULL_REFUND, false),
                policy.refundPlatformFeesOnNoShow(),
                policy.deadlineHours(),
                policy.reminderHoursBefore(),
                policy.graceHours(),
                policy.maxExtensions());
    }

    @Transactional
    public Rules update(Rules r, Long adminId) {
        if (r == null) throw new BusinessException("Réglages manquants.");
        check(r.proofDeadlineHours() >= 1 && r.proofDeadlineHours() <= MAX_DEADLINE_HOURS,
                "L'échéance des preuves doit être comprise entre 1 et " + MAX_DEADLINE_HOURS + " heures.");
        check(r.reminderHoursBefore() >= 1 && r.reminderHoursBefore() <= MAX_REMINDER_HOURS,
                "Le rappel doit être envoyé entre 1 et " + MAX_REMINDER_HOURS + " heures avant l'échéance.");
        check(r.reminderHoursBefore() < r.proofDeadlineHours(),
                "Le rappel doit partir avant l'échéance : choisissez un rappel plus court que l'échéance.");
        check(r.overdueGraceHours() >= 1 && r.overdueGraceHours() <= MAX_GRACE_HOURS,
                "Le délai de grâce doit être compris entre 1 et " + MAX_GRACE_HOURS + " heures.");
        check(r.maxExtensions() >= 0 && r.maxExtensions() <= MAX_EXTENSIONS,
                "Le nombre de prolongations doit être compris entre 0 et " + MAX_EXTENSIONS + ".");

        settings.upsertSetting(KEY_REFUND_FEES_FULL_REFUND, String.valueOf(r.refundFeesOnFullRefund()), adminId);
        settings.upsertSetting(KEY_REFUND_FEES_NO_SHOW, String.valueOf(r.refundFeesOnNoShow()), adminId);
        settings.upsertSetting(KEY_DEADLINE_HOURS, String.valueOf(r.proofDeadlineHours()), adminId);
        settings.upsertSetting(KEY_REMINDER_HOURS, String.valueOf(r.reminderHoursBefore()), adminId);
        settings.upsertSetting(KEY_GRACE_HOURS, String.valueOf(r.overdueGraceHours()), adminId);
        settings.upsertSetting(KEY_MAX_EXTENSIONS, String.valueOf(r.maxExtensions()), adminId);
        return r;
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new BusinessException(message);
    }
}
