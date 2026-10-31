package com.confiancecoursier.backend.course.api;

import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses/{courseId}/offers")
public class OfferController {

    private final OfferService offerService;
    private final UserRepository userRepository;

    public OfferController(OfferService offerService, UserRepository userRepository) {
        this.offerService = offerService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<CourseOffer> createOffer(@PathVariable Long courseId,
                                                   @RequestBody Map<String, Object> payload) {
        Long courierId = getCurrentUserId();
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String details = (String) payload.get("details");

        CourseOffer offer = offerService.createOffer(courseId, courierId, amount, details);
        return ResponseEntity.ok(offer);
    }

    @GetMapping
    public ResponseEntity<List<CourseOffer>> getOffers(@PathVariable Long courseId) {
        return ResponseEntity.ok(offerService.getOffersForCourse(courseId));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}