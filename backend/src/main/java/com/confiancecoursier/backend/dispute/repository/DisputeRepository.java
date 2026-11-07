package com.confiancecoursier.backend.dispute.repository;

import com.confiancecoursier.backend.dispute.domain.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, Long> {
    List<Dispute>     findByCourseId(Long courseId);
    List<Dispute>     findByStatus(String status);
    Optional<Dispute> findByCourseIdAndStatus(Long courseId, String status);

    /** Litiges ouverts par ce compte (résumé admin). */
    long countByOpenedBy(Long openedBy);

    /**
     * Litiges des courses où ce compte est le client ou le coursier, quel que soit celui qui les a ouverts
     * (fiche admin d'un utilisateur). Les plus récents d'abord.
     */
    @Query("SELECT d FROM Dispute d WHERE d.courseId IN "
         + "(SELECT c.id FROM Course c WHERE c.clientId = :userId OR c.courierId = :userId) "
         + "ORDER BY d.createdAt DESC")
    List<Dispute> findInvolvingUser(@Param("userId") Long userId);
}
