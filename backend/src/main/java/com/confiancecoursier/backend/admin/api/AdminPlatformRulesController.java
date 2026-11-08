package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.admin.service.PlatformRulesService;
import com.confiancecoursier.backend.admin.service.PlatformRulesService.Rules;
import com.confiancecoursier.backend.admin.service.SettingsHistoryService;
import com.confiancecoursier.backend.admin.service.SettingsHistoryService.ChangePage;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * TICK-093 — réglages admin (réservés à ROLE_ADMIN, {@code /api/admin/**} dans SecurityConfig) :
 * <ul>
 *   <li>{@code GET/PUT /api/admin/platform-rules} — remboursement des frais et délais ;</li>
 *   <li>{@code GET /api/admin/settings-history?page=&size=} — historique de tous les changements de réglages.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin")
public class AdminPlatformRulesController {

    private final PlatformRulesService rulesService;
    private final SettingsHistoryService historyService;
    private final UserRepository userRepository;

    public AdminPlatformRulesController(PlatformRulesService rulesService, SettingsHistoryService historyService,
                                        UserRepository userRepository) {
        this.rulesService = rulesService;
        this.historyService = historyService;
        this.userRepository = userRepository;
    }

    @GetMapping("/platform-rules")
    public ResponseEntity<Rules> getRules() {
        return ResponseEntity.ok(rulesService.get());
    }

    @PutMapping("/platform-rules")
    public ResponseEntity<Rules> updateRules(@RequestBody Rules body) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Long adminId = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Administrateur non trouvé.")).getId();
        return ResponseEntity.ok(rulesService.update(body, adminId));
    }

    @GetMapping("/settings-history")
    public ResponseEntity<ChangePage> history(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "" + SettingsHistoryService.DEFAULT_SIZE) int size) {
        return ResponseEntity.ok(historyService.list(page, size));
    }
}
