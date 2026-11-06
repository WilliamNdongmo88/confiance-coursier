package com.confiancecoursier.backend.review.repository;

import com.confiancecoursier.backend.review.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** Tous les avis pour une course (max 2 : un par parti). */
    List<Review> findByCourseId(Long courseId);

    /** Tous les avis reçus par un utilisateur (pour calculer la moyenne). */
    List<Review> findByTargetId(Long targetId);

    /** Vérifie si l'auteur a déjà noté cette course. */
    Optional<Review> findByCourseIdAndAuthorId(Long courseId, Long authorId);

    /** Nombre d'avis reçus par un utilisateur (pour la moyenne glissante). */
    long countByTargetId(Long targetId);

    /** TICK-073 : parmi ces courses, celles que l'auteur a déjà notées (une requête pour une liste). */
    @org.springframework.data.jpa.repository.Query(
            "SELECT r.courseId FROM Review r WHERE r.authorId = :authorId AND r.courseId IN :courseIds")
    List<Long> findReviewedCourseIds(@org.springframework.data.repository.query.Param("authorId") Long authorId,
                                     @org.springframework.data.repository.query.Param("courseIds") java.util.Collection<Long> courseIds);
}
