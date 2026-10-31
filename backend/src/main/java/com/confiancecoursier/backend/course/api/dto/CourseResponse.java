package com.confiancecoursier.backend.course.api.dto;

import com.confiancecoursier.backend.course.domain.Course;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CourseResponse {
    private Long id;
    private Long clientId;
    private Long courierId;
    private String description;
    private String zone;
    private String status;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;

    public static CourseResponse fromEntity(Course course) {
        CourseResponse dto = new CourseResponse();
        dto.setId(course.getId());
        dto.setClientId(course.getClientId());
        dto.setCourierId(course.getCourierId());
        dto.setDescription(course.getDescription());
        dto.setZone(course.getZone());
        dto.setStatus(course.getStatus());
        dto.setScheduledAt(course.getScheduledAt());
        dto.setCreatedAt(course.getCreatedAt());
        return dto;
    }
}