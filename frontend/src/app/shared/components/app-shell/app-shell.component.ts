import { Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SidebarClientComponent } from '../sidebar-client/sidebar-client.component';
import { SidebarCourierComponent } from '../sidebar-courier/sidebar-courier.component';
import { SidebarAdminComponent } from '../sidebar-admin/sidebar-admin.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { LucideMenu, LucideMoon, LucideSun } from '@lucide/angular';

/**
 * AppShellComponent — layout des espaces authentifiés (sidebar + topbar + barre basse mobile).
 *
 * TICK-075 : le shell est la **route parente** de chaque espace (`/client`, `/courier`, `/admin`) ;
 * il n'est créé qu'une fois et les pages s'affichent dans son `<router-outlet>`.
 * Titre du fil d'Ariane et largeur étroite viennent de `data.title` / `data.narrow` de la route enfant.
 * Sous 768 px : barre de navigation basse à 4 onglets ; au-delà : sidebar.
 *
 * Le sidebar affiché dépend du rôle de l'utilisateur courant (CLIENT/COURIER/ADMIN).
 * Le toggle du thème (clair/sombre) est géré par `ThemeService` et persiste en localStorage.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    SidebarClientComponent,
    SidebarCourierComponent,
    SidebarAdminComponent,
    BottomNavComponent,
    RouterOutlet,
    LucideMenu,
    LucideMoon,
    LucideSun,
  ],
  styles: [`
    /* Mobile : place pour la barre basse (56 px + zone sûre) */
    @media (max-width: 767.98px) {
      .app-main { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
    }
  `],
  template: `
    <div class="app-shell">
      <!-- Overlay mobile -->
      <div class="app-overlay" [class.active]="sidebarOpen()" (click)="closeSidebar()"></div>

      <!-- Sidebar selon le rôle -->
      @if (role === 'ADMIN') {
        <app-sidebar-admin [open]="sidebarOpen()" />
      } @else if (role === 'COURIER') {
        <app-sidebar-courier [open]="sidebarOpen()" />
      } @else {
        <app-sidebar-client [open]="sidebarOpen()" />
      }

      <!-- Zone principale -->
      <main class="app-main" [class.app-main--narrow]="narrow">
        <!-- Topbar -->
        <header class="app-topbar">
          <button
            class="app-menu-btn"
            type="button"
            [attr.aria-label]="sidebarOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
            aria-controls="sidebar"
            [attr.aria-expanded]="sidebarOpen()"
            (click)="toggleSidebar()"
          >
            <svg lucideMenu size="17"></svg>
          </button>

          <div class="app-breadcrumb">
            @for (seg of breadcrumb; track $index; let i = $index) {
              @if (i > 0) {
                <span class="app-breadcrumb-sep">/</span>
              }
              {{ seg }}
            }
          </div>

          <div class="app-topbar-actions">
            <button
              class="app-theme-btn"
              type="button"
              [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
              (click)="theme.toggleTheme()"
            >
              @if (theme.isDarkMode()) {
                <svg lucideSun size="15"></svg>
              } @else {
                <svg lucideMoon size="15"></svg>
              }
            </button>
            <div class="app-topbar-user">
              <span class="app-topbar-user-name">Bonjour, {{ firstName }}</span>
              <span class="sb-avatar">{{ initials }}</span>
            </div>
          </div>
        </header>

        <div class="app-main-inner">
          <router-outlet />
        </div>
      </main>

      <!-- TICK-075 : navigation basse (mobile uniquement) -->
      <app-bottom-nav />
    </div>
  `,
})
export class AppShellComponent {
  /** Titre de la page affiché dans le fil d'Ariane (2ème segment) — lu dans data.title de la route. */
  pageTitle = '';

  /** app-main--narrow (max-width 820px, centré) pour les formulaires/tunnels — lu dans data.narrow. */
  narrow = false;

  /** État d'ouverture de la sidebar (mobile). */
  readonly sidebarOpen = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly theme = inject(ThemeService);

  constructor() {
    this.applyRouteData();
    // Referme la sidebar après chaque navigation et met à jour titre / largeur de la page affichée.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.sidebarOpen.set(false);
        this.applyRouteData();
      });
  }

  /** Données de la route enfant la plus profonde (la page affichée). */
  private applyRouteData(): void {
    let snap: ActivatedRouteSnapshot = this.route.snapshot;
    while (snap.firstChild) snap = snap.firstChild;
    this.pageTitle = snap.data['title'] ?? '';
    this.narrow = !!snap.data['narrow'];
  }

  get role(): string {
    return this.authService.getCurrentUserRole();
  }

  get firstName(): string {
    const full = this.authService.getCurrentUserFullName().trim();
    if (full) return full.split(/\s+/)[0];
    // Fallback : partie avant @ de l'email
    const email = this.authService.getCurrentUserEmail().trim();
    return email ? email.split('@')[0] : 'vous';
  }

  get initials(): string {
    const name = this.authService.getCurrentUserFullName().trim();
    if (name) {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
    }
    // Fallback : 2 premières lettres de la partie avant @ de l'email
    const email = this.authService.getCurrentUserEmail().trim();
    if (email) {
      const local = email.split('@')[0];
      return local.substring(0, 2).toUpperCase();
    }
    return 'CC';
  }

  /** Libellé de l'espace affiché en premier segment du fil d'Ariane. */
  get workspaceLabel(): string {
    switch (this.role) {
      case 'ADMIN':
        return 'Administration';
      case 'COURIER':
        return 'Espace coursier';
      default:
        return 'Espace client';
    }
  }

  get breadcrumb(): string[] {
    return this.pageTitle ? [this.workspaceLabel, this.pageTitle] : [this.workspaceLabel];
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen.set(false);
  }
}
