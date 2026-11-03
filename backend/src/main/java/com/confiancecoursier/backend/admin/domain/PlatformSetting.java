package com.confiancecoursier.backend.admin.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entrée clé-valeur de la table {@code platform_settings}.
 *
 * <p>Utilisée pour stocker la configuration globale de la plateforme :
 * taux de commission client/coursier, tarif minimum coursier, etc.
 *
 * <p>Le champ {@code updatedBy} fait référence à l'admin qui a modifié
 * la valeur pour la dernière fois.
 */
@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Clé unique du paramètre (ex: {@code commission_rate_courier}). */
    @Column(name = "setting_key", nullable = false, unique = true, length = 50)
    private String settingKey;

    /** Valeur stockée sous forme de chaîne (conversion selon le contexte). */
    @Column(name = "setting_value", nullable = false, length = 255)
    private String settingValue;

    /** ID de l'admin qui a modifié la valeur. */
    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
