package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
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

    public CourseService(CourseRepository courseRepository, ChatRoomRepository chatRoomRepository,
                         CourseOfferRepository offerRepository) {
        this.courseRepository = courseRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.offerRepository = offerRepository;
    }

    public CourseResponse createCourse(Long clientId, CreateCourseRequest request) {
        Course course = Course.builder()
                .clientId(clientId)
                .description(request.getDescription())
                .zone(request.getZone())
                .scheduledAt(request.getScheduledAt())
                .status("PUBLISHED")
                .build();

        Course savedCourse = courseRepository.save(course);
        return CourseResponse.fromEntity(savedCourse);
    }

    /** TICK-069 : 2 requêtes au total (courses, puis tous leurs salons) au lieu d'une par course. */
    public List<CourseResponse> getMyCourses(Long clientId) {
        List<Course> courses = courseRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        if (courses.isEmpty()) return List.of();

        Map<Long, List<ChatRoom>> roomsByCourse = chatRoomRepository
                .findByCourseIdIn(courses.stream().map(Course::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(ChatRoom::getCourseId));

        return courses.stream()
                .map(course -> CourseResponse.fromEntity(course,
                        pickRoom(course, roomsByCourse.getOrDefault(course.getId(), List.of()))))
                .collect(Collectors.toList());
    }

    public List<CourseResponse> getPublishedCourses(Long courierId) {
        // Récupérer les IDs des courses où ce coursier a déjà une ChatRoom (offre déjà faite)
        java.util.Set<Long> alreadyEngagedCourseIds = chatRoomRepository.findByCourierId(courierId)
                .stream()
                .map(ChatRoom::getCourseId)
                .collect(Collectors.toSet());

        return courseRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED")
                .stream()
                // Exclure les courses où le coursier est déjà engagé
                .filter(course -> !alreadyEngagedCourseIds.contains(course.getId()))
                .map(CourseResponse::fromEntity)
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
        return CourseResponse.fromEntity(updated, resolveChatRoomId(updated));
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

        return CourseResponse.fromEntity(course, resolveChatRoomId(course));
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

        return all.stream()
                .map(course -> CourseResponse.fromEntity(course, roomIdByCourse.get(course.getId())))
                .collect(Collectors.toList());
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
