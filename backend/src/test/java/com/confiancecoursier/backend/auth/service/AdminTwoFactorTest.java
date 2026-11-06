package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.auth.api.dto.LoginRequest;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.TooManyRequestsException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-066 — mot de passe vérifié avant l'OTP, 2FA pour tout compte ADMIN, quotas transmis. */
class AdminTwoFactorTest {

    private AuthenticationManager authManager;
    private OtpService otp;
    private UserRepository users;
    private AuthService auth;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        authManager = mock(AuthenticationManager.class);
        otp = mock(OtpService.class);
        users = mock(UserRepository.class);
        JwtService jwt = mock(JwtService.class);
        when(jwt.generateToken(any())).thenReturn("access");
        when(jwt.generateRefreshToken(any())).thenReturn("refresh");
        UserDetailsService uds = email -> org.springframework.security.core.userdetails.User
                .withUsername(email).password("x").authorities("ROLE_X").build();
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenReturn(mock(ValueOperations.class));

        auth = new AuthService(users, mock(PasswordEncoder.class), jwt, authManager, uds, otp, redis);
        ReflectionTestUtils.setField(auth, "refreshExpirationMs", 604_800_000L);

        user(1L, "boss@t.cm", "ADMIN");       // admin qui n'est pas l'email configuré dans ADMIN_EMAIL
        user(2L, "client@t.cm", "CLIENT");
    }

    private void user(long id, String email, String role) {
        when(users.findByEmail(email)).thenReturn(Optional.of(
                User.builder().id(id).email(email).passwordHash("x").role(role).status("ACTIVE").emailVerified(true).build()));
    }

    private static LoginRequest login(String email, String password, String code) {
        LoginRequest r = new LoginRequest();
        r.setEmail(email);
        r.setPassword(password);
        r.setOtp(code);
        return r;
    }

    @Test
    void wrongPasswordSendsNoOtp() {
        when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        assertThatThrownBy(() -> auth.requestAdminOtp("boss@t.cm", "wrong", "10.0.0.1"))
                .isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(otp);
    }

    @Test
    void anyAdminAccountGetsAnOtpAfterPasswordCheck() {
        assertThat(auth.requestAdminOtp("boss@t.cm", "secret", "10.0.0.1")).isTrue();
        InOrder order = inOrder(authManager, otp);
        order.verify(authManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        order.verify(otp).generateOtp("boss@t.cm", "10.0.0.1");
    }

    @Test
    void nonAdminGetsNoOtp() {
        assertThat(auth.requestAdminOtp("client@t.cm", "secret", "10.0.0.1")).isFalse();
        verifyNoInteractions(otp);
    }

    @Test
    void adminLoginRequiresValidOtp() {
        assertThatThrownBy(() -> auth.login(login("boss@t.cm", "secret", null)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("OTP");

        when(otp.validateOtp("boss@t.cm", "123456")).thenReturn(false);
        assertThatThrownBy(() -> auth.login(login("boss@t.cm", "secret", "123456")))
                .isInstanceOf(BusinessException.class);

        when(otp.validateOtp("boss@t.cm", "654321")).thenReturn(true);
        assertThat(auth.login(login("boss@t.cm", "secret", "654321")).getToken()).isEqualTo("access");
    }

    @Test
    void adminLoginChecksPasswordBeforeTouchingTheOtp() {
        when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        assertThatThrownBy(() -> auth.login(login("boss@t.cm", "wrong", "123456")))
                .isInstanceOf(BadCredentialsException.class);
        verify(otp, never()).validateOtp(anyString(), anyString()); // aucun essai OTP consommé
    }

    @Test
    void exhaustedOtpAttemptsPropagateAs429() {
        when(otp.validateOtp("boss@t.cm", "000000")).thenThrow(new TooManyRequestsException("Trop d'essais"));
        assertThatThrownBy(() -> auth.login(login("boss@t.cm", "secret", "000000")))
                .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void clientLoginNeedsNoOtp() {
        assertThat(auth.login(login("client@t.cm", "secret", null)).getToken()).isEqualTo("access");
        verifyNoInteractions(otp);
    }

    @Test
    void resendConsumesQuotaEvenForUnknownEmail() {
        when(users.existsByEmail("ghost@t.cm")).thenReturn(false);
        auth.resendOtp("ghost@t.cm", "10.0.0.1");
        verify(otp).consumeSendQuota("ghost@t.cm", "10.0.0.1");
        verify(otp, never()).issueOtp(anyString());
    }
}
