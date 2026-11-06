package com.confiancecoursier.backend.auth.service;

import com.confiancecoursier.backend.shared.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-066 — OTP : 5 essais maximum, quotas d'envoi 1/min et 5/h par email et par IP. */
class OtpServiceTest {

    /** Redis simulé en mémoire (les TTL sont simulés en vidant les clés concernées). */
    private final Map<String, String> redis = new HashMap<>();
    private OtpService otp;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(ops);

        doAnswer(i -> redis.put(i.getArgument(0), i.getArgument(1))).when(ops).set(anyString(), anyString(), any(Duration.class));
        when(ops.get(anyString())).thenAnswer(i -> redis.get((String) i.getArgument(0)));
        when(ops.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenAnswer(i -> redis.putIfAbsent(i.getArgument(0), i.getArgument(1)) == null);
        when(ops.increment(anyString())).thenAnswer(i -> {
            long v = Long.parseLong(redis.getOrDefault((String) i.getArgument(0), "0")) + 1;
            redis.put(i.getArgument(0), String.valueOf(v));
            return v;
        });
        when(template.delete(anyString())).thenAnswer(i -> redis.remove((String) i.getArgument(0)) != null);

        otp = new OtpService(template);
        ReflectionTestUtils.setField(otp, "emailEnabled", false);
    }

    /** Simule l'écoulement d'une minute (fin de la fenêtre « 1 envoi par minute »). */
    private void oneMinuteLater() {
        redis.keySet().removeIf(k -> k.startsWith("otp:rl:min:"));
    }

    private String freshCode(String email, String ip) {
        oneMinuteLater();
        return otp.generateOtp(email, ip);
    }

    // ── Essais ───────────────────────────────────────────────────────────────

    @Test
    void correctCodeIsSingleUse() {
        String code = otp.generateOtp("a@t.cm", "10.0.0.1");
        assertThat(otp.validateOtp("a@t.cm", code)).isTrue();
        assertThat(otp.validateOtp("a@t.cm", code)).isFalse();
    }

    @Test
    void fifthWrongAttemptInvalidatesTheCode() {
        String code = otp.generateOtp("a@t.cm", "10.0.0.1");
        for (int i = 0; i < 4; i++) {
            assertThat(otp.validateOtp("a@t.cm", "000000")).isFalse();
        }
        assertThatThrownBy(() -> otp.validateOtp("a@t.cm", "000000"))
                .isInstanceOf(TooManyRequestsException.class).hasMessageContaining("nouveau code");
        // 6e essai, même avec le bon code : refusé (code invalidé)
        assertThat(otp.validateOtp("a@t.cm", code)).isFalse();
    }

    @Test
    void newCodeResetsAttemptCounter() {
        otp.generateOtp("a@t.cm", "10.0.0.1");
        for (int i = 0; i < 4; i++) otp.validateOtp("a@t.cm", "000000");
        String code = freshCode("a@t.cm", "10.0.0.1");
        assertThat(otp.validateOtp("a@t.cm", "000000")).isFalse(); // 1er essai du nouveau code
        assertThat(otp.validateOtp("a@t.cm", code)).isTrue();
    }

    @Test
    void emailIsCaseInsensitive() {
        String code = otp.generateOtp("Admin@T.cm", "10.0.0.1");
        assertThat(otp.validateOtp("admin@t.cm", code)).isTrue();
    }

    // ── Quotas d'envoi ───────────────────────────────────────────────────────

    @Test
    void oneSendPerMinutePerEmail() {
        otp.generateOtp("a@t.cm", "10.0.0.1");
        assertThatThrownBy(() -> otp.generateOtp("a@t.cm", "10.0.0.2"))
                .isInstanceOf(TooManyRequestsException.class).hasMessageContaining("minute");
    }

    @Test
    void oneSendPerMinutePerIp() {
        otp.generateOtp("a@t.cm", "10.0.0.1");
        assertThatThrownBy(() -> otp.generateOtp("b@t.cm", "10.0.0.1"))
                .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void fiveSendsPerHourPerEmail() {
        for (int i = 0; i < 5; i++) freshCode("a@t.cm", "10.0.0." + i);
        assertThatThrownBy(() -> freshCode("a@t.cm", "10.0.0.9"))
                .isInstanceOf(TooManyRequestsException.class).hasMessageContaining("heure");
    }

    @Test
    void fiveSendsPerHourPerIp() {
        for (int i = 0; i < 5; i++) freshCode("user" + i + "@t.cm", "10.0.0.1");
        assertThatThrownBy(() -> freshCode("other@t.cm", "10.0.0.1"))
                .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void loopbackIpIsNotLimitedToAvoidBlockingEveryoneBehindTheDevProxy() {
        for (int i = 0; i < 8; i++) freshCode("user" + i + "@t.cm", "127.0.0.1");
    }
}
