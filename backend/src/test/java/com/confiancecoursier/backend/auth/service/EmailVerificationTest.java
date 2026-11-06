package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.auth.api.dto.LoginRequest;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.EmailNotVerifiedException;
import com.confiancecoursier.backend.shared.exception.ErrorResponse;
import com.confiancecoursier.backend.shared.exception.GlobalExceptionHandler;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-074 — l'OTP d'inscription vérifie l'email ; un compte non vérifié ne peut pas se connecter. */
class EmailVerificationTest {

    private AuthenticationManager authManager;
    private OtpService otp;
    private UserRepository users;
    private AuthService auth;
    private User user;

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
                .withUsername(email).password("x").authorities("ROLE_CLIENT").build();
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenReturn(mock(ValueOperations.class));
        auth = new AuthService(users, mock(PasswordEncoder.class), jwt, authManager, uds, otp, redis);
        ReflectionTestUtils.setField(auth, "refreshExpirationMs", 604_800_000L);

        user = User.builder().id(1L).email("new@t.cm").passwordHash("x").role("CLIENT").status("ACTIVE").build();
        when(users.findByEmail("new@t.cm")).thenReturn(Optional.of(user));
    }

    private static LoginRequest login(String password) {
        LoginRequest r = new LoginRequest();
        r.setEmail("new@t.cm");
        r.setPassword(password);
        return r;
    }

    @Test
    void newAccountsAreNotVerifiedByDefault() {
        assertThat(User.builder().email("x@t.cm").passwordHash("x").role("CLIENT").build().isEmailVerified()).isFalse();
    }

    @Test
    void loginBeforeOtpIsRefusedWithMachineReadableCode() {
        assertThatThrownBy(() -> auth.login(login("secret"))).isInstanceOf(EmailNotVerifiedException.class);

        ResponseEntity<ErrorResponse> r = new GlobalExceptionHandler().handleEmailNotVerified(new EmailNotVerifiedException());
        assertThat(r.getStatusCode().value()).isEqualTo(403);
        assertThat(r.getBody().getCode()).isEqualTo("EMAIL_NOT_VERIFIED");
    }

    @Test
    void wrongPasswordDoesNotRevealVerificationState() {
        when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        assertThatThrownBy(() -> auth.login(login("wrong"))).isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void validOtpMarksEmailVerifiedThenLoginWorks() {
        when(otp.validateOtp("new@t.cm", "123456")).thenReturn(true);

        auth.verifyOtp("new@t.cm", "123456");

        assertThat(user.isEmailVerified()).isTrue();
        verify(users).save(user);
        assertThat(auth.login(login("secret")).getToken()).isEqualTo("access");
    }

    @Test
    void invalidOtpLeavesEmailUnverified() {
        when(otp.validateOtp("new@t.cm", "000000")).thenReturn(false);
        assertThatThrownBy(() -> auth.verifyOtp("new@t.cm", "000000")).isInstanceOf(BusinessException.class);
        assertThat(user.isEmailVerified()).isFalse();
        verify(users, never()).save(any());
    }
}
