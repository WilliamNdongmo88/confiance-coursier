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
    /**
     * TICK-065 : ids des courses dont le délai de validation est écoulé
     * ({@code status = PROOFS_SUBMITTED AND auto_validate_at <= now}). Les courses DISPUTED sont exclues par le statut.
     */
    @Query("SELECT c.id FROM Course c WHERE c.status = 'PROOFS_SUBMITTED' " +
           "AND c.autoValidateAt IS NOT NULL AND c.autoValidateAt <= :now ORDER BY c.autoValidateAt")
    List<Long> findIdsDueForAutoValidation(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);

    /** TICK-065b : courses payées dont l'échéance de preuves approche et sans rappel envoyé. */
    @Query("SELECT c.id FROM Course c WHERE c.status = 'IN_PROGRESS' AND c.proofReminderSentAt IS NULL " +
           "AND c.proofDeadline > :now AND c.proofDeadline <= :limit")
    List<Long> findIdsForProofReminder(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
                                       @org.springframework.data.repository.query.Param("limit") java.time.LocalDateTime limit);

    /** TICK-065b : courses payées dont l'échéance de preuves est dépassée sans soumission. */
    @Query("SELECT c.id FROM Course c WHERE c.status = 'IN_PROGRESS' AND c.proofDeadline <= :now")
    List<Long> findIdsPastProofDeadline(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);

    /** TICK-065b : courses OVERDUE depuis au moins le délai de grâce, sans décision du client. */
    @Query("SELECT c.id FROM Course c WHERE c.status = 'OVERDUE' AND c.overdueSince <= :before")
    List<Long> findIdsOverdueBefore(@org.springframework.data.repository.query.Param("before") java.time.LocalDateTime before);

    /**
     * TICK-073 : courses terminées que l'utilisateur (client ou coursier) n'a pas encore notées,
     * la plus ancienne d'abord.
     */
    @Query("SELECT c FROM Course c WHERE c.status = 'COMPLETED' " +
           "AND (c.clientId = :userId OR c.courierId = :userId) " +
           "AND NOT EXISTS (SELECT 1 FROM Review r WHERE r.courseId = c.id AND r.authorId = :userId) " +
           "ORDER BY c.completedAt ASC")
    List<Course> findCompletedAwaitingReviewBy(@org.springframework.data.repository.query.Param("userId") Long userId);

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
