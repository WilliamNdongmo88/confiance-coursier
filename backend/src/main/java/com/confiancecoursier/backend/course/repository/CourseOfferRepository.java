package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.CourseOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseOfferRepository extends JpaRepository<CourseOffer, Long> {
    List<CourseOffer> findByCourseId(Long courseId);
    boolean existsByCourseIdAndCourierId(Long courseId, Long courierId);
}