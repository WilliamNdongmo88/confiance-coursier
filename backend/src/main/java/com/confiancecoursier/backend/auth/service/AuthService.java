package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.auth.api.dto.AuthResponse;
import com.confiancecoursier.backend.auth.api.dto.LoginRequest;
import com.confiancecoursier.backend.auth.api.dto.RegisterRequest;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final OtpService otpService;
    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    @Value("${admin.email:}")
    private String adminEmail;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       UserDetailsService userDetailsService,
                       OtpService otpService,
                       StringRedisTemplate redisTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.otpService = otpService;
        this.redisTemplate = redisTemplate;
    }

    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Un compte avec cet email existe déjà.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole().toUpperCase())
                .status("ACTIVE")
                .build();

        userRepository.save(user);

        // Envoie l'OTP
        otpService.generateOtp(user.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        // ── Vérification OTP pour le compte admin ─────────────────────────────
        boolean isAdmin = adminEmail != null
                && !adminEmail.isBlank()
                && adminEmail.equalsIgnoreCase(request.getEmail());

        if (isAdmin) {
            // L'OTP doit être présent et valide avant de vérifier le mot de passe
            if (request.getOtp() == null || request.getOtp().isBlank()) {
                throw new BusinessException("Un code OTP est requis pour la connexion administrateur.");
            }
            boolean otpValid = otpService.validateOtp(request.getEmail(), request.getOtp());
            if (!otpValid) {
                throw new BusinessException("Code OTP invalide ou expiré.");
            }
        }

        // ── Vérification email + mot de passe ─────────────────────────────────
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        storeRefreshToken(user.getId(), refreshToken);

        return new AuthResponse(accessToken, refreshToken, user.getEmail(), user.getFullName(), user.getRole(), user.getId());
    }

    /**
     * Déclenche l'envoi d'un OTP à l'adresse admin si et seulement si
     * l'email fourni correspond au compte administrateur configuré.
     */
    public void requestAdminOtp(String email) {
        if (isAdminEmail(email)) {
            otpService.generateOtp(email);
        }
    }

    /** Retourne true si l'email correspond au compte admin configuré. */
    public boolean isAdminEmail(String email) {
        return adminEmail != null
                && !adminEmail.isBlank()
                && adminEmail.equalsIgnoreCase(email);
    }

    /**
     * Valide un refresh token et émet un nouveau couple access/refresh token.
     * Le refresh token est <strong>rotativé</strong> : l'ancien est invalidé en Redis
     * et remplacé par le nouveau, ce qui empêche sa réutilisation.
     */
    public AuthResponse refreshAccessToken(String refreshToken) {
        String email = extractEmailSafely(refreshToken);
        if (email == null) {
            throw new BusinessException("Refresh token invalide ou expiré.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));

        // Vérifie que le refresh token correspond à celui stocké (et qu'il n'a pas été révoqué).
        String stored = getStoredRefreshToken(user.getId());
        if (stored == null || !stored.equals(refreshToken)) {
            throw new BusinessException("Refresh token invalide ou déjà utilisé.");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String newAccessToken = jwtService.generateToken(userDetails);
        String newRefreshToken = jwtService.generateRefreshToken(userDetails);

        // Rotation : invalide l'ancien refresh token et stocke le nouveau.
        storeRefreshToken(user.getId(), newRefreshToken);

        return new AuthResponse(newAccessToken, newRefreshToken, user.getEmail(), user.getFullName(), user.getRole(), user.getId());
    }

    /**
     * Déconnexion : invalide le refresh token stocké en Redis pour l'utilisateur.
     * L'opération est idempotente (un token déjà invalide ne provoque pas d'erreur).
     */
    public void logout(String refreshToken) {
        String email = extractEmailSafely(refreshToken);
        if (email == null) {
            return;
        }
        userRepository.findByEmail(email).ifPresent(user -> deleteRefreshToken(user.getId()));
    }

    public void verifyOtp(String email, String otp) {
        boolean isValid = otpService.validateOtp(email, otp);
        if (!isValid) {
            throw new BusinessException("Code OTP invalide ou expiré.");
        }
        // Ici, on pourrait mettre à jour un champ 'emailVerified' dans la table users
        // Pour l'instant, on considère que l'utilisateur est vérifié si l'OTP passe.
    }

    /**
     * Renvoie un nouveau code OTP à l'email donné, si et seulement si
     * un compte actif existe pour cet email.
     * Silencieux si l'email est inconnu (évite l'énumération de comptes).
     */
    public void resendOtp(String email) {
        if (userRepository.existsByEmail(email)) {
            otpService.generateOtp(email);
        }
    }

    // ── Helpers Redis pour le refresh token ──

    private void storeRefreshToken(Long userId, String token) {
        redisTemplate.opsForValue().set(refreshKey(userId), token, Duration.ofMillis(refreshExpirationMs));
    }

    private String getStoredRefreshToken(Long userId) {
        return redisTemplate.opsForValue().get(refreshKey(userId));
    }

    private void deleteRefreshToken(Long userId) {
        redisTemplate.delete(refreshKey(userId));
    }

    private String refreshKey(Long userId) {
        return "refresh:" + userId;
    }

    /**
     * Extrait l'email (subject) du token sans lever d'exception :
     * renvoie {@code null} si le token est invalide, mal formé ou expiré.
     */
    private String extractEmailSafely(String token) {
        try {
            return jwtService.extractUsername(token);
        } catch (Exception e) {
            return null;
        }
    }
}