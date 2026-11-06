package com.confiancecoursier.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** TICK-068 — configuration obligatoire et absence de secrets dans les fichiers versionnés. */
class RequiredConfigurationCheckTest {

    private static MockEnvironment withAll(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        RequiredConfigurationCheck.ALWAYS.forEach(k -> env.setProperty(k, "x"));
        RequiredConfigurationCheck.PROD_ONLY.forEach(k -> env.setProperty(k, "x"));
        env.setActiveProfiles(profiles);
        return env;
    }

    @Test
    void prodWithoutAnythingFailsWithTheFullList() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertThatThrownBy(() -> RequiredConfigurationCheck.check(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("production")
                .hasMessageContaining("DB_PASSWORD")
                .hasMessageContaining("JWT_SECRET_KEY")
                .hasMessageContaining("DB_URL")
                .hasMessageContaining("CORS_ALLOWED_ORIGINS")
                .hasMessageContaining(".env.example");
    }

    @Test
    void blankValueCountsAsMissing() {
        MockEnvironment env = withAll("prod");
        env.setProperty("MINIO_SECRET_KEY", "  ");
        assertThatThrownBy(() -> RequiredConfigurationCheck.check(env)).hasMessageContaining("MINIO_SECRET_KEY");
    }

    @Test
    void completeProdConfigurationStarts() {
        assertThatCode(() -> RequiredConfigurationCheck.check(withAll("prod"))).doesNotThrowAnyException();
    }

    @Test
    void devDoesNotRequireProdOnlyVariables() {
        MockEnvironment env = new MockEnvironment();
        RequiredConfigurationCheck.ALWAYS.forEach(k -> env.setProperty(k, "x"));
        env.setActiveProfiles("dev");
        assertThatCode(() -> RequiredConfigurationCheck.check(env)).doesNotThrowAnyException();
    }

    @Test
    void devStillRequiresSecrets() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        assertThatThrownBy(() -> RequiredConfigurationCheck.check(env)).hasMessageContaining("DB_PASSWORD");
    }

    // ── Fichiers versionnés : aucun secret en clair ──────────────────────────

    private static String read(String path) throws IOException {
        return Files.readString(Path.of(path), StandardCharsets.UTF_8);
    }

    @Test
    void versionedConfigurationContainsNoSecretValues() throws IOException {
        String props = read("src/main/resources/application.properties");
        for (String key : new String[]{"spring.datasource.password", "jwt.secret", "minio.access-key",
                "minio.secret-key", "brevo.api.key", "admin.password"}) {
            assertThat(props).as(key).containsPattern("(?m)^" + Pattern.quote(key) + "=\\$\\{[A-Z_]+(:)?\\}");
        }
        assertThat(props).doesNotContain("minioadmin");
        assertThat(props).containsPattern("(?m)^app\\.otp\\.dev-log=false$");
        assertThat(read("../docker-compose.yml")).doesNotContain("minioadmin")
                .containsPattern("POSTGRES_PASSWORD: \\$\\{DB_PASSWORD");
    }

    @Test
    void otpCodesAreLoggedOnlyInDevProfile() throws IOException {
        assertThat(read("src/main/resources/application-dev.properties")).contains("app.otp.dev-log=true");
        assertThat(read("src/main/resources/application-prod.properties")).contains("app.otp.dev-log=false");
    }
}
