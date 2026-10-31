package com.confiancecoursier.backend.chat.repository;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByCourseIdAndCourierId(Long courseId, Long courierId);
    Optional<ChatRoom> findByCourseId(Long courseId);
}