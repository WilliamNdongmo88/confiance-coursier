package com.confiancecoursier.backend.chat.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_key")
    private String fileKey;

    @Column(name = "attachment_type")
    private String attachmentType;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "message_type", nullable = false)
    private String messageType = "TEXT"; // TEXT | OFFER | SYSTEM

    @Column(name = "offer_amount", precision = 12, scale = 2)
    private java.math.BigDecimal offerAmount;

    /** CourseOffer associée à un message OFFER (TICK-058) — permet d'accepter l'offre après rechargement. */
    @Column(name = "offer_id")
    private Long offerId;

    /**
     * Statut courant de l'offre (ACTIVE | SUPERSEDED | ACCEPTED | REJECTED), renseigné à la lecture
     * de l'historique et à la diffusion. Non persisté : la source de vérité est {@code course_offers}.
     */
    @Transient
    private String offerStatus;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}