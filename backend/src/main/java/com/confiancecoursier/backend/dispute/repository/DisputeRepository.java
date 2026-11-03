package com.confiancecoursier.backend.dispute.repository;

import com.confiancecoursier.backend.dispute.domain.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, Long> {
    List<Dispute>     findByCourseId(Long courseId);
    List<Dispute>     findByStatus(String status);
    Optional<Dispute> findByCourseIdAndStatus(Long courseId, String status);
}
