package com.confiancecoursier.backend.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    /**
     * Claim qui distingue les deux usages d'un JWT (TICK-054).
     * Un refresh token (7 j) ne doit jamais être accepté comme jeton d'accès,
     * et un jeton d'accès ne doit jamais servir à renouveler une session.
     */
    public static final String TYPE_CLAIM = "typ";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.put(TYPE_CLAIM, TYPE_ACCESS);
        return buildToken(claims, userDetails, jwtExpiration);
    }

    /**
     * Génère un refresh token (durée de vie plus longue, configurée par
     * {@code jwt.refresh-expiration}). Le refresh token est stocké côté service
     * dans Redis (clé {@code refresh:<userId>}) afin de pouvoir l'invalider.
     */
    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(TYPE_CLAIM, TYPE_REFRESH);
        // jti unique : deux refresh émis dans la même seconde restent distincts (rotation fiable).
        claims.put("jti", UUID.randomUUID().toString());
        return buildToken(claims, userDetails, refreshExpiration);
    }

    /** {@code true} si le token est signé, non expiré et de type {@code access}. */
    public boolean isAccessToken(String token) {
        return TYPE_ACCESS.equals(extractClaim(token, c -> c.get(TYPE_CLAIM, String.class)));
    }

    /** {@code true} si le token est signé, non expiré et de type {@code refresh}. */
    public boolean isRefreshToken(String token) {
        return TYPE_REFRESH.equals(extractClaim(token, c -> c.get(TYPE_CLAIM, String.class)));
    }

    /**
     * Indique si le token est expiré. La vérification de la signature est
     * réalisée lors de l'extraction des claims ({@link #extractUsername(String)}),
     * qui lève une exception si le token est invalide ou expiré.
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    /**
     * Valide un jeton <strong>d'accès</strong> pour l'utilisateur donné.
     * Un refresh token (claim {@code typ=refresh}) ou un jeton sans type est refusé (TICK-054).
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername())
                && !isTokenExpired(token)
                && isAccessToken(token);
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}