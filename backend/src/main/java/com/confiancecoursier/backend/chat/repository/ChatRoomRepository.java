package com.confiancecoursier.backend.chat.repository;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByCourseIdAndCourierId(Long courseId, Long courierId);
    // Retourne toutes les rooms d'une course (une par coursier ayant soumis une offre)
    List<ChatRoom> findByCourseId(Long courseId);

    /** TICK-069 : salons de plusieurs courses en une requête (évite le N+1 des listes). */
    List<ChatRoom> findByCourseIdIn(java.util.Collection<Long> courseIds);
    // Toutes les rooms d'un coursier (pour récupérer ses offres en cours)
    List<ChatRoom> findByCourierId(Long courierId);

    /** Salons d'un client (pastilles de messages non lus). */
    List<ChatRoom> findByClientId(Long clientId);
}