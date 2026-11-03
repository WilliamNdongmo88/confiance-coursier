package com.confiancecoursier.backend.config;

import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Crée un compte administrateur initial au démarrage de l'application
 * si aucun utilisateur avec {@code role=ADMIN} n'existe en base.
 *
 * <p>Les identifiants sont lus depuis les propriétés {@code admin.email}
 * et {@code admin.password}, elles-mêmes alimentées par les variables
 * d'environnement {@code ADMIN_EMAIL} et {@code ADMIN_PASSWORD} (fichier {@code .env}).
 *
 * <p>Si les variables sont vides ou non définies, le seeder est ignoré
 * (log d'avertissement). Si un admin existe déjà, le seeder est aussi ignoré.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Vérifie que les identifiants sont configurés
        if (adminEmail == null || adminEmail.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {
            log.warn("AdminSeeder ignoré — ADMIN_EMAIL / ADMIN_PASSWORD non configurés dans .env.");
            return;
        }

        // 2. Vérifie si un admin existe déjà
        List<User> existingAdmins = userRepository.findByRole("ADMIN");
        if (!existingAdmins.isEmpty()) {
            log.info("AdminSeeder ignoré — {} administrateur(s) déjà présent(s) en base.", existingAdmins.size());
            return;
        }

        // 3. Vérifie que l'email n'est pas déjà pris par un non-admin
        if (userRepository.existsByEmail(adminEmail)) {
            log.warn("AdminSeeder ignoré — l'email '{}' existe déjà avec un rôle non-admin.", adminEmail);
            return;
        }

        // 4. Crée le compte admin
        User admin = User.builder()
                .email(adminEmail)
                .fullName("Administrateur")
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role("ADMIN")
                .status("ACTIVE")
                .kycStatus("NONE")
                .build();

        userRepository.save(admin);
        log.info("★★ AdminSeeder — compte administrateur créé : {}", adminEmail);
    }
}
