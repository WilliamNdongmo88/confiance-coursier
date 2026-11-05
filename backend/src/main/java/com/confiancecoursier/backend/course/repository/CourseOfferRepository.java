package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.CourseOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseOfferRepository extends JpaRepository<CourseOffer, Long> {

    List<CourseOffer> findByCourseId(Long courseId);

    boolean existsByCourseIdAndCourierId(Long courseId, Long courierId);

    /** Offre actuellement ACTIVE du coursier sur cette course (au plus une). */
    Optional<CourseOffer> findByCourseIdAndCourierIdAndStatus(Long courseId, Long courierId, String status);

    /** Toutes les offres ACTIVE d'une course (pour le dashboard client). */
    List<CourseOffer> findByCourseIdAndStatus(Long courseId, String status);
}
