package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.report.api.dto.ReportResponse;
import com.confiancecoursier.backend.report.service.ReportService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur admin pour la gestion des signalements.
 *
 * <p>Toutes les routes sont sécurisées par {@code ROLE_ADMIN} dans {@code SecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET  /api/admin/reports}                  — liste des signalements (filtre {@code ?status=})</li>
 *   <li>{@code POST /api/admin/reports/{id}/process}     — traiter un signalement</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    public AdminReportController(ReportService reportService, UserRepository userRepository) {
        this.reportService = reportService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/admin/reports?status=OPEN
     *
     * Liste tous les signalements. Le paramètre {@code status} est optionnel.
     */
    @GetMapping
    public ResponseEntity<List<ReportResponse>> listReports(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(reportService.getReportsByStatus(status));
    }

    /**
     * POST /api/admin/reports/{id}/process?decision=SUSPENSION
     *
     * Traite un signalement. Décisions acceptées :
     * {@code SUSPENSION}, {@code AVERTISSEMENT}, {@code REJET}.
     */
    @PostMapping("/{id}/process")
    public ResponseEntity<ReportResponse> process(@PathVariable Long id,
                                                  @RequestParam String decision) {
        Long adminId = getCurrentAdminId();
        return ResponseEntity.ok(reportService.processReport(id, adminId, decision));
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private Long getCurrentAdminId() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Administrateur non trouvé."))
                .getId();
    }
}
