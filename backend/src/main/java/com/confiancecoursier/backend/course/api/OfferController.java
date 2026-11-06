package com.confiancecoursier.backend.course.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * Gestion des offres sur une course.
 *
 * <p>Les offres sont créées uniquement depuis le chat (message OFFER, TICK-058) :
 * l'ancien {@code POST /api/courses/{courseId}/offers} a été supprimé.
 *
 * <p>TICK-056 : contrôle de participation sur GET /offers.
 * <ul>
 *   <li>CLIENT propriétaire → toutes les offres (pour comparer les coursiers).</li>
 *   <li>COURIER → uniquement sa propre offre (évite l'espionnage des concurrents).</li>
 *   <li>Tout autre appelant → 403.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/courses/{courseId}/offers")
public class OfferController {

    private final OfferService offerService;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public OfferController(OfferService offerService,
                           CourseRepository courseRepository,
                           UserRepository userRepository) {
        this.offerService = offerService;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    /**
     * POST /api/courses/{courseId}/offers/{offerId}/accept
     * TICK-059 — Le CLIENT accepte une offre ACTIVE → course passe en ASSIGNED.
     */
    @PostMapping("/{offerId}/accept")
    public ResponseEntity<Void> acceptOffer(@PathVariable Long courseId,
                                            @PathVariable Long offerId,
                                            Principal principal) {
        User caller = resolveUser(principal);
        if (!"CLIENT".equalsIgnoreCase(caller.getRole())) {
            throw new ForbiddenException("Seul le client peut accepter une offre.");
        }
        offerService.acceptOffer(courseId, offerId, caller.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/courses/{courseId}/offers
     * <p>Le client voit toutes les offres de sa course.
     * Le coursier ne voit que la sienne (TICK-056).
     */
    @GetMapping
    public ResponseEntity<List<CourseOffer>> getOffers(@PathVariable Long courseId,
                                                       Principal principal) {
        User caller = resolveUser(principal);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));

        List<CourseOffer> offers;
        if ("CLIENT".equalsIgnoreCase(caller.getRole())) {
            // Le client propriétaire voit tout
            if (!course.getClientId().equals(caller.getId())) {
                throw new ForbiddenException("Accès refusé.");
            }
            offers = offerService.getOffersForCourse(courseId);
        } else if ("COURIER".equalsIgnoreCase(caller.getRole())) {
            // Le coursier ne voit que sa propre offre
            offers = offerService.getOffersForCourse(courseId).stream()
                    .filter(o -> o.getCourierId().equals(caller.getId()))
                    .toList();
        } else if ("ADMIN".equalsIgnoreCase(caller.getRole())) {
            offers = offerService.getOffersForCourse(courseId);
        } else {
            throw new ForbiddenException("Accès refusé.");
        }
        return ResponseEntity.ok(offers);
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private User resolveUser(Principal principal) {
        String email = principal != null
                ? principal.getName()
                : SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));
    }
}