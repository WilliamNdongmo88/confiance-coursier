package com.confiancecoursier.backend.payment.api;


import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.auth.service.JwtService;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateRequest;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateResponse;
import com.confiancecoursier.backend.payment.service.PaymentService;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public PaymentController(PaymentService paymentService,
                              JwtService jwtService,
                              UserRepository userRepository) {
        this.paymentService = paymentService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    /**
     * POST /api/payment/initiate
     *
     * Lance le processus de paiement (simulé).
     * Calcule le total côté serveur, crée une ligne escrow HOLD et passe la course en IN_PROGRESS.
     *
     * Accessible à tout utilisateur authentifié ayant le rôle CLIENT.
     */
    @PostMapping("/initiate")
    public ResponseEntity<PaymentInitiateResponse> initiate(
            @Valid @RequestBody PaymentInitiateRequest req,
            Principal principal) {

        Long clientId = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."))
                .getId();

        PaymentInitiateResponse response = paymentService.initiate(req, clientId);
        return ResponseEntity.ok(response);
    }
}
