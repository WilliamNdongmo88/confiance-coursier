package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.course.domain.CourierIncident;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourierIncidentRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.repository.ProofRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Échéance de preuves et non-livraison (TICK-065b — PLAN_AMELIORATION §3.1 bis).
 *
 * <pre>
 * IN_PROGRESS ──(échéance − 6 h)──► rappel au coursier
 * IN_PROGRESS ──(échéance dépassée)──► OVERDUE ── le coursier peut encore soumettre ses preuves
 * OVERDUE ──(client : prolonger +12/+24 h, 2 fois max)──► IN_PROGRESS
 * OVERDUE ──(client : annuler)──► REFUNDED + incident NO_SHOW
 * OVERDUE ──(client : litige)──► DISPUTED (DisputeService)
 * OVERDUE ──(48 h sans action)──► aucune preuve et aucun achat : REFUNDED + incident
 *                                  sinon : litige automatique (jamais de remboursement aveugle)
 * </pre>
 * Règle absolue : aucun chemin de ce service ne libère les fonds au coursier.
 * Chaque transition s'exécute dans sa propre transaction sous verrou de ligne ; les emails partent après commit.
 */
@Service
public class ProofDeadlineService {

    private static final Logger log = LoggerFactory.getLogger(ProofDeadlineService.class);

    static final String INCIDENT_NO_SHOW = "NO_SHOW";
    static final String AUTO_DISPUTE_MOTIF = "SYS-NL";
    static final int INCIDENT_SUSPENSION_THRESHOLD = 2;
    static final int INCIDENT_WINDOW_DAYS = 30;

    private final CourseRepository courseRepository;
    private final ProofRepository proofRepository;
    private final DisputeRepository disputeRepository;
    private final CourierIncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final EscrowService escrowService;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final ProofDeadlinePolicy policy;
    private final TransactionTemplate tx;
    private final Clock clock;

