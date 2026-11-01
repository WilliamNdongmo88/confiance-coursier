package com.confiancecoursier.backend.payment.service;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateRequest;
import com.confiancecoursier.backend.payment.api.dto.PaymentInitiateResponse;
import com.confiancecoursier.backend.payment.domain.EscrowEntry;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Service de paiement (simulé).
 *
 * Taux de commission client par défaut : 5 %
 * Note : quand platform_settings sera peuplé (TICK-038), ce taux sera lu depuis la table.
 *
 * Calcul :
 *   base          = fraisReels + tarifCoursier
 *   fraisService  = base * tauxClient / 100
 *   total         = base + fraisService
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    /** Taux de frais de service côté client (5 %). Sera rendu configurable via platform_settings. */
    private static final BigDecimal CLIENT_FEE_RATE = new BigDecimal("5.00");

    private final CourseRepository courseRepository;
    private final EscrowRepository escrowRepository;

    public PaymentService(CourseRepository courseRepository, EscrowRepository escrowRepository) {
        this.courseRepository = courseRepository;
        this.escrowRepository = escrowRepository;
    }

    @Transactional
    public PaymentInitiateResponse initiate(PaymentInitiateRequest req, Long clientId) {
        Course course = courseRepository.findById(req.getCourseId())
                .orElseThrow(() -> new BusinessException("Course introuvable"));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Cette course ne vous appartient pas");
        }

        if ("IN_PROGRESS".equals(course.getStatus()) || "COMPLETED".equals(course.getStatus())) {
            throw new BusinessException("Cette course a déjà été payée");
        }

        // ── Calcul côté serveur (ne pas faire confiance au frontend) ──
        BigDecimal base         = req.getFraisReels().add(req.getTarifCoursier());
        BigDecimal fraisService = base.multiply(CLIENT_FEE_RATE)
                                      .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total        = base.add(fraisService);

        // ── Mise à jour de la course ──
        course.setStatus("IN_PROGRESS");
        course.setEscrowStatus("HELD");
        course.setCourseAmount(req.getTarifCoursier());
        course.setCommissionRate(CLIENT_FEE_RATE);
        course.setCommissionAmount(fraisService);
        course.setTotalAmount(total);
        courseRepository.save(course);

        // ── Écriture dans escrow_ledger ──
        String ref = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        EscrowEntry entry = EscrowEntry.builder()
                .courseId(req.getCourseId())
                .entryType("HOLD")
                .amount(total)
                .provider(req.getPaymentMethod().toUpperCase())
                .providerRef(ref)
                .status("PENDING")
                .build();
        escrowRepository.save(entry);

        log.info("[PAYMENT SIMULÉ] courseId={} total={} XAF method={} ref={}",
                req.getCourseId(), total, req.getPaymentMethod(), ref);

        return PaymentInitiateResponse.builder()
                .paymentRef(ref)
                .totalAmount(total)
                .status("PENDING")
                .courseId(req.getCourseId())
                .build();
    }
}
