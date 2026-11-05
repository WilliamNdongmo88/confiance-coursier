package com.confiancecoursier.backend.chat.api;

import com.confiancecoursier.backend.chat.api.dto.ChatMessageDto;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Map;

/**
 * Réception des messages STOMP sur {@code /app/chat.send} (TICK-055 + TICK-058).
 *
 * <p>Règles imposées par le serveur :
 * <ul>
 *   <li>l'expéditeur est <b>toujours</b> l'utilisateur authentifié (le {@code senderId} du payload est ignoré) ;</li>
 *   <li>seuls le client et le coursier du salon peuvent écrire (salon non archivé) ;</li>
 *   <li>types acceptés depuis le client : {@code TEXT} et {@code OFFER} — {@code SYSTEM} est réservé au serveur ;</li>
 *   <li>{@code OFFER} (TICK-058) : uniquement le coursier du salon, KYC APPROVED, montant entier XAF ≥ tarifMinimum
 *       (lu depuis {@code platform_settings}), course PUBLISHED — règles portées par {@link OfferService#submitOffer}.
 *       Le message enregistré porte {@code offerId}.</li>
 * </ul>
 * Tout refus est renvoyé à l'émetteur seul sur {@code /user/queue/errors}.
 */
@Controller
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    static final int MAX_CONTENT_LENGTH = 2000;

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatAccessService chatAccessService;
    private final OfferService offerService;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          SimpMessagingTemplate messagingTemplate,
                          ChatAccessService chatAccessService,
                          OfferService offerService) {
        this.chatMessageRepository = chatMessageRepository;
        this.messagingTemplate     = messagingTemplate;
        this.chatAccessService     = chatAccessService;
        this.offerService          = offerService;
    }

    @Transactional
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDto dto, Principal principal) {
        User sender = chatAccessService.findUser(principal == null ? null : principal.getName())
                .filter(User::isActive)
                .orElseThrow(() -> new ChatRejectedException("Session invalide. Reconnectez-vous."));

        ChatRoom room = chatAccessService.findRoom(dto.getRoomId())
                .orElseThrow(() -> new ChatRejectedException("Conversation introuvable."));

        if (!ChatAccessService.isParticipant(room, sender)) {
            log.warn("[CHAT] Envoi refusé : user={} n'est pas participant du salon {}", sender.getId(), room.getId());
            throw new ChatRejectedException("Vous ne participez pas à cette conversation.");
        }
        if (Boolean.TRUE.equals(room.getIsArchived())) {
            throw new ChatRejectedException("Cette conversation est archivée.");
        }

        String type    = dto.getMessageType() == null ? "TEXT" : dto.getMessageType().trim().toUpperCase();
        String content = dto.getContent() == null ? "" : dto.getContent().trim();
        BigDecimal offerAmount = null;
        Long offerId = null;

        switch (type) {
            case "TEXT" -> {
                if (content.isEmpty()) {
                    throw new ChatRejectedException("Le message est vide.");
                }
            }
            case "OFFER" -> {
                // ── Règles TICK-058 (portées par OfferService) ───────────────────
                if (!sender.getId().equals(room.getCourierId())) {
                    throw new ChatRejectedException("Seul le coursier peut proposer un tarif.");
                }
                CourseOffer offer;
                try {
                    // rôle COURIER + KYC APPROVED, course PUBLISHED sous verrou, entier XAF ≥ minimum,
                    // ancienne offre ACTIVE → SUPERSEDED
                    offer = offerService.submitOffer(room.getCourseId(), sender.getId(),
                            dto.getOfferAmount(), content);
                } catch (BusinessException | ForbiddenException | ConflictException e) {
                    throw new ChatRejectedException(e.getMessage());
                }
                offerAmount = offer.getAmount();
                offerId     = offer.getId();
            }
            default -> throw new ChatRejectedException("Type de message non autorisé.");
        }

        if (content.length() > MAX_CONTENT_LENGTH) {
            throw new ChatRejectedException("Message trop long (" + MAX_CONTENT_LENGTH + " caractères maximum).");
        }

        ChatMessage message = ChatMessage.builder()
                .roomId(room.getId())
                .senderId(sender.getId())          // jamais le senderId du payload
                .content(content)
                .messageType(type)
                .offerAmount(offerAmount)
                .offerId(offerId)
                .build();
        message = chatMessageRepository.save(message);

        // Enrichir le message diffusé avec l'offerId (utile au front pour "Accepter et payer")
        Map<String, Object> payload = buildPayload(message);
        messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), (Object) payload);
    }

    /** Renvoie le motif du refus à l'émetteur uniquement. */
    @MessageExceptionHandler(ChatRejectedException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, String> handleRejected(ChatRejectedException ex) {
        return Map.of("message", ex.getMessage());
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private Map<String, Object> buildPayload(ChatMessage msg) {
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id",          msg.getId());
        map.put("roomId",      msg.getRoomId());
        map.put("senderId",    msg.getSenderId());
        map.put("content",     msg.getContent());
        map.put("messageType", msg.getMessageType());
        map.put("createdAt",   msg.getCreatedAt());
        if (msg.getOfferAmount() != null) map.put("offerAmount", msg.getOfferAmount());
        if (msg.getOfferId() != null) {
            map.put("offerId",     msg.getOfferId());
            map.put("offerStatus", "ACTIVE"); // une offre qui vient d'être créée est toujours ACTIVE
        }
        return map;
    }

    /** Refus métier d'un message de chat (renvoyé sur /user/queue/errors). */
    public static class ChatRejectedException extends RuntimeException {
        public ChatRejectedException(String message) {
            super(message);
        }
    }
}