    public ProofDeadlineService(CourseRepository courseRepository,
                                ProofRepository proofRepository,
                                DisputeRepository disputeRepository,
                                CourierIncidentRepository incidentRepository,
                                UserRepository userRepository,
                                EscrowService escrowService,
                                AuthService authService,
                                NotificationService notificationService,
                                ProofDeadlinePolicy policy,
                                PlatformTransactionManager transactionManager,
                                Clock clock) {
        this.courseRepository = courseRepository;
        this.proofRepository = proofRepository;
        this.disputeRepository = disputeRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.escrowService = escrowService;
        this.authService = authService;
        this.notificationService = notificationService;
        this.policy = policy;
        this.tx = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    // ─── Actions du client sur une course OVERDUE ───────────────────────────

    /** Prolonge l'échéance de {@code hours} heures (12 ou 24), {@code max_extensions} fois au plus. */
    public Course extend(Long courseId, Long clientId, int hours) {
        if (!ProofDeadlinePolicy.ALLOWED_EXTENSION_HOURS.contains(hours)) {
            throw new BusinessException("Prolongation possible de 12 h ou 24 h uniquement.");
        }
        return runAndNotify(after -> {
            Course course = lockOwnedOverdue(courseId, clientId);
            int max = policy.maxExtensions();
            if (course.getExtensionCount() >= max) {
                throw new ConflictException("Le délai a déjà été prolongé " + max
                        + " fois. Vous pouvez annuler et être remboursé, ou ouvrir un litige.");
            }
            LocalDateTime newDeadline = now().plusHours(hours);
            course.setExtensionCount(course.getExtensionCount() + 1);
            course.setProofDeadline(newDeadline);
            course.setOverdueSince(null);
            course.setProofReminderSentAt(null);
            course.setStatus("IN_PROGRESS");
            courseRepository.save(course);
            log.info("[ÉCHÉANCE] courseId={} prolongée de {} h ({}/{}), nouvelle échéance {}",
                    courseId, hours, course.getExtensionCount(), max, newDeadline);
            Long courierId = course.getCourierId();
            after.add(() -> notificationService.notifyDeadlineExtended(courierId, courseId, newDeadline));
            return course;
        });
    }

    /** Annule la course pour non-livraison : remboursement du client, incident pour le coursier. */
    public Course cancelOverdue(Long courseId, Long clientId) {
        return runAndNotify(after -> {
            Course course = lockOwnedOverdue(courseId, clientId);
            refundNoShow(course, false, after);
            return course;
        });
    }

    // ─── Traitement planifié ──────────────────────────────────────────────────

    public record Result(int reminders, int overdue, int refunded, int disputed, int failed) {}

    public Result processDeadlines() {
        LocalDateTime now = now();
        int[] counts = new int[5];

        // 1. Rappel au coursier (échéance − N h)
        for (Long id : courseRepository.findIdsForProofReminder(now, now.plusHours(policy.reminderHoursBefore()))) {
            step(id, counts, 0, after -> {
                Course c = courseRepository.findByIdForUpdate(id).orElse(null);
                if (c == null || !"IN_PROGRESS".equals(c.getStatus()) || c.getProofReminderSentAt() != null) return false;
                c.setProofReminderSentAt(now);
                courseRepository.save(c);
                Long courierId = c.getCourierId();
                LocalDateTime deadline = c.getProofDeadline();
                after.add(() -> notificationService.notifyProofDeadlineReminder(courierId, id, deadline));
                return true;
            });
        }

        // 2. Échéance dépassée sans soumission → OVERDUE
        for (Long id : courseRepository.findIdsPastProofDeadline(now)) {
            step(id, counts, 1, after -> {
                Course c = courseRepository.findByIdForUpdate(id).orElse(null);
                if (c == null || !"IN_PROGRESS".equals(c.getStatus())
                        || c.getProofDeadline() == null || c.getProofDeadline().isAfter(now)) return false;
                c.setStatus("OVERDUE");
                c.setOverdueSince(now);
                courseRepository.save(c);
                log.info("[ÉCHÉANCE] courseId={} → OVERDUE (échéance {})", id, c.getProofDeadline());
                Long clientId = c.getClientId(), courierId = c.getCourierId();
                after.add(() -> notificationService.notifyCourseOverdue(clientId, courierId, id));
                return true;
            });
        }

        // 3. OVERDUE depuis le délai de grâce sans décision du client
        for (Long id : courseRepository.findIdsOverdueBefore(now.minusHours(policy.graceHours()))) {
            Course[] snapshot = new Course[1];
            boolean done = step(id, counts, -1, after -> {
                Course c = courseRepository.findByIdForUpdate(id).orElse(null);
                if (c == null || !"OVERDUE".equals(c.getStatus())) return false;
                boolean noProof = proofRepository.countByCourseId(id) == 0;
                boolean noPurchase = c.getRealCosts() == null || c.getRealCosts().compareTo(BigDecimal.ZERO) <= 0;
                if (noProof && noPurchase) {
                    refundNoShow(c, true, after);
                } else {
                    openAutomaticDispute(c, after);
                }
                snapshot[0] = c;
                return true;
            });
            if (done && snapshot[0] != null) {
                if ("REFUNDED".equals(snapshot[0].getStatus())) counts[2]++; else counts[3]++;
            }
        }

        Result r = new Result(counts[0], counts[1], counts[2], counts[3], counts[4]);
        if (r.reminders() + r.overdue() + r.refunded() + r.disputed() + r.failed() > 0) {
            log.info("[ÉCHÉANCE] rappels={} retard={} remboursées={} litiges={} échecs={}",
                    r.reminders(), r.overdue(), r.refunded(), r.disputed(), r.failed());
        }
        return r;
    }

    // ─── Règles internes ──────────────────────────────────────────────────────

    /** Remboursement pour non-livraison (frais de service rendus selon le paramètre, défaut : oui) + incident. */
    private void refundNoShow(Course course, boolean automatic, List<Runnable> after) {
        boolean refundFees = policy.refundPlatformFeesOnNoShow();
        escrowService.refundTotal(course, refundFees);
        log.info("[NON-LIVRAISON] courseId={} remboursée ({}), frais rendus={}",
                course.getId(), automatic ? "automatique" : "annulation client", refundFees);

        Long clientId = course.getClientId(), courierId = course.getCourierId(), courseId = course.getId();
        after.add(() -> notificationService.notifyNoShowRefund(clientId, courierId, courseId, automatic));
        recordIncidentAndSuspendIfNeeded(courierId, courseId, after);
    }

    private void recordIncidentAndSuspendIfNeeded(Long courierId, Long courseId, List<Runnable> after) {
        if (courierId == null || incidentRepository.existsByCourseIdAndIncidentType(courseId, INCIDENT_NO_SHOW)) {
            return;
        }
        incidentRepository.save(CourierIncident.builder()
                .courierId(courierId).courseId(courseId).incidentType(INCIDENT_NO_SHOW).createdAt(now()).build());

        long recent = incidentRepository.countByCourierIdAndIncidentTypeAndCreatedAtAfter(
                courierId, INCIDENT_NO_SHOW, now().minusDays(INCIDENT_WINDOW_DAYS));
        if (recent < INCIDENT_SUSPENSION_THRESHOLD) return;

        userRepository.findById(courierId)
                .filter(u -> u.isActive() && !"ADMIN".equalsIgnoreCase(u.getRole()))
                .ifPresent(u -> {
                    u.setStatus("SUSPENDED");
                    userRepository.save(u);
                    log.warn("[NON-LIVRAISON] coursier {} suspendu : {} incidents en {} jours", courierId, recent,
                            INCIDENT_WINDOW_DAYS);
                    after.add(() -> {
                        authService.revokeSessions(courierId);
                        notificationService.notifySuspension(courierId);
                    });
                });
    }

    /** Preuves partielles ou achats engagés : l'admin tranche (jamais de remboursement aveugle). */
    private void openAutomaticDispute(Course course, List<Runnable> after) {
        Long courseId = course.getId();
        if (disputeRepository.findByCourseIdAndStatus(courseId, "OPEN").isEmpty()) {
            disputeRepository.save(Dispute.builder()
                    .courseId(courseId)
                    .openedBy(course.getClientId()) // ouvert au nom du client, par le système
                    .motifCode(AUTO_DISPUTE_MOTIF)
                    .description("Litige ouvert automatiquement : course en retard depuis " + policy.graceHours()
                            + " h sans décision du client, avec des preuves déposées mais non soumises "
                            + "ou des achats déclarés.")
                    .status("OPEN")
                    .build());
        }
        escrowService.markDisputed(course);
        course.setStatus("DISPUTED");
        courseRepository.save(course);
        log.info("[NON-LIVRAISON] courseId={} → litige automatique", courseId);
        Long clientId = course.getClientId(), courierId = course.getCourierId();
        after.add(() -> notificationService.notifyAutoDisputeNoShow(clientId, courierId, courseId));
    }

    private Course lockOwnedOverdue(Long courseId, Long clientId) {
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new BusinessException("Course introuvable."));
        if (!course.getClientId().equals(clientId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
        }
        if (!"OVERDUE".equals(course.getStatus())) {
            throw new ConflictException("Cette action n'est possible que sur une course en retard (statut actuel : "
                    + course.getStatus() + ").");
        }
        return course;
    }

    /** Exécute une étape planifiée dans sa propre transaction ; les erreurs sont isolées. */
    private boolean step(Long id, int[] counts, int counterIndex, Function<List<Runnable>, Boolean> work) {
        List<Runnable> after = new ArrayList<>();
        Boolean done;
        try {
            done = tx.execute(status -> work.apply(after));
        } catch (RuntimeException e) {
            counts[4]++;
            log.error("[ÉCHÉANCE] Échec pour la course {} (les autres sont traitées) : {}", id, e.getMessage(), e);
            return false;
        }
        if (Boolean.TRUE.equals(done)) {
            if (counterIndex >= 0) counts[counterIndex]++;
            runAll(after);
            return true;
        }
        return false;
    }

    /** Action client : transaction, puis notifications après commit. */
    private Course runAndNotify(Function<List<Runnable>, Course> work) {
        List<Runnable> after = new ArrayList<>();
        Course result = tx.execute(status -> work.apply(after));
        runAll(after);
        return result;
    }

    private void runAll(List<Runnable> actions) {
        for (Runnable r : actions) {
            try {
                r.run();
            } catch (RuntimeException e) {
                log.warn("[ÉCHÉANCE] Action après commit en échec : {}", e.getMessage());
            }
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
