package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    // Pour l'instant, on récupère toutes les courses publiées pour les coursiers
    List<Course> findByStatus(String status);
}