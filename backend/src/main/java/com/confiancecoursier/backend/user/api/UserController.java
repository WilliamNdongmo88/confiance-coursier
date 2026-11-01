package com.confiancecoursier.backend.user.api;

import com.confiancecoursier.backend.user.api.dto.CourierSummaryResponse;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints liés aux utilisateurs (hors authentification).
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * GET /api/users/couriers
     *
     * Retourne la liste des coursiers actifs triés par trustScore décroissant.
     * Accessible à tout utilisateur authentifié (CLIENT ou COURIER).
     *
     * Note: quand le module KYC sera implémenté (TICK-023), ce filtre sera
     * remplacé par role=COURIER AND kycStatus=APPROVED.
     */
    @GetMapping("/couriers")
    public ResponseEntity<List<CourierSummaryResponse>> getAvailableCouriers() {
        List<CourierSummaryResponse> couriers = userRepository
                .findByRoleAndStatusOrderByTrustScoreDesc("COURIER", "ACTIVE")
                .stream()
                .map(CourierSummaryResponse::fromUser)
                .toList();

        return ResponseEntity.ok(couriers);
    }
}
