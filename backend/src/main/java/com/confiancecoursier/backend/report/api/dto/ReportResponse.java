package com.confiancecoursier.backend.report.api.dto;

import com.confiancecoursier.backend.report.domain.Report;
import java.time.LocalDateTime;

public record ReportResponse(
    Long id, Long reporterId, Long targetId,
    String motif, String description,
    String status, String decision,
    LocalDateTime createdAt
) {
    public static ReportResponse from(Report r) {
        return new ReportResponse(
            r.getId(), r.getReporterId(), r.getTargetId(),
            r.getMotif(), r.getDescription(),
            r.getStatus(), r.getDecision(),
            r.getCreatedAt()
        );
    }
}
