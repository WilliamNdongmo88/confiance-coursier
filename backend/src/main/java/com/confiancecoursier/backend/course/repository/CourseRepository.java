package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    // Récupère toutes les courses avec un statut donné (ex: PUBLISHED)
    List<Course> findByStatusOrderByCreatedAtDesc(String status);

    // Récupère toutes les courses d'un client
    List<Course> findByClientIdOrderByCreatedAtDesc(Long clientId);
}