package com.confiancecoursier.backend.auth.api;

import com.confiancecoursier.backend.auth.api.dto.*;
import com.confiancecoursier.backend.auth.service.AuthService;
import com.confiancecoursier.backend.auth.service.PasswordResetService;
import com.confiancecoursier.backend.shared.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final ClientIpResolver clientIpResolver;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                          ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/register")
    public ResponseEntity<OtpResponse> register(@Valid @RequestBody RegisterRequest request,
                                                HttpServletRequest http) {
        authService.register(request, clientIpResolver.resolve(http));
        return ResponseEntity.ok(new OtpResponse("Compte créé. Veuillez vérifier votre téléphone.", true));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Étape 1 de la connexion (TICK-066) : body {@code {email, password}}.
     * Le mot de passe est vérifié AVANT l'envoi de l'OTP (401 sinon). Pour un compte ADMIN,
     * un OTP est envoyé et {@code otpRequired=true} ; pour les autres rôles, {@code otpRequired=false}.
     * Quotas d'envoi : 1/min et 5/h par email et par IP (429 au-delà).
     */
    @PostMapping("/admin-otp")
    public ResponseEntity<OtpResponse> adminOtp(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        boolean otpSent = authService.requestAdminOtp(request.getEmail(), request.getPassword(),
                clientIpResolver.resolve(http));
        if (otpSent) {
            return ResponseEntity.ok(new OtpResponse(
                    "Un code de vérification a été envoyé à votre adresse email.", true));
        }
        return ResponseEntity.ok(new OtpResponse("Connexion standard.", false));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(new OtpResponse("OTP vérifié avec succès. Vous pouvez maintenant vous connecter.", false));
    }

    /**
     * Renvoie un nouveau code OTP à l'email donné.
     * Répond toujours 200 (même si l'email est inconnu) pour éviter l'énumération.
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<OtpResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request,
                                                 HttpServletRequest http) {
        authService.resendOtp(request.getEmail(), clientIpResolver.resolve(http));
        return ResponseEntity.ok(new OtpResponse("Si un compte existe pour cet email, un nouveau code a été envoyé.", true));
    }

    /**
     * Échange un refresh token valide contre un nouveau couple access/refresh token.
     * Route publique (sous {@code /api/auth/**}).
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    /**
     * Invalide le refresh token stocké en Redis pour l'utilisateur courant.
     * Idempotent. Route publique (sous {@code /api/auth/**}).
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }

    /**
     * Démarre le flux de réinitialisation : génère un token et envoie l'email.
     * Répond toujours 200 (même si l'email est inconnu) pour éviter l'énumération.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<OtpResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.initiateReset(request.getEmail());
        return ResponseEntity.ok(new OtpResponse(
                "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.", false));
    }

    /**
     * Valide le token et met à jour le mot de passe.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<OtpResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(new OtpResponse("Mot de passe mis à jour avec succès.", false));
    }
}