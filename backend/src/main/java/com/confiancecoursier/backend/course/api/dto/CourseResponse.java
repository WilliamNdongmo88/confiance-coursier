package com.confiancecoursier.backend.course.api.dto;

import com.confiancecoursier.backend.course.domain.Course;
import lombok.Data;

import java.math.BigDecimal;
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
    private BigDecimal courseAmount;
    private BigDecimal totalAmount;
    /** Frais réels (achats) payés par le client : un reçu devient obligatoire dans les preuves s'ils sont > 0 (TICK-064). */
    private BigDecimal realCosts;
    private String currency;
    private Long acceptedOfferId;
    /** Identifiant du salon de chat associé à cette course (nullable si aucune offre encore) */
    private Long chatRoomId;

    /** Mapping de base sans chatRoomId (utilisé dans les contextes sans accès au repo) */
    public static CourseResponse fromEntity(Course course) {
        return fromEntity(course, null);
    }

    /** Mapping complet avec chatRoomId */
    public static CourseResponse fromEntity(Course course, Long chatRoomId) {
        CourseResponse dto = new CourseResponse();
        dto.setId(course.getId());
        dto.setClientId(course.getClientId());
        dto.setCourierId(course.getCourierId());
        dto.setDescription(course.getDescription());
        dto.setZone(course.getZone());
        dto.setStatus(course.getStatus());
        dto.setScheduledAt(course.getScheduledAt());
        dto.setCreatedAt(course.getCreatedAt());
        dto.setCourseAmount(course.getCourseAmount());
        dto.setTotalAmount(course.getTotalAmount());
        dto.setRealCosts(course.getRealCosts());
        dto.setCurrency(course.getCurrency());
        dto.setAcceptedOfferId(course.getAcceptedOfferId());
        dto.setChatRoomId(chatRoomId);
        return dto;
    }
}