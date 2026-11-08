package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import com.confiancecoursier.backend.admin.domain.PlatformSettingChange;
import com.confiancecoursier.backend.admin.repository.PlatformSettingChangeRepository;
import com.confiancecoursier.backend.admin.repository.PlatformSettingRepository;
import com.confiancecoursier.backend.admin.service.PlatformRulesService.Rules;
import com.confiancecoursier.backend.course.service.ProofDeadlinePolicy;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** TICK-093 — règles et délais modifiables, bornes, historique des changements. */
class PlatformRulesServiceTest {

    private final Map<String, String> store = new HashMap<>();
    private final List<PlatformSettingChange> changes = new ArrayList<>();
    private PlatformRulesService rules;
    private CommissionService commissions;

    @BeforeEach
    void setUp() {
        PlatformSettingRepository repo = mock(PlatformSettingRepository.class);
        when(repo.findBySettingKey(anyString())).thenAnswer(inv -> {
            String k = inv.getArgument(0);
            return store.containsKey(k)
                    ? Optional.of(PlatformSetting.builder().settingKey(k).settingValue(store.get(k)).build())
                    : Optional.empty();
        });
        when(repo.save(any(PlatformSetting.class))).thenAnswer(inv -> {
            PlatformSetting s = inv.getArgument(0);
            store.put(s.getSettingKey(), s.getSettingValue());
            return s;
        });
        PlatformSettingChangeRepository changeRepo = mock(PlatformSettingChangeRepository.class);
        when(changeRepo.save(any(PlatformSettingChange.class))).thenAnswer(inv -> {
            changes.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        commissions = new CommissionService(repo, new SettingsHistoryService(changeRepo, mock(UserRepository.class)));
        rules = new PlatformRulesService(commissions, new ProofDeadlinePolicy(commissions));
    }

    @Test
    void defaultsMatchTheValuesUsedByTheServerWhenNothingIsSet() {
        Rules r = rules.get();
        assertThat(r.refundFeesOnFullRefund()).isFalse();
        assertThat(r.refundFeesOnNoShow()).isTrue();
        assertThat(r.proofDeadlineHours()).isEqualTo(ProofDeadlinePolicy.DEFAULT_DEADLINE_HOURS);
        assertThat(r.reminderHoursBefore()).isEqualTo(ProofDeadlinePolicy.DEFAULT_REMINDER_HOURS_BEFORE);
        assertThat(r.overdueGraceHours()).isEqualTo(ProofDeadlinePolicy.DEFAULT_GRACE_HOURS);
        assertThat(r.maxExtensions()).isEqualTo(ProofDeadlinePolicy.DEFAULT_MAX_EXTENSIONS);
        assertThat(r.autoValidateHours()).isEqualTo(72);
    }

    @Test
    void savedValuesAreReadByTheDeadlinePolicyAndEachRealChangeIsLogged() {
        rules.update(new Rules(true, true, 36, 6, 24, 0, 72), 9L);

        ProofDeadlinePolicy policy = new ProofDeadlinePolicy(commissions);
        assertThat(policy.deadlineHours()).isEqualTo(36);
        assertThat(policy.graceHours()).isEqualTo(24);
        assertThat(policy.maxExtensions()).isZero();
        assertThat(commissions.getBooleanSetting(PlatformRulesService.KEY_REFUND_FEES_FULL_REFUND, false)).isTrue();

        // 7 réglages écrits la première fois (aucun n'existait) : 7 lignes d'historique, toutes signées par l'admin
        assertThat(changes).hasSize(7).allMatch(c -> c.getChangedBy() == 9L && c.getOldValue() == null);

        // Deuxième enregistrement : seule l'échéance change → une seule ligne de plus
        rules.update(new Rules(true, true, 48, 6, 24, 0, 72), 9L);
        assertThat(changes).hasSize(8);
        assertThat(changes.get(7).getSettingKey()).isEqualTo(PlatformRulesService.KEY_DEADLINE_HOURS);
        assertThat(changes.get(7).getOldValue()).isEqualTo("36");
        assertThat(changes.get(7).getNewValue()).isEqualTo("48");
    }

    @Test
    void outOfBoundsValuesAreRefusedAndNothingIsWritten() {
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 0, 6, 48, 2, 72), 1L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 200, 6, 48, 2, 72), 1L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 6, 6, 48, 2, 72), 1L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("avant l'échéance");
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 24, 6, 0, 2, 72), 1L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 24, 6, 48, 6, 72), 1L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 24, 6, 48, 2, 12), 1L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("validation automatique");
        assertThatThrownBy(() -> rules.update(new Rules(false, true, 24, 6, 48, 2, 200), 1L)).isInstanceOf(BusinessException.class);
        assertThat(store).isEmpty();
        assertThat(changes).isEmpty();
    }

    @Test
    void autoValidationDelayIsReadFromTheSettingByThePolicy() {
        rules.update(new Rules(false, true, 24, 6, 48, 2, 120), 3L);
        assertThat(new ProofDeadlinePolicy(commissions).autoValidateHours()).isEqualTo(120);
        assertThat(rules.get().autoValidateHours()).isEqualTo(120);
    }

    @Test
    void sameNumericValueWrittenDifferentlyIsNotAChange() {
        assertThat(SettingsHistoryService.same("20", "20.00")).isTrue();
        assertThat(SettingsHistoryService.same(null, " ")).isTrue();
        assertThat(SettingsHistoryService.same("677000000", null)).isFalse();
        assertThat(SettingsHistoryService.same("true", "false")).isFalse();
    }
}
