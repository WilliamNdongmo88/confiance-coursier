import { Component, HostListener, Input, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SidebarClientComponent } from '../sidebar-client/sidebar-client.component';
import { SidebarCourierComponent } from '../sidebar-courier/sidebar-courier.component';
import { SidebarAdminComponent } from '../sidebar-admin/sidebar-admin.component';
import { LucideMenu, LucideMoon, LucideSun } from '@lucide/angular';

/**
 * AppShellComponent — layout partagé de l'application (sidebar + topbar + overlay).
 *
 * Toutes les pages authentifiées enveloppent leur contenu avec `<app-shell>`.
 * Le contenu de la page est projeté via `<ng-content>` dans `.app-main-inner`.
 *
 * @example
 * <app-shell pageTitle="Vue d'ensemble">
 *   <!-- contenu de la page -->
 * </app-shell>
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
    LucideMenu,
    LucideMoon,
    LucideSun,
  ],
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
      <main class="app-main">
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
          <ng-content></ng-content>
        </div>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  /** Titre de la page affiché dans le fil d'Ariane (2ème segment). */
  @Input() pageTitle = '';

  /** État d'ouverture de la sidebar (mobile). */
  readonly sidebarOpen = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  constructor() {
    // Referme la sidebar après chaque navigation réussie (UX mobile).
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.sidebarOpen.set(false));
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
