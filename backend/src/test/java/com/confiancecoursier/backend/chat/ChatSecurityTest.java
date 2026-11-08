package com.confiancecoursier.backend.chat;

import com.confiancecoursier.backend.auth.service.JwtService;
import com.confiancecoursier.backend.chat.api.ChatController;
import com.confiancecoursier.backend.chat.api.ChatController.ChatRejectedException;
import com.confiancecoursier.backend.chat.api.dto.ChatMessageDto;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import com.confiancecoursier.backend.config.StompAuthChannelInterceptor;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** TICK-055 / TICK-058 — WebSocket STOMP : authentification, abonnements, destinations, expéditeur, types et offres. */
class ChatSecurityTest {

    private static final String SECRET = "dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RzLTEyMzQ1Njc4OTA=";

    private UserRepository users;
    private ChatRoomRepository rooms;
    private ChatAccessService access;
    private JwtService jwt;
    private StompAuthChannelInterceptor interceptor;

    private User client, courier, intruder, admin;
    private ChatRoom room;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        rooms = mock(ChatRoomRepository.class);
        access = new ChatAccessService(rooms, users, mock(CourseRepository.class));

        jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secretKey", SECRET);
        ReflectionTestUtils.setField(jwt, "jwtExpiration", 900_000L);
        ReflectionTestUtils.setField(jwt, "refreshExpiration", 604_800_000L);

        client = user(1, "client@test.com", "CLIENT", "ACTIVE");
        courier = user(2, "courier@test.com", "COURIER", "ACTIVE");
        intruder = user(3, "intruder@test.com", "CLIENT", "ACTIVE");
        admin = user(4, "admin@test.com", "ADMIN", "ACTIVE");
        user(5, "suspended@test.com", "CLIENT", "SUSPENDED");

        room = ChatRoom.builder().id(10L).courseId(100L).clientId(1L).courierId(2L).isArchived(false).build();
        when(rooms.findById(10L)).thenReturn(Optional.of(room));

