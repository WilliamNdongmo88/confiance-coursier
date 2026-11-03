package com.confiancecoursier.backend.review.api;

import com.confiancecoursier.backend.review.api.dto.ReviewResponse;
import com.confiancecoursier.backend.review.api.dto.SubmitReviewRequest;
import com.confiancecoursier.backend.review.service.ReviewService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour les avis post-course.
 *
 * <ul>
 *   <li>{@code POST /api/courses/{courseId}/review} — Soumettre un avis</li>
 *   <li>{@code GET  /api/courses/{courseId}/reviews} — Lire les avis d'une course</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/courses/{courseId}")
public class ReviewController {

    private final ReviewService  reviewService;
    private final UserRepository userRepository;

    public ReviewController(ReviewService reviewService, UserRepository userRepository) {
        this.reviewService  = reviewService;
        this.userRepository = userRepository;
    }

    @PostMapping("/review")
    public ResponseEntity<ReviewResponse> submitReview(
            @PathVariable Long courseId,
            @Valid @RequestBody SubmitReviewRequest request) {

        Long authorId = getCurrentUserId();
        return ResponseEntity.ok(reviewService.submitReview(courseId, authorId, request));
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getReviews(@PathVariable Long courseId) {
        Long requesterId = getCurrentUserId();
        return ResponseEntity.ok(reviewService.getReviewsByCourse(courseId, requesterId));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}
