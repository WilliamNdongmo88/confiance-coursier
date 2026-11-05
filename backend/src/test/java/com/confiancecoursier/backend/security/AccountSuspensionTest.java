package com.confiancecoursier.backend.security;

import com.confiancecoursier.backend.admin.api.AdminUserController;
import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.auth.service.JwtAuthenticationFilter;
import com.confiancecoursier.backend.auth.service.JwtService;
import com.confiancecoursier.backend.auth.service.OtpService;
import com.confiancecoursier.backend.auth.service.UserDetailsServiceImpl;
import com.confiancecoursier.backend.config.SecurityConfig;
import com.confiancecoursier.backend.shared.exception.AccountSuspendedException;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** TICK-053 — une suspension doit couper l'accès : login, JWT déjà émis, refresh. */
class AccountSuspensionTest {

    private static final String PWD = "password123";
    private static final String HASH = new BCryptPasswordEncoder().encode(PWD);

    private UserRepository userRepository;
    private UserDetailsServiceImpl userDetailsService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userDetailsService = new UserDetailsServiceImpl(userRepository);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private User user(long id, String email, String status) {
        User u = User.builder().id(id).email(email).passwordHash(HASH).role("CLIENT").status(status).build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(u));
        when(userRepository.findById(id)).thenReturn(Optional.of(u));
        return u;
    }

    // ── UserDetails ──────────────────────────────────────────────────────────

    @Test
    void activeAccountIsNotLocked() {
        user(1, "a@test.com", "ACTIVE");
        assertThat(userDetailsService.loadUserByUsername("a@test.com").isAccountNonLocked()).isTrue();
    }

    @Test
    void suspendedOrBlockedAccountIsLocked() {
        user(2, "s@test.com", "SUSPENDED");
        user(3, "b@test.com", "BLOCKED");
        assertThat(userDetailsService.loadUserByUsername("s@test.com").isAccountNonLocked()).isFalse();
        assertThat(userDetailsService.loadUserByUsername("b@test.com").isAccountNonLocked()).isFalse();
    }

    // ── Login (provider réel de SecurityConfig) ──────────────────────────────

    private AuthenticationProvider provider() {
        return new SecurityConfig(mock(JwtAuthenticationFilter.class), userDetailsService).authenticationProvider();
    }

    @Test
    void suspendedUserWithCorrectPasswordGetsLocked() {
        user(2, "s@test.com", "SUSPENDED");
        assertThatThrownBy(() -> provider().authenticate(new UsernamePasswordAuthenticationToken("s@test.com", PWD)))
                .isInstanceOf(LockedException.class);
    }

    @Test
    void suspendedUserWithWrongPasswordGetsBadCredentialsSoStatusIsNotLeaked() {
        user(2, "s@test.com", "SUSPENDED");
        assertThatThrownBy(() -> provider().authenticate(new UsernamePasswordAuthenticationToken("s@test.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void activeUserCanStillLogIn() {
        user(1, "a@test.com", "ACTIVE");
        assertThat(provider().authenticate(new UsernamePasswordAuthenticationToken("a@test.com", PWD)).isAuthenticated()).isTrue();
    }

    // ── JWT déjà émis ────────────────────────────────────────────────────────

    private boolean filterAuthenticates(String email) throws Exception {
        JwtService jwt = mock(JwtService.class);
        when(jwt.extractUsername("tok")).thenReturn(email);
        when(jwt.isTokenValid(eq("tok"), any(UserDetails.class))).thenReturn(true);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, userDetailsService);

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer tok");
        filter.doFilter(req, new MockHttpServletResponse(), mock(FilterChain.class));
        return SecurityContextHolder.getContext().getAuthentication() != null;
    }

    @Test
    void validJwtOfSuspendedUserIsNoLongerAccepted() throws Exception {
        user(2, "s@test.com", "SUSPENDED");
        assertThat(filterAuthenticates("s@test.com")).isFalse();
    }

    @Test
    void validJwtOfActiveUserIsAccepted() throws Exception {
        user(1, "a@test.com", "ACTIVE");
        assertThat(filterAuthenticates("a@test.com")).isTrue();
    }

    // ── Refresh ──────────────────────────────────────────────────────────────

    @Test
    void refreshIsRefusedAndSessionRevokedForSuspendedUser() {
        user(2, "s@test.com", "SUSPENDED");
        JwtService jwt = mock(JwtService.class);
        when(jwt.extractUsername("refresh-tok")).thenReturn("s@test.com");
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        AuthService auth = new AuthService(userRepository, new BCryptPasswordEncoder(), jwt,
                mock(AuthenticationManager.class), userDetailsService, mock(OtpService.class), redis);

        assertThatThrownBy(() -> auth.refreshAccessToken("refresh-tok"))
                .isInstanceOf(AccountSuspendedException.class);
        verify(redis).delete("refresh:2");
        verify(jwt, never()).generateToken(any());
    }

    // ── Action admin ─────────────────────────────────────────────────────────

    private void loggedInAs(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, java.util.List.of()));
    }

    @Test
    void adminSuspendRevokesSessions() {
        User target = user(2, "s@test.com", "ACTIVE");
        user(1, "admin@test.com", "ACTIVE");
        AuthService auth = mock(AuthService.class);
        loggedInAs("admin@test.com");

        new AdminUserController(userRepository, auth).suspend(2L);

        assertThat(target.getStatus()).isEqualTo("SUSPENDED");
        verify(userRepository).save(target);
        verify(auth).revokeSessions(2L);
    }

    @Test
    void adminCannotSuspendHimself() {
        User admin = user(1, "admin@test.com", "ACTIVE");
        AuthService auth = mock(AuthService.class);
        loggedInAs("admin@test.com");

        assertThatThrownBy(() -> new AdminUserController(userRepository, auth).suspend(1L))
                .isInstanceOf(BusinessException.class);
        assertThat(admin.getStatus()).isEqualTo("ACTIVE");
        verify(userRepository, never()).save(any());
        verifyNoInteractions(auth);
    }

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
