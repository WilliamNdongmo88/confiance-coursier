package com.confiancecoursier.backend.kyc.repository;

import com.confiancecoursier.backend.kyc.domain.KycSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KycRepository extends JpaRepository<KycSubmission, Long> {

    /** Toutes les soumissions d'un utilisateur */
    List<KycSubmission> findByUserId(Long userId);

    /** Dernière soumission d'un utilisateur */
    Optional<KycSubmission> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    /** Toutes les soumissions par statut (usage admin) */
    List<KycSubmission> findByStatus(String status);
}
