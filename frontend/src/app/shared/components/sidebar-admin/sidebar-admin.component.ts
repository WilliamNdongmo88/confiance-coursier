import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideShield,
  LucideLayoutDashboard,
  LucideScale,
  LucideFlag,
  LucidePercent,
  LucideUsers,
  LucideLogOut,
} from '@lucide/angular';

/**
 * SidebarAdminComponent — navigation latérale de l'administration.
 * Reprend la structure `.app-sidebar` de la maquette (admin/dashboard.html).
 *
 * NB : les routes admin (`/admin/*`) sont définies lors du Sprint 6 (Admin).
 * En attendant, les liens sont déclarés en anticipation — ils deviendront
 * fonctionnels à mesure que les écrans admin seront implémentés.
 */
@Component({
  selector: 'app-sidebar-admin',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideShield,
    LucideLayoutDashboard,
    LucideScale,
    LucideFlag,
    LucidePercent,
    LucideUsers,
    LucideLogOut,
  ],
  template: `
    <aside class="app-sidebar" [class.open]="open" id="sidebar">
      <a class="sb-brand" routerLink="/admin/dashboard">
        <span class="sb-brand-icon"><svg lucideShield size="17"></svg></span>
        Admin Panel
      </a>

      <div class="sb-workspace">Administration</div>

      <nav class="sb-nav" aria-label="Navigation admin">
        <a routerLink="/admin/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideLayoutDashboard size="16"></svg> Tableau de bord
        </a>
        <a routerLink="/admin/kyc" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideShield size="16"></svg> Validations KYC
        </a>
        <a routerLink="/admin/disputes" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideScale size="16"></svg> Litiges
        </a>
        <a routerLink="/admin/reports" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideFlag size="16"></svg> Signalements
        </a>
        <a routerLink="/admin/commissions" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucidePercent size="16"></svg> Commissions
        </a>
        <a routerLink="/admin/users" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideUsers size="16"></svg> Utilisateurs
        </a>
      </nav>

      <div class="sb-bottom">
        <div class="sb-account">
          <span class="sb-avatar">{{ initials }}</span>
          <div class="sb-account-info">
            <span class="sb-account-name">{{ displayName }}</span>
            <span class="sb-account-role">Accès complet</span>
          </div>
          <button class="sb-logout-btn" type="button" aria-label="Déconnexion" (click)="logout()">
            <svg lucideLogOut size="15"></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarAdminComponent {
  /** État d'ouverture mobile — piloté par l'AppShell. */
  @Input() open = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  get displayName(): string {
    return this.authService.getCurrentUserFullName() || 'Administrateur';
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
    return 'AD';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
