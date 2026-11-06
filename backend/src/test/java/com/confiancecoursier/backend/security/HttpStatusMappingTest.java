package com.confiancecoursier.backend.security;

import com.confiancecoursier.backend.shared.exception.*;
import com.confiancecoursier.backend.shared.web.CorrelationIdFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import static org.assertj.core.api.Assertions.assertThat;

/** TICK-067 — refus d'accès → 403, ressource absente → 404, erreur imprévue → 500 avec référence. */
class HttpStatusMappingTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void notFoundIs404() {
        var r = handler.handleNotFound(new NotFoundException("Course introuvable."));
        assertThat(r.getStatusCode().value()).isEqualTo(404);
        assertThat(r.getBody().getMessage()).isEqualTo("Course introuvable.");
    }

    @Test
    void notFoundRemainsABusinessExceptionForExistingCatchBlocks() {
        assertThat(new NotFoundException("x")).isInstanceOf(BusinessException.class);
    }

    @Test
    void forbiddenIs403() {
        assertThat(handler.handleForbidden(new ForbiddenException("Vous n'êtes pas le propriétaire de cette course."))
                .getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void unexpectedErrorIs500WithCorrelationReference() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "abc12345");
        var r = handler.handleGeneralException(new IllegalStateException("boom"));
        assertThat(r.getStatusCode().value()).isEqualTo(500);
        assertThat(r.getBody().getMessage()).contains("réf. abc12345").doesNotContain("boom");
    }
}
