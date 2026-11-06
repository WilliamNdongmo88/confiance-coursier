package com.confiancecoursier.backend.dispute.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.dispute.api.dto.OpenDisputeRequest;
import com.confiancecoursier.backend.dispute.service.DisputeService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST pour les litiges.
 * <ul>
 *   <li>{@code POST /api/disputes}              — Ouvrir un litige</li>
 *   <li>{@code GET  /api/disputes/{id}}         — Lire un litige</li>
 * </ul>
 * La résolution est réservée à l'admin : {@code POST /api/admin/disputes/{id}/resolve}
 * (voir {@code AdminDisputeController}, protégé par hasRole(ADMIN)) — TICK-052.
 */
@RestController
@RequestMapping("/api/disputes")
public class DisputeController {

    private final DisputeService disputeService;
    private final UserRepository userRepository;

    public DisputeController(DisputeService disputeService, UserRepository userRepository) {
        this.disputeService = disputeService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<DisputeResponse> open(@Valid @RequestBody OpenDisputeRequest req,
                                                @RequestParam Long courseId) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(disputeService.openDispute(courseId, userId, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DisputeResponse> get(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(disputeService.getDispute(id, userId));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."))
                .getId();
    }
}
