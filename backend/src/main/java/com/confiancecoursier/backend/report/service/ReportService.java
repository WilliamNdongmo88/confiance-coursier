package com.confiancecoursier.backend.report.service;

import com.confiancecoursier.backend.report.api.dto.ReportResponse;
import com.confiancecoursier.backend.report.api.dto.SubmitReportRequest;
import com.confiancecoursier.backend.report.domain.Report;
import com.confiancecoursier.backend.report.repository.ReportRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Service de gestion des signalements.
 *
 * <h3>Règle de suspension automatique :</h3>
 * Si un utilisateur reçoit ≥ 3 signalements en 30 jours glissants,
 * son compte est automatiquement suspendu.
 */
@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private static final int AUTO_SUSPEND_THRESHOLD   = 3;
    private static final int AUTO_SUSPEND_WINDOW_DAYS = 30;

    private static final Set<String> VALID_DECISIONS = Set.of("SUSPENSION", "AVERTISSEMENT", "REJET");

    private final ReportRepository reportRepository;
    private final UserRepository   userRepository;

    public ReportService(ReportRepository reportRepository, UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.userRepository   = userRepository;
    }

    // ─── Soumission d'un signalement ──────────────────────────────────────

    @Transactional
    public ReportResponse submitReport(Long reporterId, SubmitReportRequest req) {
        Long targetId = parseLong(req.targetId());

        if (reporterId.equals(targetId)) {
            throw new BusinessException("Vous ne pouvez pas vous signaler vous-même.");
        }

        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new BusinessException("Utilisateur signalé introuvable."));

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

        // Vérification de la règle de suspension automatique
        checkAndSuspendIfNeeded(target);

        return ReportResponse.from(saved);
    }

    // ─── Traitement (admin) ────────────────────────────────────────────────

    @Transactional
    public ReportResponse processReport(Long reportId, Long adminId, String decision) {
        if (!VALID_DECISIONS.contains(decision.toUpperCase())) {
            throw new BusinessException("Décision invalide. Valeurs : " + VALID_DECISIONS);
        }

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException("Signalement introuvable."));

        if (!"OPEN".equals(report.getStatus())) {
            throw new BusinessException("Ce signalement a déjà été traité.");
        }

        String dec = decision.toUpperCase();
        report.setDecision(dec);
        report.setDecidedBy(adminId);
        report.setDecidedAt(LocalDateTime.now());
        report.setStatus("PROCESSED");

        // Applique la décision si SUSPENSION
        if ("SUSPENSION".equals(dec)) {
            userRepository.findById(report.getTargetId()).ifPresent(u -> {
                u.setStatus("SUSPENDED");
                userRepository.save(u);
                log.warn("[SUSPENSION ADMIN] userId={} suspendu par admin={}", u.getId(), adminId);
            });
        }

        return ReportResponse.from(reportRepository.save(report));
    }

    // ─── Règle de suspension automatique ─────────────────────────────────

    private void checkAndSuspendIfNeeded(User target) {
        LocalDateTime since = LocalDateTime.now().minusDays(AUTO_SUSPEND_WINDOW_DAYS);
        List<Report> recent = reportRepository.findByTargetIdAndCreatedAtAfter(target.getId(), since);

        if (recent.size() >= AUTO_SUSPEND_THRESHOLD) {
            target.setStatus("SUSPENDED");
            userRepository.save(target);
            log.warn("[SUSPENSION AUTO] userId={} suspendu après {} signalements en {} jours.",
                    target.getId(), recent.size(), AUTO_SUSPEND_WINDOW_DAYS);
        }
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
