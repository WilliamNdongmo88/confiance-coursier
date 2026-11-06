package com.confiancecoursier.backend.report.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.report.api.dto.ReportResponse;
import com.confiancecoursier.backend.report.api.dto.SubmitReportRequest;
import com.confiancecoursier.backend.report.service.ReportService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST pour les signalements.
 * <ul>
 *   <li>{@code POST /api/reports}                — Soumettre un signalement</li>
 * </ul>
 * Le traitement est réservé à l'admin : {@code POST /api/admin/reports/{id}/process}
 * (voir {@code AdminReportController}, protégé par hasRole(ADMIN)) — TICK-052.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService  reportService;
    private final UserRepository userRepository;

    public ReportController(ReportService reportService, UserRepository userRepository) {
        this.reportService  = reportService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ReportResponse> submit(@Valid @RequestBody SubmitReportRequest req) {
        Long reporterId = getCurrentUserId();
        return ResponseEntity.ok(reportService.submitReport(reporterId, req));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."))
                .getId();
    }
}
