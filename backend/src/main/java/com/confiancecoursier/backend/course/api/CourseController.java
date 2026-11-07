package com.confiancecoursier.backend.course.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.api.dto.CreateCourseRequest;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.CourseService;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.course.service.ProofDeadlineService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final ProofDeadlineService proofDeadlineService;
    private final CourseService courseService;
    private final UserRepository userRepository;
    private final OfferService offerService;
    private final CourseRepository courseRepository;
    private final ChatRoomRepository chatRoomRepository;

    public CourseController(CourseService courseService,
                            UserRepository userRepository,
                            OfferService offerService,
                            CourseRepository courseRepository,
                            ChatRoomRepository chatRoomRepository,
                            ProofDeadlineService proofDeadlineService) {
        this.proofDeadlineService = proofDeadlineService;
        this.courseService = courseService;
        this.userRepository = userRepository;
        this.offerService = offerService;
        this.courseRepository = courseRepository;
        this.chatRoomRepository = chatRoomRepository;
    }

    /**
     * POST /api/courses/{courseId}/extend — body {@code {"hours": 12 | 24}}.
     * TICK-065b : le client prolonge l'échéance d'une course en retard (OVERDUE), {@code max_extensions} fois au plus.
     */
    @PostMapping("/{courseId}/extend")
    public ResponseEntity<CourseResponse> extendProofDeadline(@PathVariable Long courseId,
                                                              @RequestBody Map<String, Integer> body) {
        Integer hours = body == null ? null : body.get("hours");
        if (hours == null) {
            throw new BusinessException("Durée de prolongation manquante (12 ou 24 heures).");
        }
        Long clientId = getCurrentUserId();
        proofDeadlineService.extend(courseId, clientId, hours);
        return ResponseEntity.ok(courseService.getCourseById(courseId, clientId));
    }

    /**
     * POST /api/courses/{courseId}/cancel-overdue
     * TICK-065b : le client annule une course en retard et est remboursé (non-livraison).
     */
    @PostMapping("/{courseId}/cancel-overdue")
    public ResponseEntity<CourseResponse> cancelOverdue(@PathVariable Long courseId) {
        Long clientId = getCurrentUserId();
        proofDeadlineService.cancelOverdue(courseId, clientId);
        return ResponseEntity.ok(courseService.getCourseById(courseId, clientId));
    }

    @PostMapping("/{courseId}/accept-offer/{offerId}")
    public ResponseEntity<String> acceptOffer(@PathVariable Long courseId, @PathVariable Long offerId) {
        Long clientId = getCurrentUserId();
        offerService.acceptOffer(courseId, offerId, clientId);
        return ResponseEntity.ok("Offre acceptée avec succès. La course est maintenant assignée.");
    }

    /**
     * POST /api/courses/{courseId}/conversations
     * TICK-057 — Ouvre (ou récupère) un salon de chat SANS créer d'offre fictive.
     *
     * CLIENT propriétaire : body { "courierId": 42 } — choisit avec quel coursier discuter.
     * COURSIER            : body vide — ouvre le chat pour une course PUBLISHED ; KYC APPROVED requis.
     *
     * L'appel est idempotent : si le salon existe déjà il est renvoyé sans doublon.
     */
    @PostMapping("/{courseId}/conversations")
    public ResponseEntity<Map<String, Long>> openConversation(
            @PathVariable Long courseId,
            @RequestBody(required = false) Map<String, Long> body) {

        User caller = resolveUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course introuvable."));

        Long courierId;

        if ("CLIENT".equalsIgnoreCase(caller.getRole())) {
            // Le client doit être propriétaire de la course
            if (!course.getClientId().equals(caller.getId())) {
                throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
            }
            courierId = (body != null) ? body.get("courierId") : null;
            if (courierId == null) {
                throw new BusinessException("courierId manquant dans le corps de la requête.");
            }
            // Conversation déjà ouverte : renvoyée telle quelle (idempotent)
            var existingRoom = chatRoomRepository.findByCourseIdAndCourierId(courseId, courierId);
            if (existingRoom.isPresent()) {
                return ResponseEntity.ok(Map.of("chatRoomId", existingRoom.get().getId()));
            }
            // Nouvelle conversation : course encore ouverte, et correspondant = vrai coursier actif KYC APPROVED.
            // Sinon n'importe quel compte deviendrait « coursier du salon » et pourrait poster des offres.
            if (!"PUBLISHED".equals(course.getStatus())) {
                throw new BusinessException("Cette course n'est plus ouverte aux propositions.");
            }
            userRepository.findById(courierId)
                    .filter(OfferService::canMakeOffers)
                    .orElseThrow(() -> new BusinessException("Ce coursier n'est pas disponible (compte non vérifié ou inactif)."));

        } else if ("COURIER".equalsIgnoreCase(caller.getRole())) {
            // KYC APPROVED obligatoire
            if (!"APPROVED".equals(caller.getKycStatus())) {
                throw new BusinessException("Votre identité doit être vérifiée (KYC) avant de contacter un client.");
            }
            // La course doit être PUBLISHED
            if (!"PUBLISHED".equals(course.getStatus())) {
                throw new BusinessException("Cette course n'est plus disponible.");
            }
            courierId = caller.getId();

        } else {
            throw new ForbiddenException("Action non autorisée.");
        }

        // Idempotent : créer le salon uniquement s'il n'existe pas
        final Long finalCourierId = courierId;
        ChatRoom room = chatRoomRepository
                .findByCourseIdAndCourierId(courseId, finalCourierId)
                .orElseGet(() -> {
                    ChatRoom newRoom = ChatRoom.builder()
                            .courseId(courseId)
                            .clientId(course.getClientId())
                            .courierId(finalCourierId)
                            .build();
                    return chatRoomRepository.save(newRoom);
                });

        return ResponseEntity.ok(Map.of("chatRoomId", room.getId()));
    }

    /**
     * GET /api/courses/{courseId}/conversations — conversations ouvertes sur la course (client propriétaire) :
     * [{ chatRoomId, courierId, courierName }]. Permet d'afficher en premier les coursiers qui ont déjà écrit.
     */
    @GetMapping("/{courseId}/conversations")
    public ResponseEntity<java.util.List<Map<String, Object>>> listConversations(@PathVariable Long courseId) {
        User caller = resolveUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course introuvable."));
        if (!course.getClientId().equals(caller.getId())) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
        }
        var rooms = chatRoomRepository.findByCourseId(courseId);
        Map<Long, String> names = userRepository.findAllById(rooms.stream().map(ChatRoom::getCourierId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId,
                        u -> u.getFullName() == null || u.getFullName().isBlank() ? "Coursier" : u.getFullName()));
        return ResponseEntity.ok(rooms.stream()
                .map(r -> Map.<String, Object>of("chatRoomId", r.getId(), "courierId", r.getCourierId(),
                        "courierName", names.getOrDefault(r.getCourierId(), "Coursier")))
                .toList());
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

    @GetMapping("/published")
    public ResponseEntity<List<CourseResponse>> getPublishedCourses() {
        Long courierId = getCurrentUserId();
        return ResponseEntity.ok(courseService.getPublishedCourses(courierId));
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

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private Long getCurrentUserId() {
        return resolveUser().getId();
    }

    private User resolveUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));
    }
}