package com.confiancecoursier.backend.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.Clock;

/**
 * Jobs planifiés (TICK-065).
 * <ul>
 *   <li>{@link Clock} injectable : les tests avancent l'horloge sans attendre 72 h.</li>
 *   <li>ShedLock (table {@code shedlock}, V16) : avec plusieurs instances du backend,
 *       un job n'est exécuté que par une seule à la fois. L'heure de référence est celle de la base.</li>
 * </ul>
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class SchedulingConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()
                .build());
    }
}
