package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.domain.Dispute;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.report.repository.ReportRepository;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/admin/users/{id}/summary — activité réelle d'un compte pour la fiche admin
 * (courses, litiges ouverts, signalements reçus, litiges de ses courses). Route sécurisée par {@code ROLE_ADMIN}.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserSummaryController {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final DisputeRepository disputeRepository;
    private final ReportRepository reportRepository;

    public AdminUserSummaryController(UserRepository userRepository, CourseRepository courseRepository,
                                      DisputeRepository disputeRepository, ReportRepository reportRepository) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.disputeRepository = disputeRepository;
        this.reportRepository = reportRepository;
    }

    /** Litige d'une course du compte : {@code openedByThisUser} indique s'il l'a ouvert lui-même. */
    public record LinkedDispute(Long id, Long courseId, String motifCode, String status, String decision,
                                boolean openedByThisUser, LocalDateTime createdAt) {}

    public record UserActivitySummary(long coursesAsClient, long coursesAsCourier, long completedAsCourier,
                                      long disputesOpened, long reportsReceived, List<LinkedDispute> disputes) {}

    @GetMapping("/{id}/summary")
    public ResponseEntity<UserActivitySummary> summary(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("Utilisateur introuvable.");
        }
        return ResponseEntity.ok(new UserActivitySummary(
                courseRepository.countByClientId(id),
                courseRepository.countByCourierId(id),
                courseRepository.countByCourierIdAndStatus(id, "COMPLETED"),
                disputeRepository.countByOpenedBy(id),
                reportRepository.countByTargetId(id),
                disputeRepository.findInvolvingUser(id).stream().map((Dispute d) -> new LinkedDispute(
                        d.getId(), d.getCourseId(), d.getMotifCode(), d.getStatus(), d.getDecision(),
                        id.equals(d.getOpenedBy()), d.getCreatedAt())).toList()));
    }
}
