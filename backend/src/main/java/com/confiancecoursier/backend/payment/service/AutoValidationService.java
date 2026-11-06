package com.confiancecoursier.backend.payment.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-validation à 72 h (TICK-065).
 *
 * <ul>
 *   <li>Requête ciblée : ids des courses {@code PROOFS_SUBMITTED} avec {@code auto_validate_at <= now}.</li>
 *   <li><b>Une transaction par course</b>, course rechargée sous verrou de ligne et revérifiée
 *       (une validation manuelle ou un litige ont pu passer entre-temps).</li>
 *   <li>Les emails partent <b>après le commit</b> : jamais d'email pour une libération annulée,
 *       et une panne SMTP ne bloque pas la transaction.</li>
 *   <li>Une erreur sur une course est journalisée et n'empêche pas de traiter les suivantes.</li>
 * </ul>
 */
@Service
public class AutoValidationService {

    private static final Logger log = LoggerFactory.getLogger(AutoValidationService.class);

    private final CourseRepository courseRepository;
    private final EscrowService escrowService;
    private final NotificationService notificationService;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    public AutoValidationService(CourseRepository courseRepository,
                                 EscrowService escrowService,
                                 NotificationService notificationService,
                                 PlatformTransactionManager transactionManager,
                                 Clock clock) {
        this.courseRepository = courseRepository;
        this.escrowService = escrowService;
        this.notificationService = notificationService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    /** Résultat d'un passage du job. */
    public record Result(int validated, int skipped, int failed) {}

    public Result autoValidateDueCourses() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<Long> dueIds = courseRepository.findIdsDueForAutoValidation(now);

        int validated = 0, skipped = 0, failed = 0;
        for (Long id : dueIds) {
            Validated v;
            try {
                v = transactionTemplate.execute(status -> validateOne(id, now));
            } catch (RuntimeException e) {
                failed++;
                log.error("[AUTO-VALIDATION] Échec pour la course {} (les autres courses sont traitées) : {}",
                        id, e.getMessage(), e);
                continue;
            }
            if (v == null) {
                skipped++;
                continue;
            }
            validated++;
            // Après commit : la libération est définitive
            try {
                notificationService.notifyAutoValidation(v.clientId(), v.courierId(), v.courseId());
            } catch (RuntimeException e) {
                log.warn("[AUTO-VALIDATION] Course {} validée mais email non envoyé : {}", id, e.getMessage());
            }
        }
        if (!dueIds.isEmpty()) {
            log.info("[AUTO-VALIDATION] {} à traiter : {} validée(s), {} ignorée(s), {} en échec",
                    dueIds.size(), validated, skipped, failed);
        }
        return new Result(validated, skipped, failed);
    }

    private record Validated(Long courseId, Long clientId, Long courierId) {}

    /** Exécutée dans sa propre transaction. Renvoie {@code null} si la course n'est plus éligible. */
    private Validated validateOne(Long id, LocalDateTime now) {
        Course course = courseRepository.findByIdForUpdate(id).orElse(null);
        if (course == null
                || !"PROOFS_SUBMITTED".equals(course.getStatus())
                || course.getAutoValidateAt() == null
                || course.getAutoValidateAt().isAfter(now)) {
            return null; // validée manuellement, litige ouvert ou délai modifié entre-temps
        }
        course.setCompletedAt(now);
        escrowService.release(course);
        log.info("[AUTO-VALIDATION] courseId={} validée automatiquement (autoValidateAt={})",
                id, course.getAutoValidateAt());
        return new Validated(course.getId(), course.getClientId(), course.getCourierId());
    }
}
