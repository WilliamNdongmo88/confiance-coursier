package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.CommissionSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdateCommissionRequest;
import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import com.confiancecoursier.backend.admin.repository.PlatformSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service de gestion des paramètres de commission de la plateforme.
 *
 * <p>Les paramètres sont stockés dans la table {@code platform_settings}
 * sous forme de clé-valeur :
 * <ul>
 *   <li>{@code commission_rate_client}   — % prélevé au client (défaut 0)</li>
 *   <li>{@code commission_rate_courier}  — % prélevé au coursier (défaut 20)</li>
 *   <li>{@code tarif_minimum_coursier}   — tarif minimum en XAF (défaut 5000)</li>
 * </ul>
 *
 * <p>Si aucun paramètre n'existe encore en base, les valeurs par défaut
 * de la spec fonctionnelle (§1.1 + §9) sont renvoyées.
 */
@Service
public class CommissionService {

    // Clés platform_settings
    private static final String KEY_COMMISSION_RATE_CLIENT  = "commission_rate_client";
    private static final String KEY_COMMISSION_RATE_COURIER = "commission_rate_courier";
    private static final String KEY_TARIF_MINIMUM_COURIER   = "tarif_minimum_coursier";

    // Valeurs par défaut (spec fonctionnelle §1.1)
    private static final BigDecimal DEFAULT_RATE_CLIENT  = BigDecimal.ZERO;
    private static final BigDecimal DEFAULT_RATE_COURIER = new BigDecimal("20");
    private static final BigDecimal DEFAULT_TARIF_MIN    = new BigDecimal("5000");

    private final PlatformSettingRepository settingRepository;

    public CommissionService(PlatformSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    // ─── Lecture ──────────────────────────────────────────────────────────

    /**
     * Retourne la configuration actuelle des commissions.
     * Les valeurs manquantes en base sont remplacées par les défauts.
     */
    public CommissionSettingsResponse getCommissionSettings() {
        return CommissionSettingsResponse.builder()
                .commissionRateClient(getSetting(KEY_COMMISSION_RATE_CLIENT, DEFAULT_RATE_CLIENT))
                .commissionRateCourier(getSetting(KEY_COMMISSION_RATE_COURIER, DEFAULT_RATE_COURIER))
                .tarifMinimumCoursier(getSetting(KEY_TARIF_MINIMUM_COURIER, DEFAULT_TARIF_MIN))
                .currency("XAF")
                .build();
    }

    // ─── Mise à jour ──────────────────────────────────────────────────────

    /**
     * Met à jour (ou crée) les paramètres de commission.
     *
     * @param request les nouveaux paramètres validés
     * @param adminId  ID de l'admin qui effectue la modification
     * @return la configuration mise à jour
     */
    @Transactional
    public CommissionSettingsResponse updateCommissionSettings(UpdateCommissionRequest request, Long adminId) {
        upsertSetting(KEY_COMMISSION_RATE_CLIENT,  request.commissionRateClient().toPlainString(),  adminId);
        upsertSetting(KEY_COMMISSION_RATE_COURIER, request.commissionRateCourier().toPlainString(), adminId);
        upsertSetting(KEY_TARIF_MINIMUM_COURIER,   request.tarifMinimumCoursier().toPlainString(), adminId);

        return getCommissionSettings();
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────

    private BigDecimal getSetting(String key, BigDecimal defaultValue) {
        return settingRepository.findBySettingKey(key)
                .map(s -> new BigDecimal(s.getSettingValue()))
                .orElse(defaultValue);
    }

    /**
     * Lit un paramètre booléen depuis {@code platform_settings}.
     * Retourne {@code defaultValue} si le paramètre est absent ou illisible.
     */
    public boolean getBooleanSetting(String key, boolean defaultValue) {
        return settingRepository.findBySettingKey(key)
                .map(s -> Boolean.parseBoolean(s.getSettingValue()))
                .orElse(defaultValue);
    }

    /**
     * Lit un paramètre entier depuis {@code platform_settings} (TICK-065b).
     * Retourne {@code defaultValue} si le paramètre est absent, illisible ou négatif.
     */
    public int getIntSetting(String key, int defaultValue) {
        return settingRepository.findBySettingKey(key)
                .map(s -> {
                    try {
                        int v = Integer.parseInt(s.getSettingValue().trim());
                        return v >= 0 ? v : defaultValue;
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    private void upsertSetting(String key, String value, Long adminId) {
        Optional<PlatformSetting> existing = settingRepository.findBySettingKey(key);
        if (existing.isPresent()) {
            PlatformSetting setting = existing.get();
            setting.setSettingValue(value);
            setting.setUpdatedBy(adminId);
            settingRepository.save(setting);
        } else {
            PlatformSetting newSetting = PlatformSetting.builder()
                    .settingKey(key)
                    .settingValue(value)
                    .updatedBy(adminId)
                    .build();
            settingRepository.save(newSetting);
        }
    }
}
