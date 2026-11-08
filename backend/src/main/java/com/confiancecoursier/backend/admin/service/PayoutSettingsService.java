package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.api.dto.PayoutSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdatePayoutSettingsRequest;
import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import com.confiancecoursier.backend.admin.repository.PlatformSettingRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
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
    /** TICK-093 : historique des changements (null dans les tests unitaires qui ne s'en servent pas). */
    private final SettingsHistoryService history;

    public PayoutSettingsService(PlatformSettingRepository settingRepository) {
        this(settingRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PayoutSettingsService(PlatformSettingRepository settingRepository, SettingsHistoryService history) {
        this.settingRepository = settingRepository;
        this.history = history;
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

        // La méthode principale doit désigner un compte réellement renseigné
        PayoutSettingsResponse saved = getSettings();
        String m = saved.getPreferredMethod();
        boolean usable = m == null
                || ("MTN".equals(m) && notBlank(saved.getMtnNumber()))
                || ("ORANGE".equals(m) && notBlank(saved.getOrangeNumber()))
                || ("BANK".equals(m) && notBlank(saved.getBankIban()));
        if (!usable) {
            throw new BusinessException("Renseignez le compte choisi comme méthode principale.");
        }
        return saved;
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private String getSetting(String key) {
        return settingRepository.findBySettingKey(key)
                .map(PlatformSetting::getSettingValue)
                .orElse(null);
    }

    private static boolean notBlank(String v) { return v != null && !v.isBlank(); }

    /**
     * {@code null} : champ non envoyé, rien ne change. Chaîne vide : le champ a été vidé, la valeur est effacée.
     * Sinon la valeur (sans espaces superflus) est enregistrée.
     */
    private void upsertIfPresent(String key, String value, Long adminId) {
        if (value == null) return;
        Optional<PlatformSetting> existing = settingRepository.findBySettingKey(key);
        String before = existing.map(PlatformSetting::getSettingValue).orElse(null);
        if (value.isBlank()) {
            if (history != null) history.record(key, before, null, adminId);
            existing.ifPresent(settingRepository::delete);
            return;
        }
        value = value.trim();
        if (history != null) history.record(key, before, value, adminId);
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
