package com.confiancecoursier.backend.auth.api.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** TICK-051 — seul CLIENT ou COURIER est accepté à l'inscription. */
class RegisterRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void init() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void close() {
        factory.close();
    }

    private static RegisterRequest request(String role) {
        RegisterRequest r = new RegisterRequest();
        r.setEmail("user@test.com");
        r.setPassword("password123");
        r.setFullName("Test User");
        r.setRole(role);
        return r;
    }

    private Set<ConstraintViolation<RegisterRequest>> roleViolations(String role) {
        return validator.validateProperty(request(role), "role");
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLIENT", "COURIER", "client", "Courier", " CLIENT "})
    void acceptsSelfRegistrableRoles(String role) {
        assertThat(roleViolations(role)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "admin", "ROLE_ADMIN", "SUPERADMIN", "CLIENTADMIN", "CLIENT,ADMIN", "", "  "})
    void rejectsAdminAndUnknownRoles(String role) {
        assertThat(roleViolations(role)).isNotEmpty();
    }
}
