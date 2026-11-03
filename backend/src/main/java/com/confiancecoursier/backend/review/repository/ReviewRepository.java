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
}
