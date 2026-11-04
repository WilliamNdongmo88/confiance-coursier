package com.confiancecoursier.backend.chat.api;

import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    public ChatRestController(ChatMessageRepository chatMessageRepository,
                              ChatRoomRepository chatRoomRepository,
                              UserRepository userRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatRoomRepository    = chatRoomRepository;
        this.userRepository        = userRepository;
    }

    /**
     * GET /api/chat/rooms/{roomId}/messages
     * Historique des messages d'une salle.
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable Long roomId) {
        return ResponseEntity.ok(chatMessageRepository.findByRoomIdOrderByCreatedAtAsc(roomId));
    }

    /**
     * GET /api/chat/rooms/{roomId}
     * Infos de la salle : courseId, clientId/Name, courierId/Name.
     * Utilisé par le frontend pour afficher le nom du correspondant.
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(@PathVariable Long roomId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException("Salle de chat introuvable."));

        String clientName  = resolveName(room.getClientId());
        String courierName = resolveName(room.getCourierId());

        return ResponseEntity.ok(Map.of(
                "roomId",      room.getId(),
                "courseId",    room.getCourseId(),
                "clientId",    room.getClientId(),
                "clientName",  clientName,
                "courierId",   room.getCourierId(),
                "courierName", courierName
        ));
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private String resolveName(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getFullName() != null && !u.getFullName().isBlank()
                        ? u.getFullName()
                        : u.getEmail())
                .orElse("Utilisateur #" + userId);
    }
}