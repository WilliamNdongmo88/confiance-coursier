package com.confiancecoursier.backend.chat.api;

import com.confiancecoursier.backend.chat.api.dto.ChatMessageDto;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;

@Controller
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Reçoit un message STOMP sur /app/chat.send, le persiste et le diffuse.
     *
     * Types acceptés :
     *   TEXT  — message texte classique
     *   OFFER — carte d'offre du coursier (offerAmount obligatoire)
     *   SYSTEM — message système (ex : "offre acceptée")
     *
     * Validation OFFER : offerAmount doit être > 0.
     * Les messages invalides sont ignorés (pas de diffusion).
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDto dto) {
        String type = dto.getMessageType() == null ? "TEXT" : dto.getMessageType().toUpperCase();

        // Validation pour les messages de type OFFER
        if ("OFFER".equals(type)) {
            if (dto.getOfferAmount() == null || dto.getOfferAmount().compareTo(BigDecimal.ZERO) <= 0) {
                // Offre invalide — on ignore silencieusement
                return;
            }
        }

        // Persiste le message
        ChatMessage message = ChatMessage.builder()
                .roomId(dto.getRoomId())
                .senderId(dto.getSenderId())
                .content(dto.getContent())
                .messageType(type)
                .offerAmount("OFFER".equals(type) ? dto.getOfferAmount() : null)
                .build();
        message = chatMessageRepository.save(message);

        // Diffuse à tous les abonnés du salon
        messagingTemplate.convertAndSend("/topic/chat/" + dto.getRoomId(), message);
    }
}
