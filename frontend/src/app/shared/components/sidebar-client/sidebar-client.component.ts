import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideBike,
  LucideLayoutDashboard,
  LucidePlus,
  LucideClock,
  LucideUser,
  LucideLifeBuoy,
  LucideLogOut,
} from '@lucide/angular';

/**
 * SidebarClientComponent — navigation latérale de l'espace client.
 * Reprend la structure `.app-sidebar` de la maquette (client/dashboard.html).
 * Le toggle mobile (classe `open`) est piloté par l'`AppShellComponent` via l'input `open`.
 */
@Component({
  selector: 'app-sidebar-client',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideBike,
    LucideLayoutDashboard,
    LucidePlus,
    LucideClock,
    LucideUser,
    LucideLifeBuoy,
    LucideLogOut,
  ],
  template: `
    <aside class="app-sidebar" [class.open]="open" id="sidebar">
      <a class="sb-brand" routerLink="/client/dashboard">
        <span class="sb-brand-icon"><svg lucideBike size="17"></svg></span>
        confiancecoursier
      </a>

      <div class="sb-workspace">Espace client</div>

      <nav class="sb-nav" aria-label="Navigation client">
        <a routerLink="/client/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideLayoutDashboard size="16"></svg> Vue d'ensemble
        </a>
        <a routerLink="/client/create-course" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucidePlus size="16"></svg> Nouvelle course
        </a>
        <a routerLink="/client/history" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideClock size="16"></svg> Historique
        </a>
        <a routerLink="/client/profile" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideUser size="16"></svg> Mon profil
        </a>
      </nav>

      <div class="sb-bottom">
        <a class="sb-support-link" routerLink="/support">
          <svg lucideLifeBuoy size="15"></svg> Centre d'aide
        </a>
        <div class="sb-account">
          <span class="sb-avatar">{{ initials }}</span>
          <div class="sb-account-info">
            <span class="sb-account-name">{{ displayName }}</span>
            <span class="sb-account-role">Compte client</span>
          </div>
          <button class="sb-logout-btn" type="button" aria-label="Déconnexion" (click)="logout()">
            <svg lucideLogOut size="15"></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarClientComponent {
  /** État d'ouverture mobile — piloté par l'AppShell. */
  @Input() open = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  get displayName(): string {
    return this.authService.getCurrentUserFullName() || 'Mon compte';
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
    return 'CC';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
