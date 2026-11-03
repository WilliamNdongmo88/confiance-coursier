package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.api.dto.UserProfileResponse;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur admin pour la gestion des utilisateurs.
 *
 * <p>Toutes les routes sont sécurisées par {@code ROLE_ADMIN} dans {@code SecurityConfig}.
 *
 * <ul>
 *   <li>{@code GET  /api/admin/users}                     — liste des utilisateurs (filtres {@code ?role=} {@code ?status=})</li>
 *   <li>{@code POST /api/admin/users/{id}/suspend}       — suspendre un utilisateur</li>
 *   <li>{@code POST /api/admin/users/{id}/activate}      — réactiver un utilisateur</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * GET /api/admin/users?role=COURIER&status=ACTIVE
     *
     * Liste tous les utilisateurs. Les filtres {@code role} et {@code status}
     * sont optionnels et combinables.
     */
    @GetMapping
    public ResponseEntity<List<UserProfileResponse>> listUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {

        List<User> users;

        boolean hasRole   = role != null && !role.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        if (hasRole && hasStatus) {
            users = userRepository.findByRoleAndStatus(role.toUpperCase(), status.toUpperCase());
        } else if (hasRole) {
            users = userRepository.findByRole(role.toUpperCase());
        } else if (hasStatus) {
            users = userRepository.findByStatus(status.toUpperCase());
        } else {
            users = userRepository.findAll();
        }

        return ResponseEntity.ok(users.stream().map(UserProfileResponse::fromUser).toList());
    }

    /**
     * POST /api/admin/users/{id}/suspend
     *
     * Suspend un utilisateur (passe son statut à {@code SUSPENDED}).
     */
    @PostMapping("/{id}/suspend")
    public ResponseEntity<UserProfileResponse> suspend(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable."));

        user.setStatus("SUSPENDED");
        userRepository.save(user);
        return ResponseEntity.ok(UserProfileResponse.fromUser(user));
    }

    /**
     * POST /api/admin/users/{id}/activate
     *
     * Réactive un utilisateur suspendu (passe son statut à {@code ACTIVE}).
     */
    @PostMapping("/{id}/activate")
    public ResponseEntity<UserProfileResponse> activate(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Utilisateur introuvable."));

        user.setStatus("ACTIVE");
        userRepository.save(user);
        return ResponseEntity.ok(UserProfileResponse.fromUser(user));
    }
}
