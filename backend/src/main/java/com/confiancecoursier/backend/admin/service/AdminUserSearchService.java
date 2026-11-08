package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.user.api.dto.UserProfileResponse;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * TICK-094 — liste des comptes pour l'administrateur, paginée côté serveur : onglet (tous, clients, coursiers,
 * suspendus), recherche par nom, email ou téléphone (sans tenir compte des accents ni des espaces du numéro),
 * et compteurs de chaque onglet sur l'ensemble des comptes.
 */
@Service
public class AdminUserSearchService {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    /** Lettres accentuées ramenées à leur lettre de base, en SQL (translate) comme en Java. */
    static final String ACCENTED = "àâäáãåéèêëíìîïóòôöõúùûüçñÿ";
    static final String PLAIN    = "aaaaaaeeeeiiiiooooouuuucny";

    private final UserRepository userRepository;

    public AdminUserSearchService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record UserPage(List<UserProfileResponse> items, long total, int page, int size, int totalPages,
                           Map<String, Long> counts) {}

    @Transactional(readOnly = true)
    public UserPage search(String tab, String q, int page, int size) {
        int p = Math.max(0, page);
        int s = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        String t = tab == null ? "ALL" : tab.trim().toUpperCase();
        String term = fold(q);
        String digits = q == null ? "" : q.replaceAll("[^0-9]", "");

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> and = new ArrayList<>();
            switch (t) {
                case "CLIENT", "COURIER", "ADMIN" -> and.add(cb.equal(root.get("role"), t));
                case "SUSPENDED" -> and.add(cb.notEqual(root.get("status"), "ACTIVE"));
                default -> { /* ALL */ }
            }
            if (!term.isEmpty()) {
                String like = "%" + term.replace("%", "").replace("_", "") + "%";
                List<Predicate> or = new ArrayList<>();
                or.add(cb.like(folded(cb, root.get("fullName")), like));
                or.add(cb.like(folded(cb, root.get("email")), like));
                // Téléphone : « 6 90 12 » retrouve « +237690123456 » (espaces ignorés des deux côtés)
                if (digits.length() >= 3) {
                    Expression<String> phone = cb.function("replace", String.class, cb.coalesce(root.get("phone"), ""),
                            cb.literal(" "), cb.literal(""));
                    or.add(cb.like(phone, "%" + digits + "%"));
                }
                and.add(cb.or(or.toArray(new Predicate[0])));
            }
            return cb.and(and.toArray(new Predicate[0]));
        };

        Page<User> result = userRepository.findAll(spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("ALL", userRepository.count());
        counts.put("CLIENT", userRepository.countByRole("CLIENT"));
        counts.put("COURIER", userRepository.countByRole("COURIER"));
        counts.put("SUSPENDED", userRepository.countByStatusNot("ACTIVE"));

        return new UserPage(result.getContent().stream().map(UserProfileResponse::fromUser).toList(),
                result.getTotalElements(), p, s, result.getTotalPages(), counts);
    }

    /** Minuscules, sans accents, espaces de bord retirés (« Ngaoundéré » → « ngaoundere »). */
    static String fold(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.trim().toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n;
    }

    private static Expression<String> folded(CriteriaBuilder cb, Expression<String> field) {
        return cb.function("translate", String.class, cb.lower(cb.coalesce(field, "")), cb.literal(ACCENTED), cb.literal(PLAIN));
    }
}
