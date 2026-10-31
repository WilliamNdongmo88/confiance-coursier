package com.confiancecoursier.backend.course.service;

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

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public CourseResponse createCourse(Long clientId, CreateCourseRequest request) {
        Course course = Course.builder()
                .clientId(clientId)
                .description(request.getDescription())
                .zone(request.getZone())
                .scheduledAt(request.getScheduledAt())
                .status("PUBLISHED") // La course est publiée directement
                .build();

        Course savedCourse = courseRepository.save(course);
        return CourseResponse.fromEntity(savedCourse);
    }

    public List<CourseResponse> getMyCourses(Long clientId) {
        // On récupère les courses du client (tous statuts confondus)
        return courseRepository.findAll().stream()
                .filter(c -> c.getClientId().equals(clientId))
                .map(CourseResponse::fromEntity)
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
        return CourseResponse.fromEntity(updated);
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

        return CourseResponse.fromEntity(course);
    }

    public List<CourseResponse> getMyMissions(Long courierId) {
        return courseRepository.findAll().stream()
                .filter(c -> c.getCourierId() != null && c.getCourierId().equals(courierId))
                .map(CourseResponse::fromEntity)
                .collect(Collectors.toList());
    }
}