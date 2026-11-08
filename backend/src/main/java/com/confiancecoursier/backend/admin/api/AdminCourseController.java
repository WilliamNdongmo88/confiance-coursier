package com.confiancecoursier.backend.admin.api;

import com.confiancecoursier.backend.admin.service.AdminCourseService;
import com.confiancecoursier.backend.admin.service.AdminCourseService.CourseDetail;
import com.confiancecoursier.backend.admin.service.AdminCourseService.CoursePage;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * TICK-091 — gestion des courses par l'administrateur. Routes réservées à ROLE_ADMIN ({@code /api/admin/**}).
 * <ul>
 *   <li>{@code GET  /api/admin/courses?status=&q=&page=&size=} — liste paginée ({@code status=BLOCKED} : courses bloquées)</li>
 *   <li>{@code GET  /api/admin/courses/{id}} — dossier complet</li>
 *   <li>{@code POST /api/admin/courses/{id}/cancel} — annulation avec motif (remboursement si l'argent est bloqué)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/courses")
public class AdminCourseController {

    private final AdminCourseService service;
    private final UserRepository userRepository;

    public AdminCourseController(AdminCourseService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<CoursePage> list(@RequestParam(required = false) String status,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(status, q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDetail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    public record CancelRequest(String reason) {}

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CourseDetail> cancel(@PathVariable Long id, @RequestBody CancelRequest body) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Long adminId = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Administrateur non trouvé.")).getId();
        return ResponseEntity.ok(service.cancel(id, adminId, body == null ? null : body.reason()));
    }
}
