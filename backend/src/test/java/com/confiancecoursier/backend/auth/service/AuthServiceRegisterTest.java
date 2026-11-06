package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.auth.api.dto.RegisterRequest;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** TICK-051 — le service ne crée jamais de compte ADMIN par l'inscription publique. */
class AuthServiceRegisterTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private OtpService otpService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        otpService = mock(OtpService.class);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        authService = new AuthService(
                userRepository,
                passwordEncoder,
                mock(JwtService.class),
                mock(AuthenticationManager.class),
                mock(UserDetailsService.class),
                otpService,
                mock(StringRedisTemplate.class));
    }

    private static RegisterRequest request(String role) {
        RegisterRequest r = new RegisterRequest();
        r.setEmail("user@test.com");
        r.setPassword("password123");
        r.setFullName("Test User");
        r.setRole(role);
        return r;
    }

    @ParameterizedTest
    @CsvSource({"CLIENT,CLIENT", "client,CLIENT", "COURIER,COURIER", "' courier ',COURIER"})
    void registersClientAndCourierWithNormalizedRole(String input, String expected) {
        authService.register(request(input));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(expected);
        assertThat(saved.getValue().getStatus()).isEqualTo("ACTIVE");
        verify(otpService).generateOtp("user@test.com", null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "admin", " Admin ", "ROLE_ADMIN", "UNKNOWN", ""})
    void refusesAdminOrUnknownRole(String role) {
        assertThatThrownBy(() -> authService.register(request(role)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Rôle invalide");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(otpService);
    }

    @Test
    void refusesNullRole() {
        assertThatThrownBy(() -> authService.register(request(null)))
                .isInstanceOf(BusinessException.class);
        verify(userRepository, never()).save(any());
    }
}
