import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideBike,
  LucideLayoutDashboard,
  LucideWallet,
  LucideClock,
  LucideShield,
  LucideUser,
  LucideLifeBuoy,
  LucideLogOut,
} from '@lucide/angular';

/**
 * SidebarCourierComponent — navigation latérale de l'espace coursier.
 * Reprend la structure `.app-sidebar` de la maquette (courier/dashboard.html).
 */
@Component({
  selector: 'app-sidebar-courier',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideBike,
    LucideLayoutDashboard,
    LucideWallet,
    LucideClock,
    LucideShield,
    LucideUser,
    LucideLifeBuoy,
    LucideLogOut,
  ],
  template: `
    <aside class="app-sidebar" [class.open]="open" id="sidebar">
      <a class="sb-brand" routerLink="/courier/dashboard">
        <span class="sb-brand-icon"><svg lucideBike size="17"></svg></span>
        ConfianceCoursier
      </a>

      <div class="sb-workspace">Espace coursier</div>

      <nav class="sb-nav" aria-label="Navigation coursier">
        <a routerLink="/courier/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideLayoutDashboard size="16"></svg> Vue d'ensemble
        </a>
        <a routerLink="/courier/earnings" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideWallet size="16"></svg> Mes gains
        </a>
        <a routerLink="/courier/history" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideClock size="16"></svg> Historique
        </a>
        <a routerLink="/courier/kyc" routerLinkActive="active" ariaCurrentWhenActive="page">
          <svg lucideShield size="16"></svg> Vérification KYC
        </a>
        <a routerLink="/courier/profile" routerLinkActive="active" ariaCurrentWhenActive="page">
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
            <span class="sb-account-role">Coursier</span>
          </div>
          <button class="sb-logout-btn" type="button" aria-label="Déconnexion" (click)="logout()">
            <svg lucideLogOut size="15"></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarCourierComponent {
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
