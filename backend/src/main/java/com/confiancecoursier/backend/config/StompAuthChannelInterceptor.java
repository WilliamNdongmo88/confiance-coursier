package com.confiancecoursier.backend.config;

import com.confiancecoursier.backend.auth.service.JwtService;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sécurité STOMP (TICK-055).
 * <ul>
 *   <li><b>CONNECT</b> : exige un header {@code Authorization: Bearer <jeton d'accès>} valide
 *       (type {@code access}, compte non suspendu). Le Principal STOMP est l'email de l'utilisateur.</li>
 *   <li><b>SUBSCRIBE</b> : {@code /topic/chat/{roomId}} seulement si participant (ou ADMIN) ;
 *       {@code /user/queue/errors} pour tout utilisateur connecté ; toute autre destination est refusée.</li>
 *   <li><b>SEND</b> : exige une session authentifiée (les contrôles métier sont dans {@code ChatController}).</li>
 * </ul>
 * Le endpoint HTTP {@code /ws/**} reste public (handshake SockJS) : l'authentification se fait au CONNECT.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern CHAT_TOPIC = Pattern.compile("^/topic/chat/(\\d+)$");
    static final String ERRORS_QUEUE = "/user/queue/errors";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final ChatAccessService chatAccessService;

    public StompAuthChannelInterceptor(JwtService jwtService,
                                       UserDetailsService userDetailsService,
                                       ChatAccessService chatAccessService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.chatAccessService = chatAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscribe(requireUser(accessor), accessor.getDestination());
        } else if (StompCommand.SEND.equals(command)) {
            requireUser(accessor);
        }
        return message;
    }

    private Principal authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AccessDeniedException("Authentification requise.");
        }
        String token = authorization.substring(7);
        try {
            String email = jwtService.extractUsername(token);
            UserDetails user = userDetailsService.loadUserByUsername(email);
            if (!user.isAccountNonLocked() || !jwtService.isTokenValid(token, user)) {
                throw new AccessDeniedException("Jeton invalide.");
            }
            return new UsernamePasswordAuthenticationToken(user.getUsername(), null, user.getAuthorities());
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            // signature invalide, jeton expiré, utilisateur inconnu…
            throw new AccessDeniedException("Jeton invalide ou expiré.");
        }
    }

    private Principal requireUser(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (user == null) {
            throw new AccessDeniedException("Session non authentifiée.");
        }
        return user;
    }

    private void authorizeSubscribe(Principal user, String destination) {
        if (ERRORS_QUEUE.equals(destination)) {
            return;
        }
        Matcher m = destination == null ? null : CHAT_TOPIC.matcher(destination);
        if (m != null && m.matches() && chatAccessService.canRead(Long.valueOf(m.group(1)), user.getName())) {
            return;
        }
        throw new AccessDeniedException("Abonnement non autorisé : " + destination);
    }
}
