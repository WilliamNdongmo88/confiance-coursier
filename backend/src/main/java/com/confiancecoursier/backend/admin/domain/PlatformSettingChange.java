package com.confiancecoursier.backend.admin.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** TICK-093 — une modification d'un réglage de la plateforme (table {@code platform_setting_changes}). */
@Entity
@Table(name = "platform_setting_changes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettingChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false, length = 50)
    private String settingKey;

    /** Valeur avant la modification ({@code null} : pas encore réglée, la valeur par défaut s'appliquait). */
    @Column(name = "old_value", length = 255)
    private String oldValue;

    /** Valeur après la modification ({@code null} : valeur effacée). */
    @Column(name = "new_value", length = 255)
    private String newValue;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) changedAt = LocalDateTime.now();
    }
}
