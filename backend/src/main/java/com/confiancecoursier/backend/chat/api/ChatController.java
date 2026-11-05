package com.confiancecoursier.backend.chat.api;

import com.confiancecoursier.backend.admin.service.CommissionService;
import com.confiancecoursier.backend.chat.api.dto.ChatMessageDto;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
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
import java.math.RoundingMode;
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
 *   <li>{@code OFFER} (TICK-058) : uniquement le coursier du salon, montant entier XAF ≥ tarifMinimum (lu depuis
 *       {@code platform_settings}), course PUBLISHED. L'ancienne offre ACTIVE est marquée SUPERSEDED avant
 *       d'en créer une nouvelle. Le message retourné inclut {@code offerId}.</li>
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
    private final CourseOfferRepository offerRepository;
    private final CommissionService commissionService;

    public ChatController(ChatMessageRepository chatMessageRepository,
                          SimpMessagingTemplate messagingTemplate,
                          ChatAccessService chatAccessService,
                          CourseOfferRepository offerRepository,
                          CommissionService commissionService) {
        this.chatMessageRepository = chatMessageRepository;
        this.messagingTemplate     = messagingTemplate;
        this.chatAccessService     = chatAccessService;
        this.offerRepository       = offerRepository;
        this.commissionService     = commissionService;
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
                // ── Règles TICK-058 ────────────────────────────────────────────
                if (!sender.getId().equals(room.getCourierId())) {
                    throw new ChatRejectedException("Seul le coursier peut proposer un tarif.");
                }
                if (dto.getOfferAmount() == null || dto.getOfferAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ChatRejectedException("Montant de l'offre invalide.");
                }

                // Arrondi XAF entier
                BigDecimal rounded = dto.getOfferAmount().setScale(0, RoundingMode.HALF_UP);

                // Tarif minimum depuis platform_settings (jamais codé en dur)
                BigDecimal tarifMin = commissionService.getCommissionSettings().getTarifMinimumCoursier();
                if (rounded.compareTo(tarifMin) < 0) {
                    throw new ChatRejectedException(
                            "Le montant minimum est de " + tarifMin.toPlainString() + " XAF.");
                }

                // Vérifier que la course est encore PUBLISHED
                chatAccessService.findCourse(room.getCourseId())
                        .filter(c -> "PUBLISHED".equals(c.getStatus()))
                        .orElseThrow(() -> new ChatRejectedException(
                                "Cette course n'accepte plus d'offres."));

                // Marquer l'offre ACTIVE précédente comme SUPERSEDED
                offerRepository.findByCourseIdAndCourierIdAndStatus(
                        room.getCourseId(), sender.getId(), "ACTIVE")
                        .ifPresent(prev -> {
                            prev.setStatus("SUPERSEDED");
                            offerRepository.save(prev);
                        });

                // Créer la nouvelle offre ACTIVE
                CourseOffer newOffer = CourseOffer.builder()
                        .courseId(room.getCourseId())
                        .courierId(sender.getId())
                        .amount(rounded)
                        .details(content.isEmpty() ? null : content)
                        .status("ACTIVE")
                        .build();
                newOffer = offerRepository.save(newOffer);

                offerAmount = rounded;
                offerId     = newOffer.getId();
                // Le content du message = description optionnelle ou vide
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
                .build();
        message = chatMessageRepository.save(message);

        // Enrichir le message diffusé avec l'offerId (utile au front pour "Accepter et payer")
        Map<String, Object> payload = buildPayload(message, offerId);
        messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), (Object) payload);
    }

    /** Renvoie le motif du refus à l'émetteur uniquement. */
    @MessageExceptionHandler(ChatRejectedException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, String> handleRejected(ChatRejectedException ex) {
        return Map.of("message", ex.getMessage());
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private Map<String, Object> buildPayload(ChatMessage msg, Long offerId) {
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id",          msg.getId());
        map.put("roomId",      msg.getRoomId());
        map.put("senderId",    msg.getSenderId());
        map.put("content",     msg.getContent());
        map.put("messageType", msg.getMessageType());
        map.put("createdAt",   msg.getCreatedAt());
        if (msg.getOfferAmount() != null) map.put("offerAmount", msg.getOfferAmount());
        if (offerId != null)              map.put("offerId",      offerId);
        return map;
    }

    /** Refus métier d'un message de chat (renvoyé sur /user/queue/errors). */
    public static class ChatRejectedException extends RuntimeException {
        public ChatRejectedException(String message) {
            super(message);
        }
    }
}
