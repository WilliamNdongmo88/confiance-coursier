package com.confiancecoursier.backend.chat.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * API REST du chat.
 *
 * <p>TICK-056 : contrôle de participation sur chaque endpoint.
 * <ul>
 *   <li>GET /rooms/{id}/messages — participant (client ou coursier) ou ADMIN uniquement.</li>
 *   <li>GET /rooms/{id}          — idem ; le nom retourné est le fullName (jamais l'email).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatAccessService chatAccessService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseOfferRepository offerRepository;

    public ChatRestController(ChatMessageRepository chatMessageRepository,
                              ChatAccessService chatAccessService,
                              UserRepository userRepository,
                              CourseRepository courseRepository,
                              CourseOfferRepository offerRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatAccessService     = chatAccessService;
        this.userRepository        = userRepository;
        this.courseRepository      = courseRepository;
        this.offerRepository       = offerRepository;
    }

    /**
     * GET /api/chat/rooms/{roomId}/messages
     * Historique des messages. Réservé aux participants et aux admins (TICK-056).
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable Long roomId,
                                                         Principal principal) {
        requireParticipant(roomId, principal);
        List<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderByCreatedAtAsc(roomId);

        // Statut courant de chaque offre (TICK-059) : seule l'offre ACTIVE d'une course PUBLISHED est acceptable
        List<Long> offerIds = messages.stream().map(ChatMessage::getOfferId).filter(Objects::nonNull).toList();
        if (!offerIds.isEmpty()) {
            Map<Long, String> statusById = offerRepository.findAllById(offerIds).stream()
                    .collect(Collectors.toMap(CourseOffer::getId, CourseOffer::getStatus));
            messages.forEach(m -> {
                if (m.getOfferId() != null) m.setOfferStatus(statusById.get(m.getOfferId()));
            });
        }
        return ResponseEntity.ok(messages);
    }

    /**
     * GET /api/chat/rooms/{roomId}
     * Infos de la salle : courseId, clientId/Name, courierId/Name.
     * Utilisé par le frontend pour afficher le nom du correspondant.
     * Le nom retourné est le fullName uniquement — jamais l'email (TICK-056).
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(@PathVariable Long roomId,
                                                           Principal principal) {
        requireParticipant(roomId, principal);

        ChatRoom room = chatAccessService.findRoom(roomId)
                .orElseThrow(() -> new NotFoundException("Salle de chat introuvable."));

        String clientName  = resolveFullName(room.getClientId());
        String courierName = resolveFullName(room.getCourierId());

        // Statut de la course (TICK-059 : pilote la visibilité du bouton "Accepter et payer")
        String courseStatus = courseRepository.findById(room.getCourseId())
                .map(c -> c.getStatus())
                .orElse("UNKNOWN");

        return ResponseEntity.ok(Map.of(
                "roomId",       room.getId(),
                "courseId",     room.getCourseId(),
                "clientId",     room.getClientId(),
                "clientName",   clientName,
                "courierId",    room.getCourierId(),
                "courierName",  courierName,
                "courseStatus", courseStatus
        ));
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    /**
     * Lève une {@link ForbiddenException} (→ HTTP 403) si l'utilisateur courant
     * n'est ni participant ni admin.
     */
    private void requireParticipant(Long roomId, Principal principal) {
        String email = principal == null ? null : principal.getName();
        if (!chatAccessService.canRead(roomId, email)) {
            throw new ForbiddenException("Accès refusé à cette conversation.");
        }
    }

    /**
     * Retourne le fullName de l'utilisateur. Si absent, retourne un libellé
     * générique sans exposer l'email (TICK-056 : IDOR + fuite email).
     */
    private String resolveFullName(Long userId) {
        return userRepository.findById(userId)
                .map(u -> {
                    String name = u.getFullName();
                    return (name != null && !name.isBlank()) ? name : "Utilisateur";
                })
                .orElse("Utilisateur");
    }
}