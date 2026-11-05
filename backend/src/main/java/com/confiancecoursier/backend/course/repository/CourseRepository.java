package com.confiancecoursier.backend.course.repository;

import com.confiancecoursier.backend.course.domain.Course;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

    /**
     * Charge une course avec un verrou pessimiste (SELECT … FOR UPDATE).
     * Utilisé par PaymentService pour éviter le double paiement concurrent.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Course c WHERE c.id = :id")
    Optional<Course> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    // Récupère toutes les courses avec un statut donné (ex: PUBLISHED)
    List<Course> findByStatusOrderByCreatedAtDesc(String status);

    // Récupère toutes les courses d'un client
    List<Course> findByClientIdOrderByCreatedAtDesc(Long clientId);

    // Récupère toutes les missions d'un coursier
    List<Course> findByCourierIdOrderByCreatedAtDesc(Long courierId);

    /** Nombre de courses dans un statut donné. */
    long countByStatus(String status);

    /** Détail des 50 dernières courses clôturées (les gains sont lus depuis le ledger — TICK-061). */
    List<Course> findTop50ByStatusInAndPlatformFeeAmountIsNotNullOrderByCompletedAtDesc(java.util.Collection<String> statuses);
}
