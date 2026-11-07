package com.confiancecoursier.backend.chat.repository;

import com.confiancecoursier.backend.chat.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);

    /** Messages non lus par {@code userId} (envoyés par l'autre partie), par salon : [roomId, nombre]. */
    @org.springframework.data.jpa.repository.Query(
        "select m.roomId, count(m) from ChatMessage m "
        + "where m.roomId in :roomIds and m.senderId <> :userId and m.isRead = false group by m.roomId")
    List<Object[]> countUnreadByRoom(
        @org.springframework.data.repository.query.Param("roomIds") java.util.Collection<Long> roomIds,
        @org.springframework.data.repository.query.Param("userId") Long userId);

    /** Marque comme lus les messages reçus par {@code userId} dans un salon. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
        "update ChatMessage m set m.isRead = true "
        + "where m.roomId = :roomId and m.senderId <> :userId and m.isRead = false")
    int markRead(@org.springframework.data.repository.query.Param("roomId") Long roomId,
                 @org.springframework.data.repository.query.Param("userId") Long userId);

    /** Messages envoyés par d'autres que le client dans les salons d'une course (premier message ?). */
    long countByRoomIdInAndSenderIdNot(java.util.Collection<Long> roomIds, Long senderId);
}