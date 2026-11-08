import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, SettingChange } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowRight } from '@lucide/angular';
import { SettingsTabsComponent } from '../settings-tabs/settings-tabs.component';

type Fmt = 'pct' | 'xaf' | 'hours' | 'bool' | 'count' | 'method' | 'text';

/** Libellés lisibles des clés de platform_settings (commissions, règles et délais, reversements). */
const SETTINGS: Record<string, { label: string; group: string; fmt: Fmt }> = {
  commission_rate_client: { label: 'Frais de service client', group: 'Commissions', fmt: 'pct' },
  commission_rate_courier: { label: 'Commission sur le tarif du coursier', group: 'Commissions', fmt: 'pct' },
  tarif_minimum_coursier: { label: 'Tarif minimum d’une offre', group: 'Commissions', fmt: 'xaf' },
  refund_platform_fees_on_full_refund: { label: 'Frais rendus si litige remboursé en totalité', group: 'Règles et délais', fmt: 'bool' },
  refund_platform_fees_on_courier_no_show: { label: 'Frais rendus si course non livrée', group: 'Règles et délais', fmt: 'bool' },
  proof_deadline_hours: { label: 'Échéance des preuves', group: 'Règles et délais', fmt: 'hours' },
  proof_reminder_hours_before: { label: 'Rappel avant l’échéance', group: 'Règles et délais', fmt: 'hours' },
  overdue_grace_hours: { label: 'Délai de grâce', group: 'Règles et délais', fmt: 'hours' },
  max_extensions: { label: 'Prolongations par le client', group: 'Règles et délais', fmt: 'count' },
  auto_validate_hours: { label: 'Validation automatique', group: 'Règles et délais', fmt: 'hours' },
  payout_mtn_number: { label: 'Numéro MTN Mobile Money', group: 'Reversements', fmt: 'text' },
  payout_mtn_name: { label: 'Titulaire MTN', group: 'Reversements', fmt: 'text' },
  payout_orange_number: { label: 'Numéro Orange Money', group: 'Reversements', fmt: 'text' },
  payout_orange_name: { label: 'Titulaire Orange Money', group: 'Reversements', fmt: 'text' },
  payout_bank_iban: { label: 'IBAN / RIB', group: 'Reversements', fmt: 'text' },
  payout_bank_name: { label: 'Banque', group: 'Reversements', fmt: 'text' },
  payout_bank_account_name: { label: 'Titulaire du compte bancaire', group: 'Reversements', fmt: 'text' },
  payout_preferred_method: { label: 'Compte principal', group: 'Reversements', fmt: 'method' },
};

/**
 * TICK-093 — historique des changements de réglages (admin, Impeccable, mode Operate) : qui, quand, avant → après.
 * Les changements faits avant la mise en place de l'historique ne sont pas connus : l'écran le dit.
 */
