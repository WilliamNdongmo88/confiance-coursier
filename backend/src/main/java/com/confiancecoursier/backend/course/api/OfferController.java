package com.confiancecoursier.backend.course.api;

import com.confiancecoursier.backend.course.api.dto.CreateOfferRequest;
import com.confiancecoursier.backend.course.api.dto.CreateOfferResponse;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<CreateOfferResponse> createOffer(@PathVariable Long courseId,
                                                           @Valid @RequestBody CreateOfferRequest request) {
        Long courierId = getCurrentUserId();
        CreateOfferResponse response = offerService.createOffer(courseId, courierId, request.getAmount(), request.getDetails());
        return ResponseEntity.ok(response);
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