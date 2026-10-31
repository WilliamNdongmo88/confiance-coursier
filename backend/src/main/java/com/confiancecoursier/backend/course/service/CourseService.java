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

    public List<CourseResponse> getPublishedCourses() {
        return courseRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED")
                .stream()
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

    public CourseResponse getCourseById(Long courseId, Long clientId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Vous n'êtes pas le propriétaire de cette course.");
        }

        return CourseResponse.fromEntity(course, resolveChatRoomId(course));
    }

    public List<CourseResponse> getMyMissions(Long courierId) {
        return courseRepository.findByCourierIdOrderByCreatedAtDesc(courierId)
                .stream()
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
        return chatRoomRepository
                .findByCourseId(course.getId())
                .map(r -> r.getId())
                .orElse(null);
    }
}