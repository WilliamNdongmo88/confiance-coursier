package com.confiancecoursier.backend.payment.repository;

import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EscrowRepository extends JpaRepository<EscrowEntry, Long> {
}
