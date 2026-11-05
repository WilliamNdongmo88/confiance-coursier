package com.confiancecoursier.backend.security;

import com.confiancecoursier.backend.admin.api.AdminDisputeController;
import com.confiancecoursier.backend.admin.api.AdminReportController;
import com.confiancecoursier.backend.dispute.api.DisputeController;
import com.confiancecoursier.backend.report.api.ReportController;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TICK-052 — les décisions (résoudre un litige, traiter un signalement) ne doivent
 * exister que sous /api/admin/** (protégé par hasRole(ADMIN) dans SecurityConfig).
 */
class DecisionEndpointsAdminOnlyTest {

    private static List<String> paths(Class<?> controller) {
        RequestMapping base = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
        String prefix = base == null || base.path().length == 0 ? "" : base.path()[0];
        return Arrays.stream(controller.getDeclaredMethods())
                .map(m -> AnnotatedElementUtils.findMergedAnnotation(m, RequestMapping.class))
                .filter(java.util.Objects::nonNull)
                .flatMap(rm -> rm.path().length == 0 ? java.util.stream.Stream.of(prefix)
                        : Arrays.stream(rm.path()).map(p -> prefix + p))
                .toList();
    }

    @Test
    void publicDisputeControllerHasNoResolveEndpoint() {
        assertThat(paths(DisputeController.class)).noneMatch(p -> p.contains("resolve"));
    }

    @Test
    void publicReportControllerHasNoProcessEndpoint() {
        assertThat(paths(ReportController.class)).noneMatch(p -> p.contains("process"));
    }

    @Test
    void decisionEndpointsExistOnlyUnderAdminPrefix() {
        assertThat(paths(AdminDisputeController.class)).contains("/api/admin/disputes/{id}/resolve");
        assertThat(paths(AdminReportController.class)).contains("/api/admin/reports/{id}/process");
    }

    @Test
    void publicControllersStillExposeUserActions() {
        assertThat(paths(DisputeController.class)).contains("/api/disputes", "/api/disputes/{id}");
        assertThat(paths(ReportController.class)).contains("/api/reports");
    }
}
