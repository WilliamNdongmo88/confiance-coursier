package com.confiancecoursier.backend.review.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Avis laissé après la clôture d'une course.
 *
 * <p>Règles métier :
 * <ul>
 *   <li>Un seul avis par auteur par course (contrainte UNIQUE sur author_id + course_id dans V2)</li>
 *   <li>La course doit être en statut {@code COMPLETED}</li>
 *   <li>Le reviewerRole enregistre qui note qui : CLIENT note le COURIER, COURIER note le CLIENT</li>
 * </ul>
 */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant de la course notée. */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** Identifiant de l'utilisateur qui donne la note. */
    @Column(name = "author_id", nullable = false)
    private Long authorId;

    /** Identifiant de l'utilisateur qui reçoit la note. */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** {@code CLIENT} (note le coursier) ou {@code COURIER} (note le client). */
    @Column(name = "reviewer_role", nullable = false, length = 20)
    private String reviewerRole;

    /** Note de 1 à 5. */
    @Column(nullable = false)
    private Integer stars;

    /** Commentaire optionnel. */
    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
