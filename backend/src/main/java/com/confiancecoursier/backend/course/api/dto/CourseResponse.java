package com.confiancecoursier.backend.course.api.dto;

import com.confiancecoursier.backend.course.domain.Course;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CourseResponse {
    private Long id;
    private Long clientId;
    private Long courierId;
    private String description;
    private String zone;
    private String status;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
    private BigDecimal courseAmount;
    private BigDecimal totalAmount;
    /** Frais réels (achats) payés par le client : un reçu devient obligatoire dans les preuves s'ils sont > 0 (TICK-064). */
    private BigDecimal realCosts;
    /** TICK-065b : échéance de dépôt des preuves (compte à rebours client et coursier). */
    private LocalDateTime proofDeadline;
    /** Prolongations déjà accordées par le client. */
    private Integer extensionCount;
    /** Passage en OVERDUE (début du délai de grâce). */
    private LocalDateTime overdueSince;
    /** Échéance de validation automatique (72 h après soumission des preuves). */
    private LocalDateTime autoValidateAt;
    private String currency;
    private Long acceptedOfferId;
    /** Identifiant du salon de chat associé à cette course (nullable si aucune offre encore) */
    private Long chatRoomId;

    // ── TICK-070 : suivi ────────────────────────────────────────────────────
    private LocalDateTime paidAt;
    private LocalDateTime completedAt;
    /** HELD | DISPUTED | RELEASED | REFUNDED | SPLIT — null avant paiement. */
    private String escrowStatus;
    private String clientName;
    private String courierName;

    // ── TICK-070 : finances, renseignées selon la personne qui consulte (null sinon) ──
    /** Client et admin : taux des frais de service client (%). */
    private BigDecimal commissionRate;
    /** Client et admin : montant des frais de service client. */
    private BigDecimal commissionAmount;
    /** Coursier et admin : taux de commission prélevé sur le tarif (%). */
    private BigDecimal commissionRateCourier;
    /** Coursier et admin : commission prélevée sur le tarif. */
    private BigDecimal courierCommissionAmount;
    /** Coursier et admin : montant net versé au coursier = tarif − commission + frais réels. */
    private BigDecimal courierAmount;

    /** TICK-073 : la personne qui consulte doit encore noter cette course terminée. */
    private Boolean reviewDue;

    /** Qui consulte la course : détermine les montants visibles. */
    public enum Viewer { CLIENT, COURIER, ADMIN, OTHER }

    /** Mapping de base sans chatRoomId (utilisé dans les contextes sans accès au repo) */
    public static CourseResponse fromEntity(Course course) {
        return fromEntity(course, null);
    }

    /** Mapping complet avec chatRoomId */
    public static CourseResponse fromEntity(Course course, Long chatRoomId) {
        CourseResponse dto = new CourseResponse();
        dto.setId(course.getId());
        dto.setClientId(course.getClientId());
        dto.setCourierId(course.getCourierId());
        dto.setDescription(course.getDescription());
        dto.setZone(course.getZone());
        dto.setStatus(course.getStatus());
        dto.setScheduledAt(course.getScheduledAt());
        dto.setCreatedAt(course.getCreatedAt());
        dto.setCourseAmount(course.getCourseAmount());
        dto.setTotalAmount(course.getTotalAmount());
        dto.setRealCosts(course.getRealCosts());
        dto.setProofDeadline(course.getProofDeadline());
        dto.setExtensionCount(course.getExtensionCount());
        dto.setOverdueSince(course.getOverdueSince());
        dto.setAutoValidateAt(course.getAutoValidateAt());
        dto.setCurrency(course.getCurrency());
        dto.setAcceptedOfferId(course.getAcceptedOfferId());
        dto.setChatRoomId(chatRoomId);
        dto.setPaidAt(course.getPaidAt());
        dto.setCompletedAt(course.getCompletedAt());
        dto.setEscrowStatus(course.getEscrowStatus());
        return dto;
    }

    /**
     * Mapping complet (TICK-070) : suivi, noms des parties et montants visibles par {@code viewer}.
     * Le client ne voit jamais la commission coursier ; le coursier ne voit pas les frais de service client.
     */
    public static CourseResponse of(Course course, Long chatRoomId, Viewer viewer,
                                    String clientName, String courierName) {
        CourseResponse dto = fromEntity(course, chatRoomId);
        dto.setClientName(clientName);
        dto.setCourierName(course.getCourierId() == null ? null : courierName);

        boolean client = viewer == Viewer.CLIENT || viewer == Viewer.ADMIN;
        boolean courier = viewer == Viewer.COURIER || viewer == Viewer.ADMIN;
        if (client) {
            dto.setCommissionRate(course.getCommissionRate());
            dto.setCommissionAmount(course.getCommissionAmount());
        }
        if (courier) {
            dto.setCommissionRateCourier(course.getCommissionRateCourier());
            dto.setCourierAmount(course.getCourierAmount());
            if (course.getCourierAmount() != null && course.getCourseAmount() != null) {
                BigDecimal real = course.getRealCosts() == null ? BigDecimal.ZERO : course.getRealCosts();
                // commission = tarif − (net − frais réels)
                dto.setCourierCommissionAmount(course.getCourseAmount()
                        .subtract(course.getCourierAmount().subtract(real)).max(BigDecimal.ZERO));
            }
        }
        if (viewer == Viewer.COURIER) {
            // Le total payé inclut les frais de service client : non pertinent pour le coursier
            dto.setTotalAmount(null);
        }
        if (viewer == Viewer.OTHER) {
            // Coursier qui consulte une demande publiée : aucun montant de paiement
            dto.setTotalAmount(null);
            dto.setRealCosts(null);
        }
        return dto;
    }
}