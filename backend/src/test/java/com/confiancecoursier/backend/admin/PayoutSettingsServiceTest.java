package com.confiancecoursier.backend.admin;

import com.confiancecoursier.backend.admin.api.dto.PayoutSettingsResponse;
import com.confiancecoursier.backend.admin.api.dto.UpdatePayoutSettingsRequest;
import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import com.confiancecoursier.backend.admin.repository.PlatformSettingRepository;
import com.confiancecoursier.backend.admin.service.PayoutSettingsService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Coordonnées de reversement de l'admin : effacement d'un champ vidé et méthode principale cohérente. */
class PayoutSettingsServiceTest {

    private final Map<String, PlatformSetting> store = new HashMap<>();
    private PayoutSettingsService service;

    @BeforeEach
    void setUp() {
        PlatformSettingRepository repo = mock(PlatformSettingRepository.class);
        when(repo.findBySettingKey(anyString())).thenAnswer(i -> Optional.ofNullable(store.get((String) i.getArgument(0))));
        when(repo.save(any(PlatformSetting.class))).thenAnswer(i -> {
            PlatformSetting s = i.getArgument(0);
            store.put(s.getSettingKey(), s);
            return s;
        });
        doAnswer(i -> store.remove(((PlatformSetting) i.getArgument(0)).getSettingKey())).when(repo).delete(any(PlatformSetting.class));
        service = new PayoutSettingsService(repo);
    }

    private static UpdatePayoutSettingsRequest req(String mtn, String orange, String method) {
        return new UpdatePayoutSettingsRequest(mtn, null, orange, null, null, null, null, method);
    }

    @Test
    void savesTrimmedValues() {
        PayoutSettingsResponse r = service.updateSettings(req("  +237 690 00 00 01 ", null, "MTN"), 1L);
        assertThat(r.getMtnNumber()).isEqualTo("+237 690 00 00 01");
        assertThat(r.getPreferredMethod()).isEqualTo("MTN");
    }

    @Test
    void emptyFieldClearsTheStoredValueWhileAbsentFieldIsKept() {
        service.updateSettings(req("690000001", "655000002", "MTN"), 1L);

        PayoutSettingsResponse r = service.updateSettings(req(null, "", null), 1L);

        assertThat(r.getMtnNumber()).isEqualTo("690000001");   // absent : inchangé
        assertThat(r.getOrangeNumber()).isNull();               // vidé : effacé
    }

    @Test
    void preferredMethodMustPointToAFilledAccount() {
        assertThatThrownBy(() -> service.updateSettings(req(null, null, "ORANGE"), 1L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void clearingEverythingAlsoClearsThePreferredMethod() {
        service.updateSettings(req("690000001", null, "MTN"), 1L);
        PayoutSettingsResponse r = service.updateSettings(req("", null, ""), 1L);
        assertThat(r.getMtnNumber()).isNull();
        assertThat(r.getPreferredMethod()).isNull();
    }

    @Test
    void clearingThePreferredAccountIsRefused() {
        service.updateSettings(req("690000001", null, "MTN"), 1L);
        assertThatThrownBy(() -> service.updateSettings(req("", null, null), 1L))
                .isInstanceOf(BusinessException.class);
    }
}
