import { warnLoadFailed } from '../../state/load-error';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { AdminService } from '../../../core/services/admin.service';
import {
  LucideLayoutDashboard, LucidePlus, LucideClock, LucideUser,
  LucideInbox, LucideWallet, LucideScale, LucideUsers, LucideSettings,
} from '@lucide/angular';

type Icon = 'home' | 'plus' | 'clock' | 'user' | 'inbox' | 'wallet' | 'scale' | 'users' | 'settings';
interface Tab { label: string; link: string; icon: Icon; badge?: boolean; }

/** Statuts qui attendent une action du client (preuves à valider, paiement, retard). */
const CLIENT_ACTION_STATUSES = ['PROOFS_SUBMITTED', 'ASSIGNED', 'OVERDUE'];
/** Le badge n'est recalculé qu'au plus toutes les 30 s lors des navigations. */
const BADGE_REFRESH_MS = 30_000;

/**
 * Barre de navigation basse (TICK-075) — mobile uniquement (< 768 px), 4 onglets par rôle,
 * onglet actif mis en évidence et badge du nombre d'éléments à traiter.
 *
 * Les onglets « Messages », « Missions » et « Courses » du plan (§2.3–2.5) arriveront avec
 * leurs écrans (Sprints 9–11) ; en attendant, les onglets pointent vers les pages existantes.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive,
    LucideLayoutDashboard, LucidePlus, LucideClock, LucideUser,
    LucideInbox, LucideWallet, LucideScale, LucideUsers, LucideSettings,
  ],
  styles: [`
    :host { display: none; }
    @media (max-width: 767.98px) {
      :host {
        display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
        background: var(--surface, var(--cc-white));
        border-top: 1px solid var(--border);
        padding-bottom: env(safe-area-inset-bottom);
      }
    }
    nav { display: grid; grid-template-columns: repeat(4, 1fr); }
    a {
      position: relative; min-height: 56px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 2px;
      font-size: .7rem; font-weight: 600; color: var(--text-muted); text-decoration: none;
    }
    a.active { color: var(--primary); }
    a.active::before {
      content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 3px;
      border-radius: 0 0 3px 3px; background: var(--primary);
    }
    .badge {
      position: absolute; top: 6px; left: calc(50% + 6px); min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: var(--danger); color: var(--on-primary); font-size: .65rem;
      display: flex; align-items: center; justify-content: center;
    }
  `],
  template: `
    <nav [attr.aria-label]="'Navigation ' + roleLabel">
      @for (tab of tabs; track tab.link) {
        <a [routerLink]="tab.link" routerLinkActive="active" ariaCurrentWhenActive="page">
          @switch (tab.icon) {
            @case ('home')     { <svg lucideLayoutDashboard size="20"></svg> }
            @case ('plus')     { <svg lucidePlus size="20"></svg> }
            @case ('clock')    { <svg lucideClock size="20"></svg> }
            @case ('inbox')    { <svg lucideInbox size="20"></svg> }
            @case ('wallet')   { <svg lucideWallet size="20"></svg> }
            @case ('scale')    { <svg lucideScale size="20"></svg> }
            @case ('users')    { <svg lucideUsers size="20"></svg> }
            @case ('settings') { <svg lucideSettings size="20"></svg> }
            @default           { <svg lucideUser size="20"></svg> }
          }
          {{ tab.label }}
          @if (tab.badge && badge() > 0) {
            <span class="badge" [attr.aria-label]="badge() + ' à traiter'">{{ badge() > 9 ? '9+' : badge() }}</span>
          }
        </a>
      }
    </nav>
  `,
})
export class BottomNavComponent {
  private auth = inject(AuthService);
  private courses = inject(CourseService);
  private admin = inject(AdminService);
  private router = inject(Router);

  readonly role = this.auth.getCurrentUserRole();
  readonly badge = signal(0);
  private lastRefresh = 0;

  readonly tabs: Tab[] = TABS[this.role] ?? TABS['CLIENT'];
  readonly roleLabel = this.role === 'COURIER' ? 'coursier' : this.role === 'ADMIN' ? 'admin' : 'client';

  constructor() {
    this.refreshBadge(true);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(() => this.refreshBadge(false));
  }

  private refreshBadge(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastRefresh < BADGE_REFRESH_MS) return;
    this.lastRefresh = now;

    if (this.role === 'COURIER') {
      // Nouvelles demandes disponibles
      this.courses.getPublishedCourses().subscribe({ next: l => this.badge.set(l.length), error: warnLoadFailed('badge « nouvelles demandes »', 'badge masqué') });
    } else if (this.role === 'ADMIN') {
      // Litiges ouverts
      this.admin.getDisputes().subscribe({
        next: l => this.badge.set(l.filter((d: any) => d.status === 'OPEN').length), error: warnLoadFailed('badge « litiges ouverts »', 'badge masqué'),
      });
    } else {
      // Courses qui attendent une action du client
      this.courses.getMyCourses().subscribe({
        next: l => this.badge.set(l.filter((c: any) => CLIENT_ACTION_STATUSES.includes(c.status) || c.reviewDue).length),
        error: warnLoadFailed('badge « courses à traiter »', 'badge masqué'),
      });
    }
  }
}

const TABS: Record<string, Tab[]> = {
  CLIENT: [
    { label: 'Accueil',    link: '/client/dashboard',     icon: 'home', badge: true },
    { label: 'Nouvelle',   link: '/client/create-course', icon: 'plus' },
    { label: 'Historique', link: '/client/history',       icon: 'clock' },
    { label: 'Moi',        link: '/client/profile',       icon: 'user' },
  ],
  COURIER: [
    { label: 'Demandes',   link: '/courier/dashboard',    icon: 'inbox', badge: true },
    { label: 'Gains',      link: '/courier/earnings',     icon: 'wallet' },
    { label: 'Historique', link: '/courier/history',      icon: 'clock' },
    { label: 'Moi',        link: '/courier/profile',      icon: 'user' },
  ],
  ADMIN: [
    { label: 'Accueil',      link: '/admin/dashboard',   icon: 'home' },
    { label: 'Litiges',      link: '/admin/disputes',    icon: 'scale', badge: true },
    { label: 'Utilisateurs', link: '/admin/users',       icon: 'users' },
    { label: 'Paramètres',   link: '/admin/commissions', icon: 'settings' },
  ],
};
