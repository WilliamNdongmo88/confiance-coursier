package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.domain.PlatformSettingChange;
import com.confiancecoursier.backend.admin.repository.PlatformSettingChangeRepository;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * TICK-093 — historique des changements de réglages : qui a modifié quoi, quand, avec l'ancienne et la nouvelle valeur.
 * Appelé par chaque service qui écrit dans {@code platform_settings} ; rien n'est noté si la valeur ne change pas.
 */
@Service
public class SettingsHistoryService {

    public static final int DEFAULT_SIZE = 20;

    private final PlatformSettingChangeRepository changeRepository;
    private final UserRepository userRepository;

    public SettingsHistoryService(PlatformSettingChangeRepository changeRepository, UserRepository userRepository) {
        this.changeRepository = changeRepository;
        this.userRepository = userRepository;
    }

    public record ChangeRow(Long id, String settingKey, String oldValue, String newValue, LocalDateTime changedAt,
                            Long changedBy, String changedByName) {}

    public record ChangePage(List<ChangeRow> items, long total, int page, int size) {}

    /** Note la modification si la valeur change vraiment (« 20 » et « 20.0 » sont la même valeur). */
    public void record(String key, String oldValue, String newValue, Long adminId) {
        if (same(oldValue, newValue)) return;
        changeRepository.save(PlatformSettingChange.builder()
                .settingKey(key).oldValue(oldValue).newValue(newValue).changedBy(adminId).build());
    }

    @Transactional(readOnly = true)
    public ChangePage list(int page, int size) {
        int p = Math.max(0, page);
        int s = size <= 0 ? DEFAULT_SIZE : Math.min(size, 100);
        Page<PlatformSettingChange> result = changeRepository.findAll(
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "changedAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        List<Long> adminIds = result.getContent().stream().map(PlatformSettingChange::getChangedBy)
                .filter(Objects::nonNull).distinct().toList();
        Map<Long, User> admins = userRepository.findAllById(adminIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<ChangeRow> rows = result.getContent().stream().map(c -> {
            User a = c.getChangedBy() == null ? null : admins.get(c.getChangedBy());
            String name = a == null ? null : (a.getFullName() != null && !a.getFullName().isBlank() ? a.getFullName() : a.getEmail());
            return new ChangeRow(c.getId(), c.getSettingKey(), c.getOldValue(), c.getNewValue(), c.getChangedAt(),
                    c.getChangedBy(), name);
        }).toList();
        return new ChangePage(rows, result.getTotalElements(), p, s);
    }

    static boolean same(String a, String b) {
        String x = a == null || a.isBlank() ? null : a.trim();
        String y = b == null || b.isBlank() ? null : b.trim();
        if (x == null || y == null) return x == y;
        if (x.equals(y)) return true;
        try {
            return new BigDecimal(x).compareTo(new BigDecimal(y)) == 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
