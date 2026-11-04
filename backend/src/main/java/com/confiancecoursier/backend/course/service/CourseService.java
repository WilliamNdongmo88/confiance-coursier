package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.api.dto.CreateCourseRequest;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final ChatRoomRepository chatRoomRepository;

    public CourseService(CourseRepository courseRepository, ChatRoomRepository chatRoomRepository) {
        this.courseRepository = courseRepository;
        this.chatRoomRepository = chatRoomRepository;
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

    public List<CourseResponse> getMyCourses(Long clientId) {
        return courseRepository.findByClientIdOrderByCreatedAtDesc(clientId)
                .stream()
                .map(course -> {
                    Long chatRoomId = resolveChatRoomId(course);
                    return CourseResponse.fromEntity(course, chatRoomId);
                })
                .collect(Collectors.toList());
    }

    public List<CourseResponse> getPublishedCourses(Long courierId) {
        // Récupérer les IDs des courses où ce coursier a déjà une ChatRoom (offre déjà faite)
        List<Long> alreadyEngagedCourseIds = chatRoomRepository.findByCourierId(courierId)
                .stream()
                .map(room -> room.getCourseId())
                .toList();

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
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Vous n'êtes pas le propriétaire de cette course.");
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

    @Transactional
    public void deleteCourse(Long courseId, Long clientId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Vous n'êtes pas le propriétaire de cette course.");
        }

        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new BusinessException("Impossible de supprimer une course qui n'est plus au statut PUBLISHED.");
        }

        courseRepository.delete(course);
    }

    /**
     * Retourne le détail d'une course.
     * Accessible par :
     *  - le client propriétaire (clientId)
     *  - le coursier assigné (courierId)
     * Les coursiers non assignés peuvent lire les courses PUBLISHED via getPublishedCourses().
     */
    public CourseResponse getCourseById(Long courseId, Long requesterId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        boolean isOwner   = course.getClientId().equals(requesterId);
        boolean isCourier = course.getCourierId() != null && course.getCourierId().equals(requesterId);

        if (!isOwner && !isCourier) {
            throw new BusinessException("Vous n'avez pas accès à cette course.");
        }

        return CourseResponse.fromEntity(course, resolveChatRoomId(course));
    }

    public List<CourseResponse> getMyMissions(Long courierId) {
        // 1. Courses où le coursier est assigné (courierId rempli)
        List<Course> assigned = courseRepository.findByCourierIdOrderByCreatedAtDesc(courierId);

        // 2. Courses où le coursier a une ChatRoom (offre faite, client pas encore payé)
        //    On inclut ces courses pour que le bouton Chat apparaisse dès l'envoi de l'offre
        List<Long> assignedIds = assigned.stream().map(Course::getId).toList();
        List<Course> chatCourses = chatRoomRepository.findByCourierId(courierId)
                .stream()
                .map(room -> courseRepository.findById(room.getCourseId()).orElse(null))
                .filter(c -> c != null && !assignedIds.contains(c.getId()))
                .toList();

        // 3. Fusionner les deux listes (assigned en premier)
        List<Course> all = new java.util.ArrayList<>();
        all.addAll(assigned);
        all.addAll(chatCourses);

        return all.stream()
                .map(course -> {
                    Long chatRoomId = chatRoomRepository
                            .findByCourseIdAndCourierId(course.getId(), courierId)
                            .map(r -> r.getId())
                            .orElse(null);
                    return CourseResponse.fromEntity(course, chatRoomId);
                })
                .collect(Collectors.toList());
    }

    /**
     * Résout le chatRoomId pour une course côté client.
     * Si la course a un coursier assigné, on cherche la room correspondante.
     * Sinon, on cherche la première room disponible (cas course avec une seule offre).
     */
    private Long resolveChatRoomId(Course course) {
        if (course.getCourierId() != null) {
            return chatRoomRepository
                    .findByCourseIdAndCourierId(course.getId(), course.getCourierId())
                    .map(r -> r.getId())
                    .orElse(null);
        }
        // Pas encore de coursier assigné : on prend la première room disponible (s'il y en a une)
        return chatRoomRepository
                .findByCourseId(course.getId())
                .stream()
                .findFirst()
                .map(r -> r.getId())
                .orElse(null);
    }
}