package com.confiancecoursier.backend.config;

import org.springframework.http.HttpMethod;

import com.confiancecoursier.backend.auth.service.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins = "http://localhost:4200";

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, UserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // ── Renvoie 401 (et non 403) quand l'utilisateur n'est pas authentifié ──
                // Spring Security 6 + JWT stateless retourne 403 par défaut sur les routes
                // protégées si aucun AuthenticationEntryPoint n'est configuré.
                // Ce point d'entrée garantit que l'intercepteur Angular reçoit bien un 401
                // et peut déclencher le mécanisme de refresh token.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Non authentifié."))
                        // TICK-067 : rôle insuffisant → 403 JSON (et non 400 ou une page HTML)
                        .accessDeniedHandler((request, response, denied) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN,
                                        "Accès refusé : action non autorisée pour votre rôle."))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        // ── Routes admin : seul le rôle ADMIN peut accéder ──
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // ── TICK-067 : rôles par route ─────────────────────────────────
                        // COURIER : preuves (écriture), KYC, demandes publiées, missions
                        .requestMatchers(HttpMethod.POST,   "/api/courses/*/proofs/**").hasRole("COURIER")
                        .requestMatchers(HttpMethod.DELETE, "/api/courses/*/proofs/**").hasRole("COURIER")
                        .requestMatchers("/api/kyc/**").hasRole("COURIER")
                        .requestMatchers(HttpMethod.GET, "/api/courses/published", "/api/courses/my-missions").hasRole("COURIER")

                        // CLIENT : création / modification / suppression de course, acceptation d'offre,
                        // paiement, validation, actions sur une course en retard, recherche de coursiers
                        .requestMatchers(HttpMethod.POST, "/api/courses").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.PUT, "/api/courses/*").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.DELETE, "/api/courses/*").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.GET, "/api/courses/my-courses").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.POST,
                                "/api/courses/*/offers/*/accept",
                                "/api/courses/*/accept-offer/*",
                                "/api/courses/*/validate",
                                "/api/courses/*/extend",
                                "/api/courses/*/cancel-overdue").hasRole("CLIENT")
                        .requestMatchers("/api/payment/**").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.GET, "/api/users/couriers").hasRole("CLIENT")

                        // CLIENT ou COURIER : conversation, litige, signalement, avis
                        .requestMatchers(HttpMethod.POST,
                                "/api/courses/*/conversations",
                                "/api/courses/*/review",
                                "/api/disputes",
                                "/api/reports").hasAnyRole("CLIENT", "COURIER")

                        // Lecture (détail de course, chat, offres, preuves, avis, profil) : authentifié,
                        // l'appartenance est vérifiée dans les services (403 sinon)
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }

    /** Corps JSON identique à {@code ErrorResponse} pour les refus de la chaîne de sécurité. */
    private static void writeError(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message
                + "\",\"timestamp\":\"" + java.time.LocalDateTime.now() + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // TICK-068 : origines lues dans app.cors.allowed-origins (CORS_ALLOWED_ORIGINS en production)
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(o -> !o.isEmpty()).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        // Passe le UserDetailsService directement dans le constructeur
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        // TICK-053 : le statut du compte (verrouille = suspendu) est verifie APRES le mot de passe.
        // Par defaut Spring le verifie avant, ce qui revelerait qu'un email est suspendu
        // sans connaitre son mot de passe.
        authProvider.setPreAuthenticationChecks(user -> { });
        authProvider.setPostAuthenticationChecks(new AccountStatusUserDetailsChecker());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}