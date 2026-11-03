package com.confiancecoursier.backend.user.repository;

import com.confiancecoursier.backend.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Tous les coursiers actifs — filtrés par rôle et statut. */
    List<User> findByRoleAndStatusOrderByTrustScoreDesc(String role, String status);

    /** Tous les utilisateurs par rôle (admin). */
    List<User> findByRole(String role);

    /** Tous les utilisateurs par statut (admin). */
    List<User> findByStatus(String status);

    /** Utilisateurs par rôle et statut (admin). */
    List<User> findByRoleAndStatus(String role, String status);
}