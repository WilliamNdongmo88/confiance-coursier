package com.confiancecoursier.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins = "http://localhost:4200";

    public WebSocketConfig(StompAuthChannelInterceptor stompAuthChannelInterceptor) {
        this.stompAuthChannelInterceptor = stompAuthChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // /topic : diffusion par salon ; /queue : files privées (ex. /user/queue/errors)
        config.enableSimpleBroker("/topic", "/queue");
        // Préfixe pour les messages entrants traités par les @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
        // Destinations propres à un utilisateur (résolues via le Principal STOMP)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // TICK-055 : authentification JWT au CONNECT + contrôle SUBSCRIBE/SEND
        registration.interceptors(stompAuthChannelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket : ws://localhost:8080/ws
        // TICK-068 : mêmes origines que le CORS HTTP (CORS_ALLOWED_ORIGINS), plus de « * »
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(java.util.Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim).filter(o -> !o.isEmpty()).toArray(String[]::new))
                .withSockJS(); // Fallback pour les vieux navigateurs
    }
}
