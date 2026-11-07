package com.confiancecoursier.backend.chat.api.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO WebSocket STOMP envoyé par le client Angular vers /app/chat.send.
 *
 * messageType : TEXT (défaut) | OFFER  — SYSTEM est réservé au serveur (TICK-055)
 * senderId    : IGNORÉ par le serveur (l'expéditeur est le Principal STOMP) — conservé pour compatibilité
 * offerAmount : non null uniquement pour les messages de type OFFER
 */
@Data
public class ChatMessageDto {
    private Long roomId;
    private Long senderId;
    private String content;
    private String messageType = "TEXT";
    private BigDecimal offerAmount;
    /** Identifiant temporaire choisi par l'émetteur, renvoyé dans la diffusion pour remplacer le message
     *  affiché immédiatement (« envoi… ») par le message enregistré. Jamais stocké. */
    private String clientRef;
}
