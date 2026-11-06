package com.confiancecoursier.backend.course.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Incident imputé à un coursier (TICK-065b) : NO_SHOW = course annulée pour non-livraison. */
@Entity
@Table(name = "courier_incidents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourierIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "courier_id", nullable = false)
    private Long courierId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "incident_type", nullable = false, length = 30)
    private String incidentType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
