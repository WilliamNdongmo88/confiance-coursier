package com.confiancecoursier.backend.course.api;

import com.confiancecoursier.backend.course.api.dto.CreateCourseRequest;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.service.CourseService;
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
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final UserRepository userRepository;
    private final OfferService offerService;

    public CourseController(CourseService courseService, UserRepository userRepository, OfferService offerService) {
        this.courseService = courseService;
        this.userRepository = userRepository;
        this.offerService = offerService;
    }

    // Nouvel endpoint
    @PostMapping("/{courseId}/accept-offer/{offerId}")
    public ResponseEntity<String> acceptOffer(@PathVariable Long courseId, @PathVariable Long offerId) {
        Long clientId = getCurrentUserId();
        offerService.acceptOffer(courseId, offerId, clientId);
        return ResponseEntity.ok("Offre acceptée avec succès. La course est maintenant assignée.");
    }

    @PostMapping
    public ResponseEntity<CourseResponse> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        Long clientId = getCurrentUserId();
        CourseResponse response = courseService.createCourse(clientId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<CourseResponse>> getMyCourses() {
        Long clientId = getCurrentUserId();
        return ResponseEntity.ok(courseService.getMyCourses(clientId));
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }

    @GetMapping("/published")
    public ResponseEntity<List<CourseResponse>> getPublishedCourses() {
        return ResponseEntity.ok(courseService.getPublishedCourses());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseResponse> updateCourse(@PathVariable Long id, @Valid @RequestBody CreateCourseRequest request) {
        Long clientId = getCurrentUserId();
        return ResponseEntity.ok(courseService.updateCourse(id, clientId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
        Long clientId = getCurrentUserId();
        courseService.deleteCourse(id, clientId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponse> getCourseById(@PathVariable Long id) {
        Long clientId = getCurrentUserId();
        return ResponseEntity.ok(courseService.getCourseById(id, clientId));
    }

    @GetMapping("/my-missions")
    public ResponseEntity<List<CourseResponse>> getMyMissions() {
        Long courierId = getCurrentUserId();
        return ResponseEntity.ok(courseService.getMyMissions(courierId));
    }
}