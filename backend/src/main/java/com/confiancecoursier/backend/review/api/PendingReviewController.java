package com.confiancecoursier.backend.review.api;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.review.service.ReviewGate;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/reviews/pending (TICK-073) : courses terminées que l'utilisateur doit encore noter.
 * Le front s'en sert pour afficher « Noter » et bloquer la création de course / l'envoi d'offre.
 */
@RestController
@RequestMapping("/api/reviews")
public class PendingReviewController {

    private final ReviewGate reviewGate;
    private final UserRepository userRepository;

    public PendingReviewController(ReviewGate reviewGate, UserRepository userRepository) {
        this.reviewGate = reviewGate;
        this.userRepository = userRepository;
    }

    public record PendingReview(Long courseId, String description, LocalDateTime completedAt, String targetRole) {}

    @GetMapping("/pending")
    public ResponseEntity<List<PendingReview>> pending(Principal principal) {
        User me = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        List<PendingReview> list = reviewGate.pendingFor(me.getId()).stream()
                .map((Course c) -> new PendingReview(c.getId(), c.getDescription(), c.getCompletedAt(),
                        me.getId().equals(c.getClientId()) ? "COURIER" : "CLIENT"))
                .toList();
        return ResponseEntity.ok(list);
    }
}
