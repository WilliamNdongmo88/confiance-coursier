package com.confiancecoursier.backend.payment.api;

import com.confiancecoursier.backend.payment.service.PaymentService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller pour la validation manuelle d'une course par le client.
 *
 * <p>Route : {@code POST /api/courses/{courseId}/validate}
 *
 * <p>Accessible à tout utilisateur authentifié dont l'identité est ensuite
 * vérifiée en service (seul le client propriétaire peut valider).
 */
@RestController
@RequestMapping("/api/courses")
public class ValidationController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public ValidationController(PaymentService paymentService, UserRepository userRepository) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    /**
     * Valide une course après examen des preuves.
     *
     * <ul>
     *   <li>La course passe de {@code PROOFS_SUBMITTED} à {@code COMPLETED}</li>
     *   <li>Une entrée {@code RELEASE} est créée dans {@code escrow_ledger}</li>
     *   <li>Le transfert de fonds est simulé (log seulement)</li>
     * </ul>
     *
     * @param courseId identifiant de la course
     * @return 200 avec message de confirmation
     */
    @PostMapping("/{courseId}/validate")
    public ResponseEntity<String> validate(@PathVariable Long courseId) {
        Long clientId = getCurrentUserId();
        paymentService.validateCourse(courseId, clientId);
        return ResponseEntity.ok("Course validée. Les fonds ont été libérés au coursier.");
    }

    private Long getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Utilisateur non trouvé."));
        return user.getId();
    }
}
