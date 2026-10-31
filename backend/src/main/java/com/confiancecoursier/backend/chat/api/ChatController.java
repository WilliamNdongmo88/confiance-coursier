package com.confiancecoursier.backend.chat.api;

import com.confiancecoursier.backend.chat.api.dto.ChatMessageDto;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDto dto) {
        // 1. Sauvegarde en base
        ChatMessage message = ChatMessage.builder()
                .roomId(dto.getRoomId())
                .senderId(dto.getSenderId())
                .content(dto.getContent())
                .build();
        message = chatMessageRepository.save(message);

        // 2. Diffuse à tous les abonnés au salon (/topic/chat/{roomId})
        messagingTemplate.convertAndSend("/topic/chat/" + dto.getRoomId(), message);
    }
}