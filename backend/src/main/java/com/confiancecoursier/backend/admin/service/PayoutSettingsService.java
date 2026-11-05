package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.PayoutSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdatePayoutSettingsRequest;
import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import com.confiancecoursier.backend.admin.repository.PlatformSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service de gestion des coordonnées de reversement de l'administrateur.
 *
 * <p>Les données sont stockées dans la table {@code platform_settings}
 * sous forme de clés-valeurs — exactement comme les taux de commission.
 *
 * <p><strong>Aucune donnée de paiement n'est transmise à un prestataire :
 * ces informations servent uniquement de référence pour les reversements
 * manuels de l'admin.</strong>
 */
@Service
public class PayoutSettingsService {

    // ── Clés platform_settings ───────────────────────────────────────────────
    public static final String KEY_MTN_NUMBER          = "payout_mtn_number";
    public static final String KEY_MTN_NAME            = "payout_mtn_name";
    public static final String KEY_ORANGE_NUMBER       = "payout_orange_number";
    public static final String KEY_ORANGE_NAME         = "payout_orange_name";
    public static final String KEY_BANK_IBAN           = "payout_bank_iban";
    public static final String KEY_BANK_NAME           = "payout_bank_name";
    public static final String KEY_BANK_ACCOUNT_NAME   = "payout_bank_account_name";
    public static final String KEY_PREFERRED_METHOD    = "payout_preferred_method";

    private final PlatformSettingRepository settingRepository;

    public PayoutSettingsService(PlatformSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    // ─── Lecture ──────────────────────────────────────────────────────────────

    public PayoutSettingsResponse getSettings() {
        return PayoutSettingsResponse.builder()
                .mtnNumber(getSetting(KEY_MTN_NUMBER))
                .mtnName(getSetting(KEY_MTN_NAME))
                .orangeNumber(getSetting(KEY_ORANGE_NUMBER))
                .orangeName(getSetting(KEY_ORANGE_NAME))
                .bankIban(getSetting(KEY_BANK_IBAN))
                .bankName(getSetting(KEY_BANK_NAME))
                .bankAccountName(getSetting(KEY_BANK_ACCOUNT_NAME))
                .preferredMethod(getSetting(KEY_PREFERRED_METHOD))
                .build();
    }

    // ─── Mise à jour ──────────────────────────────────────────────────────────

    @Transactional
    public PayoutSettingsResponse updateSettings(UpdatePayoutSettingsRequest req, Long adminId) {
        upsertIfPresent(KEY_MTN_NUMBER,        req.mtnNumber(),        adminId);
        upsertIfPresent(KEY_MTN_NAME,          req.mtnName(),          adminId);
        upsertIfPresent(KEY_ORANGE_NUMBER,     req.orangeNumber(),     adminId);
        upsertIfPresent(KEY_ORANGE_NAME,       req.orangeName(),       adminId);
        upsertIfPresent(KEY_BANK_IBAN,         req.bankIban(),         adminId);
        upsertIfPresent(KEY_BANK_NAME,         req.bankName(),         adminId);
        upsertIfPresent(KEY_BANK_ACCOUNT_NAME, req.bankAccountName(),  adminId);
        upsertIfPresent(KEY_PREFERRED_METHOD,  req.preferredMethod(),  adminId);
        return getSettings();
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private String getSetting(String key) {
        return settingRepository.findBySettingKey(key)
                .map(PlatformSetting::getSettingValue)
                .orElse(null);
    }

    /** N'écrit que si la valeur fournie est non nulle et non vide. */
    private void upsertIfPresent(String key, String value, Long adminId) {
        if (value == null) return;
        Optional<PlatformSetting> existing = settingRepository.findBySettingKey(key);
        if (existing.isPresent()) {
            PlatformSetting s = existing.get();
            s.setSettingValue(value);
            s.setUpdatedBy(adminId);
            settingRepository.save(s);
        } else {
            settingRepository.save(PlatformSetting.builder()
                    .settingKey(key)
                    .settingValue(value)
                    .updatedBy(adminId)
                    .build());
        }
    }
}
