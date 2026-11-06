package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.review.repository.ReviewRepository;
import com.confiancecoursier.backend.review.service.ReviewGate;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import com.confiancecoursier.backend.course.api.dto.CreateCourseRequest;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final CourseOfferRepository offerRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewGate reviewGate;

    public CourseService(CourseRepository courseRepository, ChatRoomRepository chatRoomRepository,
                         CourseOfferRepository offerRepository, UserRepository userRepository,
                         ReviewRepository reviewRepository, ReviewGate reviewGate) {
        this.reviewRepository = reviewRepository;
        this.reviewGate = reviewGate;
        this.courseRepository = courseRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.offerRepository = offerRepository;
        this.userRepository = userRepository;
    }

    // ── TICK-070 : assemblage des réponses (noms en lot, montants selon la personne qui consulte) ──

    private static CourseResponse.Viewer viewerOf(Course course, Long viewerId) {
        if (viewerId != null && viewerId.equals(course.getClientId())) return CourseResponse.Viewer.CLIENT;
        if (viewerId != null && viewerId.equals(course.getCourierId())) return CourseResponse.Viewer.COURIER;
        return CourseResponse.Viewer.OTHER;
    }

    /** Noms complets des utilisateurs, chargés en une seule requête. */
    private Map<Long, String> namesOf(java.util.Collection<Course> courses) {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        for (Course c : courses) {
            ids.add(c.getClientId());
            if (c.getCourierId() != null) ids.add(c.getCourierId());
        }
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, CourseService::displayName));
    }

    private static String displayName(User u) {
        return u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : "Utilisateur";
    }

    private static CourseResponse toResponse(Course c, Long roomId, Long viewerId, Map<Long, String> names) {
        return CourseResponse.of(c, roomId, viewerOf(c, viewerId),
                names.get(c.getClientId()), c.getCourierId() == null ? null : names.get(c.getCourierId()));
    }

    /**
     * TICK-073 : marque {@code reviewDue} sur les courses COMPLETED que le lecteur (client ou coursier
     * assigné) n'a pas encore notées — une seule requête pour toute la liste.
     */
    private List<CourseResponse> withReviewDue(List<CourseResponse> responses, Long viewerId) {
        List<Long> completed = responses.stream()
                .filter(r -> "COMPLETED".equals(r.getStatus()))
                .filter(r -> viewerId.equals(r.getClientId()) || viewerId.equals(r.getCourierId()))
                .map(CourseResponse::getId).toList();
        java.util.Set<Long> reviewed = completed.isEmpty() ? java.util.Set.of()
                : new java.util.HashSet<>(reviewRepository.findReviewedCourseIds(viewerId, completed));
        for (CourseResponse r : responses) {
            r.setReviewDue(completed.contains(r.getId()) && !reviewed.contains(r.getId()));
        }
        return responses;
    }

    public CourseResponse createCourse(Long clientId, CreateCourseRequest request) {
        reviewGate.requireNoPendingReview(clientId, "créer une nouvelle course"); // TICK-073
        Course course = Course.builder()
                .clientId(clientId)
                .description(request.getDescription())
                .zone(request.getZone())
                .scheduledAt(request.getScheduledAt())
                .status("PUBLISHED")
                .build();

        Course savedCourse = courseRepository.save(course);
        return toResponse(savedCourse, null, clientId, namesOf(List.of(savedCourse)));
    }

    /** TICK-069 : 2 requêtes au total (courses, puis tous leurs salons) au lieu d'une par course. */
    public List<CourseResponse> getMyCourses(Long clientId) {
        List<Course> courses = courseRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        if (courses.isEmpty()) return List.of();

        Map<Long, List<ChatRoom>> roomsByCourse = chatRoomRepository
                .findByCourseIdIn(courses.stream().map(Course::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(ChatRoom::getCourseId));

        Map<Long, String> names = namesOf(courses);
        return withReviewDue(courses.stream()
                .map(course -> toResponse(course,
                        pickRoom(course, roomsByCourse.getOrDefault(course.getId(), List.of())), clientId, names))
                .collect(Collectors.toList()), clientId);
    }

    public List<CourseResponse> getPublishedCourses(Long courierId) {
        // Récupérer les IDs des courses où ce coursier a déjà une ChatRoom (offre déjà faite)
        java.util.Set<Long> alreadyEngagedCourseIds = chatRoomRepository.findByCourierId(courierId)
                .stream()
                .map(ChatRoom::getCourseId)
                .collect(Collectors.toSet());

        List<Course> published = courseRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED")
                .stream()
                // Exclure les courses où le coursier est déjà engagé
                .filter(course -> !alreadyEngagedCourseIds.contains(course.getId()))
                .toList();
        Map<Long, String> names = namesOf(published);
        return published.stream()
                .map(course -> toResponse(course, null, courierId, names))
                .collect(Collectors.toList());
    }

    @Transactional
    public CourseResponse updateCourse(Long courseId, Long clientId, CreateCourseRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
        }

        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new BusinessException("Impossible de modifier une course qui n'est plus au statut PUBLISHED.");
        }

        course.setDescription(request.getDescription());
        course.setZone(request.getZone());
        course.setScheduledAt(request.getScheduledAt());

        Course updated = courseRepository.save(course);
        return toResponse(updated, resolveChatRoomId(updated), clientId, namesOf(List.of(updated)));
    }

    /**
     * « Supprimer » une course = l'annuler (TICK-069) : suppression douce en CANCELLED.
     * La suppression physique échouait (500) dès qu'un salon de chat ou une offre référençait la course.
     * Possible avant paiement uniquement (PUBLISHED ou ASSIGNED, aucun fonds en séquestre) ;
     * les offres encore actives sont rejetées et les conversations archivées (lecture seule).
     */
    @Transactional
    public void deleteCourse(Long courseId, Long clientId) {
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cette course.");
        }
        if ("CANCELLED".equals(course.getStatus())) {
            return; // idempotent
        }
        if (!CANCELLABLE_STATUSES.contains(course.getStatus()) || course.getEscrowStatus() != null) {
            throw new ConflictException("Impossible d'annuler une course déjà payée (statut : " + course.getStatus()
                    + "). En cas de problème, ouvrez un litige.");
        }

        for (CourseOffer offer : offerRepository.findByCourseId(courseId)) {
            if ("ACTIVE".equals(offer.getStatus()) || "ACCEPTED".equals(offer.getStatus())) {
                offer.setStatus("REJECTED");
                offerRepository.save(offer);
            }
        }
        for (ChatRoom room : chatRoomRepository.findByCourseId(courseId)) {
            room.setIsArchived(true);
            chatRoomRepository.save(room);
        }
        course.setStatus("CANCELLED");
        courseRepository.save(course);
    }

    static final java.util.Set<String> CANCELLABLE_STATUSES = java.util.Set.of("PUBLISHED", "ASSIGNED");

    /**
     * Retourne le détail d'une course.
     * Accessible par :
     *  - le client propriétaire (clientId)
     *  - le coursier assigné (courierId)
     * Les coursiers non assignés peuvent lire les courses PUBLISHED via getPublishedCourses().
     */
    public CourseResponse getCourseById(Long courseId, Long requesterId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course non trouvée."));

        boolean isOwner   = course.getClientId().equals(requesterId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(requesterId);

        if (!isOwner && !isCourier) {
            throw new ForbiddenException("Vous n'avez pas accès à cette course.");
        }

        return withReviewDue(new java.util.ArrayList<>(List.of(
                toResponse(course, resolveChatRoomId(course), requesterId, namesOf(List.of(course))))), requesterId).get(0);
    }

    public List<CourseResponse> getMyMissions(Long courierId) {
        // 1. Courses où le coursier est assigné (courierId rempli)
        List<Course> assigned = courseRepository.findByCourierIdOrderByCreatedAtDesc(courierId);

        // 2. Courses où le coursier a une ChatRoom (offre faite, client pas encore payé)
        //    On inclut ces courses pour que le bouton Chat apparaisse dès l'envoi de l'offre
        //    TICK-069 : salons et courses chargés en lot (3 requêtes au total, plus de N+1)
        java.util.Set<Long> assignedIds = assigned.stream().map(Course::getId).collect(Collectors.toSet());
        List<ChatRoom> rooms = chatRoomRepository.findByCourierId(courierId);
        Map<Long, Long> roomIdByCourse = rooms.stream()
                .collect(Collectors.toMap(ChatRoom::getCourseId, ChatRoom::getId, (a, b) -> a));
        List<Long> chatOnlyIds = rooms.stream().map(ChatRoom::getCourseId)
                .filter(id -> !assignedIds.contains(id)).distinct().toList();
        List<Course> chatCourses = chatOnlyIds.isEmpty() ? List.of()
                : courseRepository.findAllById(chatOnlyIds).stream()
                        .sorted(java.util.Comparator.comparing(Course::getCreatedAt,
                                java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                        .toList();

        // 3. Fusionner les deux listes (assigned en premier)
        List<Course> all = new java.util.ArrayList<>();
        all.addAll(assigned);
        all.addAll(chatCourses);

        Map<Long, String> names = namesOf(all);
        return withReviewDue(all.stream()
                .map(course -> toResponse(course, roomIdByCourse.get(course.getId()), courierId, names))
                .collect(Collectors.toList()), courierId);
    }

    /**
     * Résout le chatRoomId pour une course côté client.
     * Si la course a un coursier assigné, on cherche la room correspondante.
     * Sinon, on cherche la première room disponible (cas course avec une seule offre).
     */
    private Long resolveChatRoomId(Course course) {
        return pickRoom(course, chatRoomRepository.findByCourseId(course.getId()));
    }

    /** Salon à afficher : celui du coursier assigné, sinon le premier ouvert (règle inchangée). */
    private static Long pickRoom(Course course, List<ChatRoom> rooms) {
        if (course.getCourierId() != null) {
            return rooms.stream().filter(r -> course.getCourierId().equals(r.getCourierId()))
                    .findFirst().map(ChatRoom::getId).orElse(null);
        }
        return rooms.stream().findFirst().map(ChatRoom::getId).orElse(null);
    }
}
