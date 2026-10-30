package com.confiancecoursier.backend.auth.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private static final long OTP_VALIDITY_MINUTES = 5;
    private static final SecureRandom random = new SecureRandom();

    public OtpService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String generateOtp(String email) {
        // Génère un code à 6 chiffres
        int otp = 100000 + random.nextInt(900000);
        String otpString = String.valueOf(otp);

        // Stocke dans Redis avec une expiration de 5 minutes
        // Clé : "otp:<email>", Valeur : "<code>"
        redisTemplate.opsForValue().set(
                "otp:" + email,
                otpString,
                Duration.ofMinutes(OTP_VALIDITY_MINUTES)
        );

        // SIMULATION D'ENVOI (à remplacer par un vrai service email/SMS)
        System.out.println("==================================================");
        System.out.println("🔐 OTP généré pour " + email + " : " + otpString);
        System.out.println("==================================================");

        return otpString;
    }

    public boolean validateOtp(String email, String inputOtp) {
        String storedOtp = redisTemplate.opsForValue().get("otp:" + email);

        if (storedOtp != null && storedOtp.equals(inputOtp)) {
            // OTP valide : on le supprime pour éviter la réutilisation
            redisTemplate.delete("otp:" + email);
            return true;
        }
        return false;
    }
}