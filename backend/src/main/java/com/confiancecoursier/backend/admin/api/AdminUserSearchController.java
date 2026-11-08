package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.admin.service.AdminUserSearchService;
import com.confiancecoursier.backend.admin.service.AdminUserSearchService.UserPage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * TICK-094 — {@code GET /api/admin/users/search?tab=&q=&page=&size=} : liste paginée des comptes pour
 * l'écran admin « Utilisateurs ». {@code tab} : ALL | CLIENT | COURIER | SUSPENDED. Réservé à ROLE_ADMIN
 * ({@code /api/admin/**} dans SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserSearchController {

    private final AdminUserSearchService searchService;

    public AdminUserSearchController(AdminUserSearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public ResponseEntity<UserPage> search(@RequestParam(required = false) String tab,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "" + AdminUserSearchService.DEFAULT_SIZE) int size) {
        return ResponseEntity.ok(searchService.search(tab, q, page, size));
    }
}
