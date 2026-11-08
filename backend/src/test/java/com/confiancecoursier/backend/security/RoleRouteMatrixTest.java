package com.confiancecoursier.backend.security;

import com.confiancecoursier.backend.auth.service.JwtService;
import com.confiancecoursier.backend.config.HealthController;
import com.confiancecoursier.backend.config.SecurityConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * TICK-067 — matrice rôle × endpoint sur la vraie {@link SecurityConfig}.
 *
 * <p>Seule la chaîne de sécurité est testée : les contrôleurs métier ne sont pas chargés.
 * Une route autorisée passe donc la sécurité puis répond 404 (aucun contrôleur) ;
 * une route refusée répond 403 avant d'atteindre quoi que ce soit.
 */
@WebMvcTest(controllers = HealthController.class)
@Import(SecurityConfig.class)
class RoleRouteMatrixTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private static final Set<String> CLIENT = Set.of("CLIENT");
    private static final Set<String> COURIER = Set.of("COURIER");
    private static final Set<String> PARTIES = Set.of("CLIENT", "COURIER");
    private static final Set<String> ADMIN = Set.of("ADMIN");
    private static final Set<String> ANY = Set.of("CLIENT", "COURIER", "ADMIN");

    static Stream<Arguments> matrix() {
        return Stream.of(
                // CLIENT
                Arguments.of("POST",   "/api/courses",                          CLIENT),
                Arguments.of("PUT",    "/api/courses/1",                        CLIENT),
                Arguments.of("DELETE", "/api/courses/1",                        CLIENT),
                Arguments.of("GET",    "/api/courses/my-courses",               CLIENT),
                Arguments.of("POST",   "/api/courses/1/offers/2/accept",        CLIENT),
                Arguments.of("POST",   "/api/courses/1/accept-offer/2",         CLIENT),
                Arguments.of("POST",   "/api/courses/1/validate",               CLIENT),
                Arguments.of("POST",   "/api/courses/1/extend",                 CLIENT),
                Arguments.of("POST",   "/api/courses/1/cancel-overdue",         CLIENT),
                Arguments.of("POST",   "/api/courses/1/cancel-before-start",    CLIENT),
                Arguments.of("POST",   "/api/courses/1/start",                  COURIER),
                Arguments.of("POST",   "/api/payment/initiate",                 CLIENT),
                Arguments.of("GET",    "/api/users/couriers",                   CLIENT),
                // COURIER
                Arguments.of("POST",   "/api/courses/1/proofs",                 COURIER),
                Arguments.of("POST",   "/api/courses/1/proofs/submit",          COURIER),
                Arguments.of("DELETE", "/api/courses/1/proofs/3",               COURIER),
                Arguments.of("POST",   "/api/kyc/submit",                       COURIER),
                Arguments.of("GET",    "/api/kyc/my-status",                    COURIER),
                Arguments.of("GET",    "/api/courses/published",                COURIER),
                Arguments.of("GET",    "/api/courses/my-missions",              COURIER),
                // CLIENT ou COURIER
                Arguments.of("POST",   "/api/courses/1/conversations",          PARTIES),
                Arguments.of("POST",   "/api/courses/1/review",                 PARTIES),
                Arguments.of("POST",   "/api/disputes",                         PARTIES),
                Arguments.of("POST",   "/api/reports",                          PARTIES),
                // ADMIN
                Arguments.of("GET",    "/api/admin/disputes",                   ADMIN),
                Arguments.of("POST",   "/api/admin/users/1/suspend",            ADMIN),
                // Lecture authentifiée (l'appartenance est contrôlée dans les services)
                Arguments.of("GET",    "/api/courses/1",                        ANY),
                Arguments.of("GET",    "/api/courses/1/proofs",                 ANY),
                Arguments.of("GET",    "/api/courses/1/offers",                 ANY),
                Arguments.of("GET",    "/api/chat/rooms/1/messages",            ANY),
                Arguments.of("GET",    "/api/users/me",                         ANY)
        );
    }

    @ParameterizedTest(name = "{0} {1} → {2}")
    @MethodSource("matrix")
    void roleMatrix(String method, String path, Set<String> allowed) throws Exception {
        for (String role : List.of("CLIENT", "COURIER", "ADMIN")) {
            MvcResult r = mvc.perform(request(HttpMethod.valueOf(method), path).with(user("u").roles(role)))
                    .andReturn();
            int code = r.getResponse().getStatus();
            if (allowed.contains(role)) {
                assertThat(code).as("%s %s en %s doit passer la sécurité", method, path, role)
                        .isNotIn(401, 403);
            } else {
                assertThat(code).as("%s %s en %s doit être refusé", method, path, role).isEqualTo(403);
            }
        }
    }

    @Test
    void anonymousIsUnauthorizedWithJsonBody() throws Exception {
        mvc.perform(request(HttpMethod.GET, "/api/courses/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void forbiddenHasJsonBodyAndCorrelationId() throws Exception {
        MvcResult r = mvc.perform(request(HttpMethod.POST, "/api/courses").with(user("u").roles("COURIER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").exists())
                .andReturn();
        assertThat(r.getResponse().getHeader("X-Correlation-Id")).isNotBlank();
    }

    @Test
    void publicRoutesStayPublic() throws Exception {
        mvc.perform(request(HttpMethod.GET, "/api/health")).andExpect(status().isOk());
        int code = mvc.perform(request(HttpMethod.POST, "/api/auth/login")).andReturn().getResponse().getStatus();
        assertThat(code).isNotIn(401, 403);
    }
}