@Component({
  selector: 'app-admin-settings-history',
  standalone: true,
  imports: [DatePipe, SettingsTabsComponent, LucideArrowRight],
  styles: [`
    :host { display: block; min-width: 0; --hm: #56635c; }
    :host-context([data-theme="dark"]) { --hm: #B0C0B7; }
    .h { max-width: 980px; margin: 0 auto; padding-bottom: 40px; }
    .h-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .h-head p { margin: 0 0 16px; font-size: 15px; color: var(--hm); }
    .list { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; overflow: hidden; }
    .ch { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.6fr) minmax(0, 1fr); gap: 14px; align-items: center; padding: 14px 18px;
      border-top: 1px solid var(--cc-line); animation: h-in .35s cubic-bezier(.16,1,.3,1) both; }
    .ch:first-child { border-top: 0; }
    .what small { display: block; font-size: 11.5px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; color: var(--hm); margin-bottom: 2px; }
    .what b { font-size: 14.5px; font-weight: 700; color: var(--cc-ink); }
    .vals { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14px; font-variant-numeric: tabular-nums; min-width: 0; }
    .vals .old { color: var(--hm); text-decoration: line-through; text-decoration-thickness: 1px; overflow-wrap: anywhere; }
    .vals .new { color: var(--cc-ink); font-weight: 750; overflow-wrap: anywhere; }
    .vals .none { color: var(--hm); font-style: italic; text-decoration: none; font-weight: 500; }
    .vals svg { flex: none; color: var(--hm); }
    .who { text-align: right; font-size: 13px; color: var(--hm); }
    .who b { display: block; color: var(--cc-ink); font-weight: 650; }
    .empty { padding: 34px 18px; text-align: center; color: var(--hm); font-size: 14px; line-height: 1.5; }
    .foot { margin: 12px 2px 0; font-size: 12.5px; color: var(--hm); }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 13.5px; color: var(--hm); }
    .pager button { min-height: 42px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-weight: 700; cursor: pointer; }
    .pager button:disabled { opacity: .45; cursor: default; }
    .sk { height: 64px; border-top: 1px solid var(--cc-line); background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: h-sk 1.2s linear infinite; }
    @keyframes h-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes h-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .h-head h1, :host-context([data-theme="dark"]) .what b, :host-context([data-theme="dark"]) .vals .new,
    :host-context([data-theme="dark"]) .who b { color: #F3F7F5; }
    :host-context([data-theme="dark"]) .pager button { background: transparent; color: #F3F7F5; }
    @media (max-width: 720px) {
      .ch { grid-template-columns: minmax(0, 1fr); gap: 6px; padding: 14px; }
      .who { text-align: left; } .who b { display: inline; } .who b::after { content: " · "; font-weight: 400; color: var(--hm); }
    }
    @media (prefers-reduced-motion: reduce) { .ch, .sk { animation: none; } }
  `],
  template: `
    <div class="h">
      <app-settings-tabs />
      <section class="h-head">
        <h1>Historique des réglages</h1>
        <p>Chaque modification des commissions, des règles et délais et des comptes de reversement : qui, quand, avant et après.</p>
      </section>

      <div class="list" role="list" aria-label="Modifications des réglages">
        @if (loading()) {
          <div class="sk"></div><div class="sk"></div><div class="sk"></div>
        } @else {
          @for (c of items(); track c.id; let i = $index) {
            <article class="ch" role="listitem" [style.animation-delay.ms]="i < 12 ? i * 25 : 0">
              <div class="what"><small>{{ meta(c.settingKey).group }}</small><b>{{ meta(c.settingKey).label }}</b></div>
              <div class="vals">
                @if (c.oldValue === null) { <span class="old none">par défaut</span> } @else { <span class="old">{{ show(c.settingKey, c.oldValue) }}</span> }
                <svg lucideArrowRight size="15" aria-label="devient"></svg>
                @if (c.newValue === null) { <span class="new none">effacé</span> } @else { <span class="new">{{ show(c.settingKey, c.newValue) }}</span> }
              </div>
              <div class="who"><b>{{ c.changedByName || 'Administrateur supprimé' }}</b>{{ c.changedAt | date:'d MMM yyyy à HH:mm' }}</div>
            </article>
          } @empty {
            <div class="empty" role="status">Aucune modification enregistrée pour l’instant.<br>Les prochains changements de réglages apparaîtront ici.</div>
          }
        }
      </div>

      @if (!loading() && total() > size) {
        <nav class="pager" aria-label="Pages de l’historique">
          <button type="button" [disabled]="page() === 0" (click)="go(page() - 1)">Plus récentes</button>
          <span>Page {{ page() + 1 }} sur {{ pages() }}</span>
          <button type="button" [disabled]="page() + 1 >= pages()" (click)="go(page() + 1)">Plus anciennes</button>
        </nav>
      }
      @if (!loading() && items().length) {
        <p class="foot">« par défaut » : le réglage n’avait jamais été modifié, la valeur prévue par la plateforme s’appliquait.</p>
      }
    </div>
  `,
})
export class AdminSettingsHistoryComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly size = 20;
  readonly page = signal(0);
  readonly items = signal<SettingChange[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  private seq = 0;

  ngOnInit(): void { this.load(); }

  pages(): number { return Math.max(1, Math.ceil(this.total() / this.size)); }

  go(p: number): void {
    this.page.set(p);
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private load(): void {
    const mine = ++this.seq;
    this.loading.set(true);
    this.adminService.getSettingsHistory(this.page(), this.size).subscribe({
      next: (r) => { if (mine !== this.seq) return; this.items.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => { if (mine === this.seq) { this.loading.set(false); this.toast.error('Erreur lors du chargement de l’historique.'); } },
    });
  }

  meta(key: string): { label: string; group: string; fmt: Fmt } {
    return SETTINGS[key] ?? { label: key, group: 'Autre réglage', fmt: 'text' };
  }

  show(key: string, v: string): string {
    const nf = (n: number, d = 2) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n).replace(/ /g, ' ');
    switch (this.meta(key).fmt) {
      case 'pct': return `${nf(Number(v))} %`;
      case 'xaf': return `${nf(Number(v), 0)} XAF`;
      case 'hours': return `${v} h`;
      case 'bool': return v === 'true' ? 'Oui' : 'Non';
      case 'count': return `${v} fois`;
      case 'method': return v === 'MTN' ? 'MTN Mobile Money' : v === 'ORANGE' ? 'Orange Money' : v === 'BANK' ? 'Banque' : v;
      default: return v;
    }
  }
}
