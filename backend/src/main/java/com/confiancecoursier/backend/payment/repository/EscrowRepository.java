package com.confiancecoursier.backend.payment.repository;

import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EscrowRepository extends JpaRepository<EscrowEntry, Long> {

    /** Toutes les entrées d'une course (HOLD → RELEASE → ...) */
    List<EscrowEntry> findByCourseId(Long courseId);

    /** Idempotence : vérifie si un HOLD existe déjà pour cette clé. */
    Optional<EscrowEntry> findByIdempotencyKey(String idempotencyKey);
}
