package com.confiancecoursier.backend.review.api.dto;

import com.confiancecoursier.backend.review.domain.Review;

import java.time.LocalDateTime;

public record ReviewResponse(
    Long id,
    Long courseId,
    Long authorId,
    Long targetId,
    String reviewerRole,
    Integer stars,
    String comment,
    LocalDateTime createdAt
) {
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
            r.getId(), r.getCourseId(), r.getAuthorId(), r.getTargetId(),
            r.getReviewerRole(), r.getStars(), r.getComment(), r.getCreatedAt()
        );
    }
}
