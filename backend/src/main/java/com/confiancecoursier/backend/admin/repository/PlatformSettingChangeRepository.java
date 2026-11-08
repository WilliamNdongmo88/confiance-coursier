package com.confiancecoursier.backend.admin.repository;

import com.confiancecoursier.backend.admin.domain.PlatformSettingChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformSettingChangeRepository extends JpaRepository<PlatformSettingChange, Long> {
}
