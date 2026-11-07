package com.confiancecoursier.backend.security;

import com.confiancecoursier.backend.chat.api.ChatRestController;
import com.confiancecoursier.backend.chat.domain.ChatMessage;
import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatMessageRepository;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.chat.service.ChatAccessService;
import com.confiancecoursier.backend.course.api.OfferController;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.course.service.OfferService;
import com.confiancecoursier.backend.shared.exception.GlobalExceptionHandler;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * TICK-056 — IDOR : historique / infos d'un salon et liste des offres, pour chaque rôle.
 * Salon 10 = course 100 du client 1 avec le coursier 2. Le client 3 et le coursier 5 sont étrangers au salon.
 */
class ChatAndOfferIdorTest {

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        UserRepository users = mock(UserRepository.class);
        ChatRoomRepository rooms = mock(ChatRoomRepository.class);
        CourseRepository courses = mock(CourseRepository.class);
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        CourseOfferRepository offerRepo = mock(CourseOfferRepository.class);
        OfferService offers = mock(OfferService.class);

        user(users, 1L, "client@t.cm", "CLIENT", "Awa Client");
        user(users, 2L, "courier@t.cm", "COURIER", "Jean Coursier");
        user(users, 3L, "other-client@t.cm", "CLIENT", "Autre Client");
        user(users, 5L, "other-courier@t.cm", "COURIER", "Paul Coursier");
        user(users, 9L, "admin@t.cm", "ADMIN", "Admin");

        when(rooms.findById(10L)).thenReturn(Optional.of(
                ChatRoom.builder().id(10L).courseId(100L).clientId(1L).courierId(2L).isArchived(false).build()));
        when(courses.findById(100L)).thenReturn(Optional.of(
                Course.builder().id(100L).clientId(1L).description("Pharmacie").status("PUBLISHED").build()));
        when(messages.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(
                ChatMessage.builder().id(1L).roomId(10L).senderId(2L).content("6000").messageType("OFFER")
                        .offerAmount(new BigDecimal("6000")).offerId(40L).build()));
        when(offerRepo.findAllById(List.of(40L))).thenReturn(List.of(
                CourseOffer.builder().id(40L).courseId(100L).courierId(2L).amount(new BigDecimal("6000")).status("ACTIVE").build()));
        when(offers.getOffersForCourse(100L)).thenReturn(List.of(
                CourseOffer.builder().id(40L).courseId(100L).courierId(2L).amount(new BigDecimal("6000")).status("ACTIVE").build(),
                CourseOffer.builder().id(41L).courseId(100L).courierId(5L).amount(new BigDecimal("7000")).status("ACTIVE").build()));

        ChatAccessService access = new ChatAccessService(rooms, users, courses);
        mvc = MockMvcBuilders
                .standaloneSetup(new ChatRestController(messages, access, users, courses, offerRepo, rooms),
                                 new OfferController(offers, courses, users))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static void user(UserRepository users, long id, String email, String role, String name) {
        User u = User.builder().id(id).email(email).passwordHash("x").role(role).status("ACTIVE").fullName(name).build();
        when(users.findByEmail(email)).thenReturn(Optional.of(u));
        when(users.findById(id)).thenReturn(Optional.of(u));
    }

    private static Principal as(String email) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of());
    }

    // ── Historique du salon ──────────────────────────────────────────────────

    @Test
    void participantsAndAdminReadHistoryWithOfferStatus() throws Exception {
        for (String email : List.of("client@t.cm", "courier@t.cm", "admin@t.cm")) {
            mvc.perform(get("/api/chat/rooms/10/messages").principal(as(email)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].offerId").value(40))
                    .andExpect(jsonPath("$[0].offerStatus").value("ACTIVE"));
        }
    }

    @Test
    void outsidersCannotReadHistory() throws Exception {
        for (String email : List.of("other-client@t.cm", "other-courier@t.cm")) {
            mvc.perform(get("/api/chat/rooms/10/messages").principal(as(email)))
                    .andExpect(status().isForbidden());
        }
    }

    // ── Infos du salon ───────────────────────────────────────────────────────

    @Test
    void roomInfoExposesNamesButNeverEmails() throws Exception {
        mvc.perform(get("/api/chat/rooms/10").principal(as("client@t.cm")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courierName").value("Jean Coursier"))
                .andExpect(jsonPath("$.clientName").value("Awa Client"))
                .andExpect(jsonPath("$.*", everyItem(not(hasToString(containsString("@"))))));
    }

    @Test
    void outsidersCannotReadRoomInfo() throws Exception {
        for (String email : List.of("other-client@t.cm", "other-courier@t.cm")) {
            mvc.perform(get("/api/chat/rooms/10").principal(as(email)))
                    .andExpect(status().isForbidden());
        }
    }

    // ── Offres d'une course ──────────────────────────────────────────────────

    @Test
    void ownerAndAdminSeeAllOffers() throws Exception {
        for (String email : List.of("client@t.cm", "admin@t.cm")) {
            mvc.perform(get("/api/courses/100/offers").principal(as(email)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));
        }
    }

    @Test
    void courierSeesOnlyOwnOffer() throws Exception {
        mvc.perform(get("/api/courses/100/offers").principal(as("courier@t.cm")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].courierId").value(2));
        mvc.perform(get("/api/courses/100/offers").principal(as("other-courier@t.cm")))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].courierId").value(5));
    }

    @Test
    void otherClientCannotSeeOffers() throws Exception {
        mvc.perform(get("/api/courses/100/offers").principal(as("other-client@t.cm")))
                .andExpect(status().isForbidden());
    }
}
