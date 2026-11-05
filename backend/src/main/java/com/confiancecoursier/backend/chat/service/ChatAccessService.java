package com.confiancecoursier.backend.chat.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Règles d'accès aux salons de chat (TICK-055).
 */
@Service
public class ChatAccessService {

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    public ChatAccessService(ChatRoomRepository chatRoomRepository,
                             UserRepository userRepository,
                             CourseRepository courseRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository     = userRepository;
        this.courseRepository   = courseRepository;
    }

    public Optional<User> findUser(String email) {
        return email == null ? Optional.empty() : userRepository.findByEmail(email);
    }

    public Optional<ChatRoom> findRoom(Long roomId) {
        return roomId == null ? Optional.empty() : chatRoomRepository.findById(roomId);
    }

    /** Récupère la course associée à un salon — utilisé par TICK-058 pour vérifier le statut. */
    public Optional<Course> findCourse(Long courseId) {
        return courseId == null ? Optional.empty() : courseRepository.findById(courseId);
    }

    public static boolean isParticipant(ChatRoom room, User user) {
        return user.getId().equals(room.getClientId()) || user.getId().equals(room.getCourierId());
    }

    /** L'utilisateur (email) peut-il écouter ce salon ? */
    public boolean canRead(Long roomId, String email) {
        Optional<User> user = findUser(email);
        Optional<ChatRoom> room = findRoom(roomId);
        if (user.isEmpty() || room.isEmpty() || !user.get().isActive()) {
            return false;
        }
        return isParticipant(room.get(), user.get()) || "ADMIN".equalsIgnoreCase(user.get().getRole());
    }
}
