import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * TICK-093 — onglets communs aux réglages de la plateforme : les quatre écrans se lisent comme un seul
 * « Paramètres plateforme » (commissions, règles et délais, reversements, historique).
 */
@Component({
  selector: 'app-settings-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  styles: [`
    :host { display: block; margin-bottom: 18px; }
    nav { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line);
      overflow-x: auto; scrollbar-width: none; }
    nav::-webkit-scrollbar { display: none; }
    a { flex: 1 0 auto; min-height: 40px; padding: 0 14px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
      color: var(--cc-muted); font-size: 14px; font-weight: 650; text-decoration: none; white-space: nowrap; transition: background .15s, color .15s; }
    a:hover { color: var(--cc-ink); }
    a.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    :host-context([data-theme="dark"]) nav { background: rgba(255,255,255,.04); }
    :host-context([data-theme="dark"]) a { color: #B0C0B7; }
    :host-context([data-theme="dark"]) a:hover { color: #F3F7F5; }
    :host-context([data-theme="dark"]) a.on { background: #2B4A3E; color: #F3F7F5; box-shadow: none; }
    /* Mobile : grille 2 × 2, les quatre onglets restent visibles (pas de défilement qui cache l'onglet actif) */
    @media (max-width: 640px) {
      nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: visible; }
      a { padding: 0 8px; font-size: 13px; white-space: normal; text-align: center; line-height: 1.2; }
    }
    @media (prefers-reduced-motion: reduce) { a { transition: none; } }
  `],
  template: `
    <nav aria-label="Paramètres de la plateforme">
      @for (l of links; track l.path) {
        <a [routerLink]="l.path" routerLinkActive="on" ariaCurrentWhenActive="page">{{ l.label }}</a>
      }
    </nav>
  `,
})
export class SettingsTabsComponent {
  readonly links = [
    { path: '/admin/commissions', label: 'Commissions' },
    { path: '/admin/rules', label: 'Règles et délais' },
    { path: '/admin/payout-settings', label: 'Reversements' },
    { path: '/admin/settings-history', label: 'Historique' },
  ];
}
