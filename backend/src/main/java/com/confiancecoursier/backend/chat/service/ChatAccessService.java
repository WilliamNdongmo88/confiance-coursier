package com.confiancecoursier.backend.chat.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Règles d'accès aux salons de chat (TICK-055).
 * <ul>
 *   <li><b>Lecture</b> (abonnement temps réel) : client ou coursier du salon, ou ADMIN (spec : chat lisible par l'admin).</li>
 *   <li><b>Écriture</b> : uniquement le client ou le coursier du salon, compte ACTIVE, salon non archivé.</li>
 * </ul>
 */
@Service
public class ChatAccessService {

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    public ChatAccessService(ChatRoomRepository chatRoomRepository, UserRepository userRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
    }

    public Optional<User> findUser(String email) {
        return email == null ? Optional.empty() : userRepository.findByEmail(email);
    }

    public Optional<ChatRoom> findRoom(Long roomId) {
        return roomId == null ? Optional.empty() : chatRoomRepository.findById(roomId);
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
