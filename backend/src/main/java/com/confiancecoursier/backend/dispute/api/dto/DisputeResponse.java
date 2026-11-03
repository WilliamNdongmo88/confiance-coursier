package com.confiancecoursier.backend.dispute.api.dto;

import com.confiancecoursier.backend.dispute.domain.Dispute;
import java.time.LocalDateTime;

public record DisputeResponse(
    Long id, Long courseId, Long openedBy,
    String motifCode, String description,
    String status, String decision,
    LocalDateTime createdAt, LocalDateTime decidedAt
) {
    public static DisputeResponse from(Dispute d) {
        return new DisputeResponse(
            d.getId(), d.getCourseId(), d.getOpenedBy(),
            d.getMotifCode(), d.getDescription(),
            d.getStatus(), d.getDecision(),
            d.getCreatedAt(), d.getDecidedAt()
        );
    }
}
