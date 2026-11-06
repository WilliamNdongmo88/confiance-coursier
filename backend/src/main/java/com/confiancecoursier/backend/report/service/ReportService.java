package com.confiancecoursier.backend.report.service;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.report.api.dto.ReportResponse;
import com.confiancecoursier.backend.report.api.dto.SubmitReportRequest;
import com.confiancecoursier.backend.report.domain.Report;
import com.confiancecoursier.backend.report.repository.ReportRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Service de gestion des signalements.
 *
 * <h3>Règles anti-abus (TICK-063) :</h3>
 * <ul>
 *   <li>Au plus un signalement par paire (signaleur, cible) sur 30 jours glissants.</li>
 *   <li>Suspension automatique quand <b>3 signaleurs distincts</b>, ayant chacun une course
 *       en commun avec la cible, l'ont signalée en 30 jours (signalements rejetés exclus).</li>
 *   <li>Un compte ADMIN n'est jamais suspendu automatiquement ni par une décision de signalement.</li>
 *   <li>Toute suspension révoque la session longue (refresh token), comme la suspension admin.</li>
 * </ul>
 */
@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private static final int AUTO_SUSPEND_THRESHOLD   = 3;
    private static final int AUTO_SUSPEND_WINDOW_DAYS = 30;

    private static final Set<String> VALID_DECISIONS = Set.of("SUSPENSION", "AVERTISSEMENT", "REJET");

    private final ReportRepository reportRepository;
    private final UserRepository   userRepository;
    private final NotificationService notificationService;
    private final AuthService authService;
    private final Clock clock;

    @Autowired
    public ReportService(ReportRepository reportRepository, UserRepository userRepository,
                         NotificationService notificationService, AuthService authService) {
        this(reportRepository, userRepository, notificationService, authService, Clock.systemDefaultZone());
    }

    /** Constructeur avec horloge injectable (tests de la fenêtre de 30 jours). */
    public ReportService(ReportRepository reportRepository, UserRepository userRepository,
                         NotificationService notificationService, AuthService authService, Clock clock) {
        this.reportRepository = reportRepository;
        this.userRepository   = userRepository;
        this.notificationService = notificationService;
        this.authService = authService;
        this.clock = clock;
    }

    // ─── Soumission d'un signalement ──────────────────────────────────────

    @Transactional
    public ReportResponse submitReport(Long reporterId, SubmitReportRequest req) {
        Long targetId = parseLong(req.targetId());

        if (reporterId.equals(targetId)) {
            throw new BusinessException("Vous ne pouvez pas vous signaler vous-même.");
        }

        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new NotFoundException("Utilisateur signalé introuvable."));

        // TICK-063 : un seul signalement par paire (signaleur, cible) sur la fenêtre glissante
        if (reportRepository.existsByReporterIdAndTargetIdAndCreatedAtAfter(reporterId, targetId, windowStart())) {
            throw new ConflictException("Vous avez déjà signalé cet utilisateur au cours des "
                    + AUTO_SUSPEND_WINDOW_DAYS + " derniers jours. L'administrateur examine votre signalement.");
        }

        Report report = Report.builder()
                .reporterId(reporterId)
                .targetId(targetId)
                .motif(req.motif())
                .description(req.description())
                .status("OPEN")
                .build();

        Report saved = reportRepository.save(report);
        log.info("Signalement soumis : id={} reporterId={} targetId={} motif={}",
                saved.getId(), reporterId, targetId, req.motif());

        // Notification email admin
        notificationService.notifyReportReceived(reporterId, targetId);

        // Vérification de la règle de suspension automatique
        checkAndSuspendIfNeeded(target);

        return ReportResponse.from(saved);
    }

    // ─── Traitement (admin) ────────────────────────────────────────────────

    @Transactional
    public ReportResponse processReport(Long reportId, Long adminId, String decision) {
        if (decision == null || !VALID_DECISIONS.contains(decision.toUpperCase())) {
            throw new BusinessException("Décision invalide. Valeurs : " + VALID_DECISIONS);
        }

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Signalement introuvable."));

        if (!"OPEN".equals(report.getStatus())) {
            throw new BusinessException("Ce signalement a déjà été traité.");
        }

        String dec = decision.toUpperCase();
        report.setDecision(dec);
        report.setDecidedBy(adminId);
        report.setDecidedAt(LocalDateTime.now());
        report.setStatus("PROCESSED");

        // Applique la décision si SUSPENSION (jamais sur un compte ADMIN)
        if ("SUSPENSION".equals(dec)) {
            userRepository.findById(report.getTargetId()).ifPresent(u -> {
                if (isAdmin(u)) {
                    throw new BusinessException("Un compte administrateur ne peut pas être suspendu via un signalement.");
                }
                suspend(u);
                log.warn("[SUSPENSION ADMIN] userId={} suspendu par admin={}", u.getId(), adminId);
            });
        }

        Report savedReport = reportRepository.save(report);

        // Notification email à l'utilisateur signalé
        notificationService.notifyReportDecision(report.getTargetId(), dec);

        return ReportResponse.from(savedReport);
    }

    // ─── Règle de suspension automatique ─────────────────────────────────

    private void checkAndSuspendIfNeeded(User target) {
        if (isAdmin(target) || !target.isActive()) {
            return; // ADMIN exclus ; un compte déjà suspendu n'est pas re-suspendu ni re-notifié
        }
        long reporters = reportRepository.countDistinctReportersWithSharedCourse(target.getId(), windowStart());
        if (reporters >= AUTO_SUSPEND_THRESHOLD) {
            suspend(target);
            log.warn("[SUSPENSION AUTO] userId={} suspendu : {} signaleurs distincts avec course commune en {} jours.",
                    target.getId(), reporters, AUTO_SUSPEND_WINDOW_DAYS);
            notificationService.notifySuspension(target.getId());
        }
    }

    private void suspend(User user) {
        user.setStatus("SUSPENDED");
        userRepository.save(user);
        authService.revokeSessions(user.getId()); // TICK-053 : coupe aussi le refresh token
    }

    private static boolean isAdmin(User user) {
        return "ADMIN".equalsIgnoreCase(user.getRole());
    }

    private LocalDateTime windowStart() {
        return LocalDateTime.now(clock).minusDays(AUTO_SUSPEND_WINDOW_DAYS);
    }

    private Long parseLong(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            throw new BusinessException("L'identifiant de l'utilisateur signalé est invalide.");
        }
    }

    // ─── Listage (admin) ──────────────────────────────────────────────────

    /**
     * Liste tous les signalements, éventuellement filtrés par statut.
     *
     * @param status statut filtrant (OPEN, PROCESSED…) ou null pour tout
     * @return la liste des signalements au format DTO
     */
    public List<ReportResponse> getReportsByStatus(String status) {
        List<Report> reports = (status == null || status.isBlank())
                ? reportRepository.findAll()
                : reportRepository.findByStatus(status.toUpperCase());
        return reports.stream().map(ReportResponse::from).toList();
    }
}
