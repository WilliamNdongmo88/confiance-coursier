package com.confiancecoursier.backend.user.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.api.dto.CourierSummaryResponse;
import com.confiancecoursier.backend.user.api.dto.UpdateProfileRequest;
import com.confiancecoursier.backend.user.api.dto.UserProfileResponse;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * Endpoints liés aux utilisateurs (hors authentification).
 *
 * Routes :
 *  - GET  /api/users/me       → profil complet de l'utilisateur connecté
 *  - PUT  /api/users/me       → mise à jour partielle du profil
 *  - GET  /api/users/couriers → liste des coursiers actifs (pour SelectCourierComponent)
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final com.confiancecoursier.backend.review.repository.ReviewRepository reviewRepository;

    public UserController(UserRepository userRepository,
                          com.confiancecoursier.backend.review.repository.ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
    }

    /** Profil + nombre d'avis reçus (TICK-078 : la note n'est affichée que s'il existe des avis). */
    private UserProfileResponse profileOf(User user) {
        UserProfileResponse r = UserProfileResponse.fromUser(user);
        r.setReviewCount(reviewRepository.countByTargetId(user.getId()));
        return r;
    }

    // ─── Profil personnel ─────────────────────────────────────────────────────

    /**
     * GET /api/users/me
     *
     * Retourne le profil complet de l'utilisateur connecté.
     * Accessible à tout utilisateur authentifié (CLIENT, COURIER, ADMIN).
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(Principal principal) {
        User user = resolveUser(principal);
        return ResponseEntity.ok(profileOf(user));
    }

    /**
     * PUT /api/users/me
     *
     * Met à jour les champs de profil modifiables :
     *   fullName, phone, country, city.
     *
     * L'email (clé d'auth), le mot de passe, le rôle, le statut et le trustScore
     * sont intentionnellement exclus de cette route.
     *
     * @param request les champs à mettre à jour (tous optionnels — null = inchangé)
     * @return le profil mis à jour
     */
    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Principal principal
    ) {
        User user = resolveUser(principal);

        // Mise à jour partielle : on ne modifie un champ que s'il est fourni (non null)
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getCountry() != null) {
            user.setCountry(request.getCountry().trim());
        }
        if (request.getCity() != null) {
            user.setCity(request.getCity().trim());
        }

        userRepository.save(user);
        return ResponseEntity.ok(profileOf(user));
    }

    // ─── Coursiers disponibles ────────────────────────────────────────────────

    /**
     * GET /api/users/couriers
     *
     * Retourne la liste des coursiers actifs triés par trustScore décroissant.
     * Accessible à tout utilisateur authentifié (CLIENT ou COURIER).
     *
     * Note: filtre par kycStatus=APPROVED sera ajouté une fois que l'admin
     * aura la possibilité d'approuver les KYC (TICK-038).
     * Pour l'instant on retourne tous les COURIER ACTIVE.
     */
    @GetMapping("/couriers")
    public ResponseEntity<List<CourierSummaryResponse>> getAvailableCouriers() {
        List<CourierSummaryResponse> couriers = userRepository
                // Seuls les coursiers KYC APPROVED peuvent être contactés (POST /conversations le refuse sinon)
                .findByRoleAndStatusAndKycStatusOrderByTrustScoreDesc("COURIER", "ACTIVE", "APPROVED")
                .stream()
                .map(CourierSummaryResponse::fromUser)
                .toList();

        return ResponseEntity.ok(couriers);
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private User resolveUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé."));
    }
}
