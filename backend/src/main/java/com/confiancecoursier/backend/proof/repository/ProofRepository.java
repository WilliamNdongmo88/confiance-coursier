package com.confiancecoursier.backend.proof.repository;

import com.confiancecoursier.backend.proof.domain.Proof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProofRepository extends JpaRepository<Proof, Long> {

    /** Toutes les preuves d'une course, dans l'ordre d'upload (la plus ancienne en premier). */
    List<Proof> findByCourseIdOrderByUploadedAtAsc(Long courseId);

    /**
     * Recherche une preuve par son hash SHA-256 pour une course donnée.
     * Utilisé pour la détection de doublons.
     */
    Optional<Proof> findByCourseIdAndFileHash(Long courseId, String fileHash);

    /** Nombre de preuves déjà soumises pour une course (limite = 10). */
    long countByCourseId(Long courseId);
}
