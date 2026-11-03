package com.confiancecoursier.backend.admin.repository;

import com.confiancecoursier.backend.admin.domain.PlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, Long> {

    /** Retrouve un paramètre par sa clé unique. */
    Optional<PlatformSetting> findBySettingKey(String settingKey);
}
