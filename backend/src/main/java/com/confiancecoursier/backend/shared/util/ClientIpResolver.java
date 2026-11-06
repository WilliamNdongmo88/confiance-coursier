package com.confiancecoursier.backend.shared.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Adresse IP du client (TICK-066 : limites d'envoi d'OTP par IP).
 *
 * <p>{@code X-Forwarded-For} n'est lu que si {@code app.security.trust-forwarded-for=true}
 * (backend derrière un reverse proxy de confiance) : sinon un attaquant pourrait choisir son IP.
 */
@Component
public class ClientIpResolver {

    @Value("${app.security.trust-forwarded-for:false}")
    private boolean trustForwardedFor;

    public String resolve(HttpServletRequest request) {
        if (trustForwardedFor) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
