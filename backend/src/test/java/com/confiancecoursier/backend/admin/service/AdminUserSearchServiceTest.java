package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.admin.service.AdminUserSearchService.UserPage;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** TICK-094 — pagination côté serveur de la liste admin des comptes. */
class AdminUserSearchServiceTest {

    private static User user(long id, String role, String status) {
        return User.builder().id(id).email(id + "@t.cm").fullName("Compte " + id).role(role).status(status).build();
    }

    @SuppressWarnings("unchecked")
    private static UserRepository repo(List<User> content, long total, Pageable pageable) {
        UserRepository users = mock(UserRepository.class);
        when(users.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(content, pageable, total));
        when(users.count()).thenReturn(57L);
        when(users.countByRole("CLIENT")).thenReturn(40L);
        when(users.countByRole("COURIER")).thenReturn(16L);
        when(users.countByStatusNot("ACTIVE")).thenReturn(3L);
        return users;
    }

    @Test
    @SuppressWarnings("unchecked")
    void returnsTheRequestedPageNewestFirstWithTabCounts() {
        PageRequest pr = PageRequest.of(1, 20);
        UserRepository users = repo(List.of(user(5, "CLIENT", "ACTIVE"), user(4, "COURIER", "SUSPENDED")), 57, pr);

        UserPage page = new AdminUserSearchService(users).search("all", "  ", 1, 20);

        ArgumentCaptor<Pageable> asked = ArgumentCaptor.forClass(Pageable.class);
        verify(users).findAll(any(Specification.class), asked.capture());
        assertThat(asked.getValue().getPageNumber()).isEqualTo(1);
        assertThat(asked.getValue().getPageSize()).isEqualTo(20);
        assertThat(asked.getValue().getSort().getOrderFor("createdAt").getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.items()).extracting("id").containsExactly(5L, 4L);
        assertThat(page.total()).isEqualTo(57);
        assertThat(page.totalPages()).isEqualTo(3);
        assertThat(page.counts()).containsEntry("ALL", 57L).containsEntry("CLIENT", 40L)
                .containsEntry("COURIER", 16L).containsEntry("SUSPENDED", 3L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void pageAndSizeAreKeptWithinBounds() {
        UserRepository users = repo(List.of(), 0, PageRequest.of(0, 100));
        AdminUserSearchService service = new AdminUserSearchService(users);

        UserPage tooBig = service.search(null, null, -3, 5000);
        assertThat(tooBig.page()).isZero();
        assertThat(tooBig.size()).isEqualTo(AdminUserSearchService.MAX_SIZE);

        UserPage none = service.search("CLIENT", null, 0, 0);
        assertThat(none.size()).isEqualTo(AdminUserSearchService.DEFAULT_SIZE);
    }

    @Test
    void searchTermIgnoresCaseAndAccentsLikeTheDatabaseSide() {
        assertThat(AdminUserSearchService.fold("  Éloïse NGAOUNDÉRÉ ")).isEqualTo("eloise ngaoundere");
        assertThat(AdminUserSearchService.fold(null)).isEmpty();
        // La table SQL de translate() couvre les mêmes lettres, une pour une
        assertThat(AdminUserSearchService.ACCENTED).hasSameSizeAs(AdminUserSearchService.PLAIN);
        for (int i = 0; i < AdminUserSearchService.ACCENTED.length(); i++) {
            assertThat(AdminUserSearchService.fold(String.valueOf(AdminUserSearchService.ACCENTED.charAt(i))))
                    .isEqualTo(String.valueOf(AdminUserSearchService.PLAIN.charAt(i)));
        }
    }
}
