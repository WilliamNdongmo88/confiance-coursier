package com.confiancecoursier.backend.admin.api.dto;

import com.confiancecoursier.backend.dispute.api.dto.DisputeResponse;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dossier complet d'un litige pour l'arbitrage admin ({@code GET /api/admin/disputes/{id}}).
 *
 * <p>Les montants « si … » sont calculés avec les mêmes règles qu'{@code EscrowService}, pour que l'admin
 * voie avant de décider qui reçoit quoi. Ils valent {@code null} quand plus rien n'est en séquestre.
 */
public record AdminDisputeDetailResponse(
        DisputeResponse dispute,
        /** CLIENT | COURIER : rôle de la personne qui a ouvert le litige. */
        String openedByRole,
        Party client,
        Party courier,
        CourseInfo course,
        Amounts amounts,
        List<ProofResponse> proofs,
        /** Salle de discussion client–coursier (lecture admin autorisée), null si aucune. */
        Long chatRoomId
) {
    public record Party(Long id, String fullName, String email, String status) {}

    public record CourseInfo(
            Long id, String description, String zone, String status, String escrowStatus,
            LocalDateTime paidAt, LocalDateTime proofDeadline, LocalDateTime completedAt
    ) {}

    public record Amounts(
            /** Total encore bloqué en séquestre pour cette course. */
            BigDecimal held,
            BigDecimal courseAmount,
            BigDecimal realCosts,
            /** Ce que reçoit le coursier si le paiement lui est libéré. */
            BigDecimal courierOnRelease,
            /** Frais plateforme (client + commission coursier) prélevés à la libération. */
            BigDecimal platformOnRelease,
            /** Ce que récupère le client en cas de remboursement total. */
            BigDecimal clientOnFullRefund,
            /** Frais de service gardés par la plateforme en cas de remboursement total (0 si remboursés). */
            BigDecimal platformOnFullRefund
    ) {}
}
