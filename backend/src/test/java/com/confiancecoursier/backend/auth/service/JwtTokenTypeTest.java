package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** TICK-054 — jeton d'accès et refresh token ne sont pas interchangeables. */
class JwtTokenTypeTest {

    // 32 octets encodés en base64 (clé HS256 de test uniquement)
    private static final String SECRET = "dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RzLTEyMzQ1Njc4OTA=";

    private JwtService jwt;
    private UserDetails alice;

    @BeforeEach
    void setUp() {
        jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secretKey", SECRET);
        ReflectionTestUtils.setField(jwt, "jwtExpiration", 900_000L);
        ReflectionTestUtils.setField(jwt, "refreshExpiration", 604_800_000L);
        alice = org.springframework.security.core.userdetails.User.withUsername("alice@test.com")
                .password("x").authorities("ROLE_CLIENT").build();
    }

    @Test
    void accessTokenIsValidForAuthentication() {
        String access = jwt.generateToken(alice);
        assertThat(jwt.isAccessToken(access)).isTrue();
        assertThat(jwt.isRefreshToken(access)).isFalse();
        assertThat(jwt.isTokenValid(access, alice)).isTrue();
    }

    @Test
    void refreshTokenIsRefusedAsBearer() {
        String refresh = jwt.generateRefreshToken(alice);
        assertThat(jwt.isRefreshToken(refresh)).isTrue();
        assertThat(jwt.isTokenValid(refresh, alice)).isFalse();
    }

    @Test
    void legacyTokenWithoutTypeIsRefusedAsBearer() {
        String legacy = Jwts.builder().subject("alice@test.com")
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET))).compact();
        assertThat(jwt.isTokenValid(legacy, alice)).isFalse();
    }

    @Test
    void twoRefreshTokensAreAlwaysDistinct() {
        assertThat(jwt.generateRefreshToken(alice)).isNotEqualTo(jwt.generateRefreshToken(alice));
    }

    @Test
    @SuppressWarnings("unchecked")
    void accessTokenIsRefusedByRefreshEndpointAndRefreshTokenAccepted() {
        UserRepository users = mock(UserRepository.class);
        User u = User.builder().id(7L).email("alice@test.com").passwordHash("x").role("CLIENT").status("ACTIVE").build();
        when(users.findByEmail("alice@test.com")).thenReturn(Optional.of(u));

        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);

        var uds = mock(org.springframework.security.core.userdetails.UserDetailsService.class);
        when(uds.loadUserByUsername("alice@test.com")).thenReturn(alice);

        AuthService auth = new AuthService(users, mock(PasswordEncoder.class), jwt,
                mock(AuthenticationManager.class), uds, mock(OtpService.class), redis);
        ReflectionTestUtils.setField(auth, "refreshExpirationMs", 604_800_000L);

        // Jeton d'accès envoyé à /refresh → refusé (400 via BusinessException)
        String access = jwt.generateToken(alice);
        when(ops.get("refresh:7")).thenReturn(access);
        assertThatThrownBy(() -> auth.refreshAccessToken(access))
                .isInstanceOf(BusinessException.class);

        // Vrai refresh token stocké → accepté et rotation
        String refresh = jwt.generateRefreshToken(alice);
        when(ops.get("refresh:7")).thenReturn(refresh);
        var res = auth.refreshAccessToken(refresh);
        assertThat(jwt.isAccessToken(res.getToken())).isTrue();
        assertThat(jwt.isRefreshToken(res.getRefreshToken())).isTrue();
        assertThat(res.getRefreshToken()).isNotEqualTo(refresh);
        verify(ops).set(eq("refresh:7"), eq(res.getRefreshToken()), any(java.time.Duration.class));
    }
}
