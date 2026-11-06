package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.CourierIncident;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface CourierIncidentRepository extends JpaRepository<CourierIncident, Long> {

    long countByCourierIdAndIncidentTypeAndCreatedAtAfter(Long courierId, String incidentType, LocalDateTime since);

    boolean existsByCourseIdAndIncidentType(Long courseId, String incidentType);
}
