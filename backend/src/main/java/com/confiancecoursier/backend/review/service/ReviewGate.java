package com.confiancecoursier.backend.review.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Notation obligatoire (TICK-073, spec §1.5) : tant qu'une course terminée n'a pas été notée,
 * le client ne peut pas créer de nouvelle course et le coursier ne peut pas proposer de tarif.
 */
@Component
public class ReviewGate {

    private final CourseRepository courseRepository;

    public ReviewGate(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<Course> pendingFor(Long userId) {
        return userId == null ? List.of() : courseRepository.findCompletedAwaitingReviewBy(userId);
    }

    /** @throws ConflictException (409) si un avis est dû — le message cite la course à noter. */
    public void requireNoPendingReview(Long userId, String action) {
        List<Course> pending = pendingFor(userId);
        if (!pending.isEmpty()) {
            Course c = pending.get(0);
            throw new ConflictException("Notez d'abord la course #" + c.getId() + " (« " + shorten(c.getDescription())
                    + " ») avant de " + action + "." + (pending.size() > 1 ? " " + pending.size() + " avis en attente." : ""));
        }
    }

    private static String shorten(String s) {
        if (s == null) return "";
        return s.length() <= 40 ? s : s.substring(0, 37) + "…";
    }
}