        UserDetailsService uds = email -> users.findByEmail(email)
                .map(u -> org.springframework.security.core.userdetails.User.withUsername(u.getEmail())
                        .password("x").authorities("ROLE_" + u.getRole()).accountLocked(!u.isActive()).build())
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(email));
        interceptor = new StompAuthChannelInterceptor(jwt, uds, access);
    }

    private User user(long id, String email, String role, String status) {
        User u = User.builder().id(id).email(email).passwordHash("x").role(role).status(status).build();
        when(users.findByEmail(email)).thenReturn(Optional.of(u));
        return u;
    }

    private UserDetails details(String email) {
        return org.springframework.security.core.userdetails.User.withUsername(email).password("x").authorities("ROLE_X").build();
    }

    private static Principal principal(String email) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of());
    }

    private Message<byte[]> frame(StompCommand cmd, String destination, String authorization, Principal user) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(cmd);
        if (destination != null) acc.setDestination(destination);
        if (authorization != null) acc.setNativeHeader("Authorization", authorization);
        if (user != null) acc.setUser(user);
        acc.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders());
    }

    private Message<?> send(Message<byte[]> msg) {
        return interceptor.preSend(msg, mock(MessageChannel.class));
    }

    // ── CONNECT ──────────────────────────────────────────────────────────────

    @Test
    void connectWithoutTokenIsRefused() {
        assertThatThrownBy(() -> send(frame(StompCommand.CONNECT, null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void connectWithGarbageTokenIsRefused() {
        assertThatThrownBy(() -> send(frame(StompCommand.CONNECT, null, "Bearer not.a.jwt", null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void connectWithRefreshTokenIsRefused() {
        String refresh = jwt.generateRefreshToken(details("client@test.com"));
        assertThatThrownBy(() -> send(frame(StompCommand.CONNECT, null, "Bearer " + refresh, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void connectOfSuspendedUserIsRefused() {
        String token = jwt.generateToken(details("suspended@test.com"));
        assertThatThrownBy(() -> send(frame(StompCommand.CONNECT, null, "Bearer " + token, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void connectWithValidAccessTokenSetsPrincipal() {
        String token = jwt.generateToken(details("client@test.com"));
        Message<?> out = send(frame(StompCommand.CONNECT, null, "Bearer " + token, null));
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(out, StompHeaderAccessor.class);
        assertThat(acc.getUser()).isNotNull();
        assertThat(acc.getUser().getName()).isEqualTo("client@test.com");
    }

    // ── SUBSCRIBE ────────────────────────────────────────────────────────────

    @Test
    void participantsAndAdminCanSubscribeToTheirRoom() {
        for (String email : List.of("client@test.com", "courier@test.com", "admin@test.com")) {
            assertThatCode(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/chat/10", null, principal(email))))
                    .as(email).doesNotThrowAnyException();
        }
    }

    @Test
    void outsiderCannotSubscribeToRoom() {
        assertThatThrownBy(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/chat/10", null, principal("intruder@test.com"))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void unknownRoomOrOtherTopicIsRefused() {
        assertThatThrownBy(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/chat/999", null, principal("client@test.com"))))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/chat/*", null, principal("client@test.com"))))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/anything", null, principal("client@test.com"))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void anyAuthenticatedUserCanSubscribeToOwnErrorQueue() {
        assertThatCode(() -> send(frame(StompCommand.SUBSCRIBE, "/user/queue/errors", null, principal("intruder@test.com"))))
                .doesNotThrowAnyException();
    }

    @Test
    void directSendToBrokerDestinationsIsRefused() {
        // Sans ce contrôle, le simple broker diffuserait le message tel quel (faux senderId, SYSTEM, fausse offre)
        Principal p = principal("client@test.com");
        for (String dest : List.of("/topic/chat/10", "/topic/chat/99", "/queue/errors", "/user/queue/errors")) {
            assertThatThrownBy(() -> send(frame(StompCommand.SEND, dest, null, p)))
                    .as(dest).isInstanceOf(AccessDeniedException.class);
        }
        assertThatThrownBy(() -> send(frame(StompCommand.SEND, null, null, p)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void sendToApplicationDestinationIsAllowed() {
        assertThatCode(() -> send(frame(StompCommand.SEND, "/app/chat.send", null, principal("client@test.com"))))
                .doesNotThrowAnyException();
    }

    @Test
    void sendOrSubscribeWithoutSessionIsRefused() {
        assertThatThrownBy(() -> send(frame(StompCommand.SEND, "/app/chat.send", null, null)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> send(frame(StompCommand.SUBSCRIBE, "/topic/chat/10", null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── @MessageMapping /chat.send ───────────────────────────────────────────

    private ChatMessageRepository messages;
    private SimpMessagingTemplate template;
    private OfferService offers;
    private com.confiancecoursier.backend.notify.service.NotificationService notifications;
    private CourseRepository courses;

    private ChatController controller() {
        messages = mock(ChatMessageRepository.class);
        when(messages.save(any(ChatMessage.class))).thenAnswer(i -> i.getArgument(0));
        template = mock(SimpMessagingTemplate.class);
        offers = mock(OfferService.class);
        notifications = mock(com.confiancecoursier.backend.notify.service.NotificationService.class);
        courses = mock(CourseRepository.class);
        when(courses.findById(100L)).thenReturn(java.util.Optional.of(com.confiancecoursier.backend.course.domain.Course.builder()
                .id(100L).clientId(1L).description("Riz").status("PUBLISHED").build()));
        return new ChatController(messages, template, access, offers, rooms, courses, notifications);
    }

    @Test
    void sentMessageIsStoredAsUnread() {
        ChatController c = controller();
        c.sendMessage(dto(null, "TEXT", "Bonjour", null), principal("courier@test.com"));
        var captor = org.mockito.ArgumentCaptor.forClass(ChatMessage.class);
        org.mockito.Mockito.verify(messages).save(captor.capture());
        // NULL n'est jamais compté comme non lu : la pastille ne s'afficherait pas
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getIsRead()).isFalse();
    }

    // ── Email au client à chaque nouveau coursier qui lui écrit ──────────────

    @Test
    void firstMessageOfACourierEmailsTheClient() {
        ChatController c = controller();
        when(messages.countByRoomIdAndSenderId(10L, 2L)).thenReturn(1L);
        c.sendMessage(dto(null, "TEXT", "Bonjour, je peux m'en charger", null), principal("courier@test.com"));
        verify(notifications, timeout(2000)).notifyFirstReply(
                org.mockito.ArgumentMatchers.eq(1L), any(), any(), org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.isNull());
    }

    @Test
    void firstMessageThatIsAnOfferPutsTheAmountInTheEmail() {
        ChatController c = controller();
        when(messages.countByRoomIdAndSenderId(10L, 2L)).thenReturn(1L);
        when(offers.submitOffer(100L, 2L, new BigDecimal("6000"), "Je propose 6000")).thenReturn(
                com.confiancecoursier.backend.course.domain.CourseOffer.builder().id(77L).courseId(100L).courierId(2L)
                        .amount(new BigDecimal("6000")).status("ACTIVE").build());
        c.sendMessage(dto(null, "OFFER", "Je propose 6000", new BigDecimal("6000")), principal("courier@test.com"));
        verify(notifications, timeout(2000)).notifyFirstReply(
                org.mockito.ArgumentMatchers.eq(1L), any(), any(), org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq(10L), org.mockito.ArgumentMatchers.argThat(a -> a != null && a.compareTo(new BigDecimal("6000")) == 0));
    }

    @Test
    void laterMessagesAndClientMessagesSendNoEmail() throws Exception {
        ChatController c = controller();
        when(messages.countByRoomIdAndSenderId(10L, 2L)).thenReturn(2L);
        c.sendMessage(dto(null, "TEXT", "Deuxième message", null), principal("courier@test.com"));
        c.sendMessage(dto(null, "TEXT", "Réponse du client", null), principal("client@test.com"));
        Thread.sleep(300);
        verifyNoInteractions(notifications);
    }

    @Test
    void noEmailOnceTheCourseIsNoLongerOpen() throws Exception {
        ChatController c = controller();
        when(messages.countByRoomIdAndSenderId(10L, 2L)).thenReturn(1L);
        when(courses.findById(100L)).thenReturn(java.util.Optional.of(com.confiancecoursier.backend.course.domain.Course.builder()
                .id(100L).clientId(1L).status("ASSIGNED").build()));
        c.sendMessage(dto(null, "TEXT", "Je suis en route", null), principal("courier@test.com"));
        Thread.sleep(300);
        verifyNoInteractions(notifications);
    }

    private static ChatMessageDto dto(Long senderId, String type, String content, BigDecimal amount) {
        ChatMessageDto d = new ChatMessageDto();
        d.setRoomId(10L);
        d.setSenderId(senderId);
        d.setMessageType(type);
        d.setContent(content);
        d.setOfferAmount(amount);
        return d;
    }

    @Test
    void spoofedSenderIdIsReplacedByAuthenticatedUser() {
        ChatController c = controller();
        c.sendMessage(dto(2L /* se fait passer pour le coursier */, "TEXT", "Bonjour", null), principal("client@test.com"));

        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messages).save(saved.capture());
        assertThat(saved.getValue().getSenderId()).isEqualTo(1L);
        verify(template).convertAndSend(eq("/topic/chat/10"), any(Object.class));
    }

    @Test
    void outsiderCannotPostInRoom() {
        ChatController c = controller();
        assertThatThrownBy(() -> c.sendMessage(dto(1L, "TEXT", "spam", null), principal("intruder@test.com")))
                .isInstanceOf(ChatRejectedException.class);
        verifyNoInteractions(messages);
        verifyNoInteractions(template);
    }

    @Test
    void adminCanReadButNotPost() {
        ChatController c = controller();
        assertThatThrownBy(() -> c.sendMessage(dto(null, "TEXT", "hello", null), principal("admin@test.com")))
                .isInstanceOf(ChatRejectedException.class);
    }

    @Test
    void systemMessagesFromClientsAreRefused() {
        ChatController c = controller();
        assertThatThrownBy(() -> c.sendMessage(dto(null, "SYSTEM", "Offre acceptée", null), principal("client@test.com")))
                .isInstanceOf(ChatRejectedException.class);
        verifyNoInteractions(messages);
    }

    @Test
    void clientCannotSendAnOffer() {
        ChatController c = controller();
        assertThatThrownBy(() -> c.sendMessage(dto(null, "OFFER", "", new BigDecimal("1")), principal("client@test.com")))
                .isInstanceOf(ChatRejectedException.class)
                .hasMessageContaining("coursier");
        verifyNoInteractions(messages);
    }

    @Test
    void courierOfTheRoomCanSendAnOffer() {
        ChatController c = controller();
        when(offers.submitOffer(100L, 2L, new BigDecimal("6000"), "Je propose 6000")).thenReturn(
                CourseOffer.builder().id(77L).courseId(100L).courierId(2L).amount(new BigDecimal("6000")).status("ACTIVE").build());

        c.sendMessage(dto(null, "offer", "Je propose 6000", new BigDecimal("6000")), principal("courier@test.com"));

        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messages).save(saved.capture());
        assertThat(saved.getValue().getMessageType()).isEqualTo("OFFER");
        assertThat(saved.getValue().getSenderId()).isEqualTo(2L);
        assertThat(saved.getValue().getOfferAmount()).isEqualByComparingTo("6000");
        // L'id de l'offre est enregistré avec le message (acceptation possible après rechargement)
        assertThat(saved.getValue().getOfferId()).isEqualTo(77L);
    }

    @Test
    void offerRefusedByBusinessRulesIsReportedToSender() {
        ChatController c = controller();
        when(offers.submitOffer(anyLong(), anyLong(), any(), anyString()))
                .thenThrow(new BusinessException("Le montant minimum est de 5000 XAF."));
        assertThatThrownBy(() -> c.sendMessage(dto(null, "OFFER", "", new BigDecimal("3000")), principal("courier@test.com")))
                .isInstanceOf(ChatRejectedException.class)
                .hasMessageContaining("minimum");
        verifyNoInteractions(messages);
        verifyNoInteractions(template);
    }

    @Test
    void offerFromCourierWithoutKycIsRefused() {
        ChatController c = controller();
        when(offers.submitOffer(anyLong(), anyLong(), any(), anyString()))
                .thenThrow(new ForbiddenException("Votre identité doit être vérifiée (KYC)."));
        assertThatThrownBy(() -> c.sendMessage(dto(null, "OFFER", "", new BigDecimal("6000")), principal("courier@test.com")))
                .isInstanceOf(ChatRejectedException.class)
                .hasMessageContaining("KYC");
        verifyNoInteractions(messages);
    }

    @Test
    void invalidOfferAmountOrEmptyTextIsRefused() {
        ChatController c = controller();
        when(offers.submitOffer(anyLong(), anyLong(), any(), anyString()))
                .thenThrow(new BusinessException("Montant de l'offre invalide."));
        assertThatThrownBy(() -> c.sendMessage(dto(null, "OFFER", "", BigDecimal.ZERO), principal("courier@test.com")))
                .isInstanceOf(ChatRejectedException.class);
        assertThatThrownBy(() -> c.sendMessage(dto(null, "TEXT", "   ", null), principal("client@test.com")))
                .isInstanceOf(ChatRejectedException.class);
        assertThatThrownBy(() -> c.sendMessage(dto(null, "TEXT", "x".repeat(2001), null), principal("client@test.com")))
                .isInstanceOf(ChatRejectedException.class);
    }

    @Test
    void archivedRoomIsReadOnly() {
        room.setIsArchived(true);
        ChatController c = controller();
        assertThatThrownBy(() -> c.sendMessage(dto(null, "TEXT", "hello", null), principal("client@test.com")))
                .isInstanceOf(ChatRejectedException.class);
    }

    @Test
    void rejectionIsReportedToSender() {
        assertThat(controller().handleRejected(new ChatRejectedException("Refusé")))
                .containsEntry("message", "Refusé");
    }

    private static <T> T eq(T v) {
        return org.mockito.ArgumentMatchers.eq(v);
    }
}
