import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminService, CourseGainEntry, GainsStatsResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideChevronDown, LucideFlaskConical, LucideTrendingUp, LucideWallet } from '@lucide/angular';

/**
 * Gains de la plateforme (admin, Impeccable, mode Operate).
 * Chiffres lus dans le registre du séquestre (lignes PLATFORM_FEE, voir GainsService) : seul l'argent réellement
 * conservé par la plateforme est compté, y compris les frais gardés lors d'un remboursement ou d'un partage.
 */
@Component({
  selector: 'app-admin-gains',
  standalone: true,
  imports: [LucideChevronDown, LucideFlaskConical, LucideTrendingUp, LucideWallet],
  styles: [`
    :host { display: block; min-width: 0; --gm: #56635c; }
    :host-context([data-theme="dark"]) { --gm: #B0C0B7; }
    .g { max-width: 1100px; margin: 0 auto; }
    .g-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .g-head p { margin: 0 0 16px; font-size: 15px; color: var(--gm); }
    .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .note svg { flex: none; margin-top: 1px; color: var(--primary); }
    .kpis { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 22px; }
    .k { padding: 18px; border-radius: 16px; background: var(--cc-white); border: 1px solid var(--cc-line); min-width: 0; animation: g-in .45s cubic-bezier(.16,1,.3,1) both; }
    .k:nth-child(2) { animation-delay: .04s; } .k:nth-child(3) { animation-delay: .08s; } .k:nth-child(4) { animation-delay: .12s; }
    .k.main { background: var(--cc-forest); border-color: transparent; }
    .k small { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--gm); }
    .k strong { display: block; margin-top: 6px; font-size: 24px; letter-spacing: -.03em; font-weight: 800; color: var(--cc-ink); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .k > span { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.4; color: var(--gm); }
    .k.main small, .k.main > span { color: #cfdcd4; }
    .k.main strong { color: #fff; font-size: 30px; }
    .up { color: var(--cc-success); font-weight: 700; } .down { color: var(--cc-danger); font-weight: 700; }
    .k.main .up { color: var(--cc-lime); } .k.main .down { color: #F0A39C; }
    h2 { margin: 0 0 4px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .sub { margin: 0 0 10px; font-size: 13.5px; color: var(--gm); }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; overflow: hidden; margin-bottom: 22px; animation: g-in .45s cubic-bezier(.16,1,.3,1) .14s both; }
    .mh, .mr { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, .8fr); gap: 12px; align-items: center; padding: 12px 16px; }
    .mh { font-size: 12.5px; font-weight: 700; color: var(--gm); background: var(--cc-paper-2); }
    .mr { border-top: 1px solid var(--cc-line); font-size: 14px; color: var(--cc-ink); }
    .mr b { font-weight: 750; }
    .r { text-align: right; font-variant-numeric: tabular-nums; }
    .mr .gain { color: var(--cc-success); font-weight: 800; }
    .mr .lbl { display: none; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 14px; padding: 13px 16px; border-top: 1px solid var(--cc-line); }
    .row:first-child { border-top: 0; }
    .row-t { min-width: 0; }
    .row-t b { display: block; font-size: 14px; font-weight: 650; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-t span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--gm); }
    .row-n { text-align: right; }
    .row-n b { display: block; font-size: 15.5px; font-weight: 800; color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .chip { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11.5px; font-weight: 750; white-space: nowrap; background: var(--cc-success-bg); color: var(--cc-success); }
    .chip.ref { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .chip.split { background: var(--cc-warning-bg); color: #8a5a14; }
    .split-line { grid-column: 1 / -1; font-size: 12.5px; color: var(--gm); font-variant-numeric: tabular-nums; }
    .more { width: 100%; min-height: 46px; border: 0; border-top: 1px solid var(--cc-line); background: none; color: var(--primary); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .empty { padding: 26px 16px; text-align: center; font-size: 14px; color: var(--gm); }
    .sk { height: 110px; border-radius: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: g-sk 1.2s linear infinite; }
    @keyframes g-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes g-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .g-head h1, :host-context([data-theme="dark"]) .k:not(.main) strong, :host-context([data-theme="dark"]) h2,
    :host-context([data-theme="dark"]) .mr, :host-context([data-theme="dark"]) .row-t b, :host-context([data-theme="dark"]) .row-n b,
    :host-context([data-theme="dark"]) .note { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .k.main { background: #12392f; }
    :host-context([data-theme="dark"]) .mh, :host-context([data-theme="dark"]) .note { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .note svg, :host-context([data-theme="dark"]) .more { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .mr .gain { color: #9FDDB4 !important; }
    :host-context([data-theme="dark"]) .chip { color: #9FDDB4; background: rgba(159,221,180,.1); }
    :host-context([data-theme="dark"]) .chip.ref { color: #F0A39C; background: rgba(240,163,156,.1); }
    :host-context([data-theme="dark"]) .chip.split { color: #E3A857; background: rgba(227,168,87,.12); }
    @media (max-width: 1000px) { .kpis { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 700px) {
      .mh { display: none; }
      .mr { grid-template-columns: 1fr 1fr; gap: 6px 12px; }
      .mr > :first-child { grid-column: 1 / -1; font-size: 15px; }
      .mr .r { text-align: left; }
      .mr .lbl { display: block; font-size: 11.5px; font-weight: 650; color: var(--gm); }
    }
    @media (max-width: 640px) {
      .kpis { gap: 10px; } .k { padding: 14px; } .k strong { font-size: 19px; } .k.main, .k:last-child { grid-column: 1 / -1; } .k.main strong { font-size: 26px; }
      .row { padding: 12px 14px; }
    }
    @media (prefers-reduced-motion: reduce) { .k, .box, .sk { animation: none; } }
  `],
  template: `
    <div class="g">
      <section class="g-head">
        <h1>Gains de la plateforme</h1>
        <p>Frais de service et commissions réellement conservés par la plateforme.</p>
      </section>

      @if (simulation()) {
        <div class="note" role="note"><svg lucideFlaskConical size="16"></svg>
          <span>Paiements en mode test : ces montants viennent de courses simulées, aucun argent réel n’a été encaissé.</span></div>
      }

      @if (loading()) {
        <div class="kpis"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      } @else if (stats(); as s) {
        <section class="kpis" aria-label="Résumé">
          <article class="k main">
            <small><svg lucideTrendingUp size="14"></svg> Gagné en {{ monthName }}</small>
            <strong>{{ xaf(s.gainsThisMonth) }}</strong>
            <span>@if (trend() === null) { {{ s.gainsLastMonth ? '' : 'Rien le mois dernier' }} } @else { <span [class.up]="trend()! >= 0" [class.down]="trend()! < 0">{{ trend()! >= 0 ? '+' : '' }}{{ pct(trend()!) }}</span> par rapport au mois dernier ({{ xaf(s.gainsLastMonth) }}) }</span>
          </article>
          <article class="k">
            <small><svg lucideWallet size="14"></svg> Depuis le lancement</small>
            <strong>{{ xaf(s.totalGains) }}</strong>
            <span>gagnés au total</span>
          </article>
          <article class="k">
            <small>Payé par les clients</small>
            <strong>{{ xaf(s.totalVolume) }}</strong>
            <span>courses clôturées, achats compris@if (s.totalVolume > 0) { · {{ pct((s.totalGains / s.totalVolume) * 100) }} pour la plateforme }</span>
          </article>
          <article class="k">
            <small>Courses terminées</small>
            <strong>{{ nf(s.totalCourses) }}</strong>
            <span>payées au coursier ou partagées</span>
          </article>
        </section>

        <h2>Mois par mois</h2>
        <p class="sub">Ce que la plateforme a gardé chaque mois, comparé à ce que les clients ont payé.</p>
        <section class="box" aria-label="Historique mensuel">
          @if (s.monthly.length) {
            <div class="mh" aria-hidden="true"><span>Mois</span><span class="r">Courses</span><span class="r">Gagné</span><span class="r">Payé par les clients</span><span class="r">Part</span></div>
            @for (m of s.monthly; track m.month) {
              <div class="mr">
                <b>{{ month(m.month) }}</b>
                <span class="r"><span class="lbl">Courses</span>{{ nf(m.nbCourses) }}</span>
                <span class="r gain"><span class="lbl">Gagné</span>{{ xaf(m.gains) }}</span>
                <span class="r"><span class="lbl">Payé par les clients</span>{{ xaf(m.volume) }}</span>
                <span class="r"><span class="lbl">Part</span>{{ m.volume > 0 ? pct((m.gains / m.volume) * 100) : '—' }}</span>
              </div>
            }
          } @else {
            <div class="empty">Aucun gain pour le moment. Ils apparaîtront dès la première course clôturée.</div>
          }
        </section>

        <h2>Dernières courses clôturées</h2>
        <p class="sub">Ce que chaque course a rapporté.</p>
        <section class="box" aria-label="Dernières courses">
          @for (c of shown(); track c.courseId) {
            <article class="row">
              <div class="row-t"><b>{{ c.description || ('Course n° ' + c.courseId) }}</b><span>Course n° {{ c.courseId }}@if (c.completedAt) { · {{ c.completedAt }} }</span></div>
              <div class="row-n"><b>+ {{ xaf(c.platformFeeAmount) }}</b><span class="chip" [class.ref]="outcome(c) === 'REFUNDED'" [class.split]="outcome(c) === 'SPLIT'">{{ outcomeLabel(c) }}</span></div>
              <span class="split-line">
                @if (outcome(c) === 'RELEASED') {
                  Client {{ xaf(c.totalAmount) }} · frais client {{ xaf(c.commissionAmount) }} ({{ pct(c.commissionRate) }}) · commission {{ xaf(c.platformFeeAmount - c.commissionAmount) }} ({{ pct(c.commissionRateCourier) }}) · coursier {{ xaf(c.courierAmount) }}
                } @else if (outcome(c) === 'REFUNDED') {
                  Client remboursé après litige : la plateforme a gardé {{ c.platformFeeAmount > 0 ? 'ses frais de service' : 'rien' }}.
                } @else {
                  Montant partagé après litige entre le client et le coursier.
                }
              </span>
            </article>
          } @empty {
            <div class="empty">Aucune course clôturée pour le moment.</div>
          }
          @if (s.recentCourses.length > limit()) {
            <button type="button" class="more" (click)="limit.set(s.recentCourses.length)">Voir les {{ s.recentCourses.length - limit() }} autres <svg lucideChevronDown size="15"></svg></button>
          }
        </section>
      } @else {
        <div class="empty">Impossible de charger les gains pour le moment.</div>
      }
    </div>
  `,
})
export class AdminGainsComponent implements OnInit {
  private adminService = inject(AdminService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly stats = signal<GainsStatsResponse | null>(null);
  readonly loading = signal(true);
  readonly simulation = signal(false);
  readonly limit = signal(8);
  readonly monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  /** Évolution vs mois dernier ; null si le mois dernier n'a rien rapporté (pas de pourcentage inventé). */
  readonly trend = computed<number | null>(() => {
    const s = this.stats();
    if (!s || !s.gainsLastMonth) return null;
    return ((s.gainsThisMonth - s.gainsLastMonth) / s.gainsLastMonth) * 100;
  });
  readonly shown = computed<CourseGainEntry[]>(() => (this.stats()?.recentCourses ?? []).slice(0, this.limit()));

  ngOnInit(): void {
    this.http.get<{ paymentMode?: string }>('/api/commissions/public').subscribe({
      next: (p) => this.simulation.set(p?.paymentMode === 'SIMULATION'),
      error: () => {},
    });
    this.adminService.getGains().subscribe({
      next: (data) => { this.stats.set(this.normalize(data)); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des gains.'); this.loading.set(false); },
    });
  }

  /** Les montants BigDecimal peuvent arriver en chaîne : tout est converti en nombre une fois. */
  private normalize(d: GainsStatsResponse): GainsStatsResponse {
    const n = (v: unknown) => Number(v ?? 0);
    return {
      ...d,
      totalGains: n(d.totalGains), totalVolume: n(d.totalVolume), totalCourses: n(d.totalCourses),
      gainsThisMonth: n(d.gainsThisMonth), gainsLastMonth: n(d.gainsLastMonth),
      monthly: (d.monthly ?? []).map((m) => ({ ...m, gains: n(m.gains), volume: n(m.volume), nbCourses: n(m.nbCourses) })),
      recentCourses: (d.recentCourses ?? []).map((c) => ({ ...c, totalAmount: n(c.totalAmount), commissionAmount: n(c.commissionAmount),
        platformFeeAmount: n(c.platformFeeAmount), courierAmount: n(c.courierAmount), commissionRate: n(c.commissionRate), commissionRateCourier: n(c.commissionRateCourier) })),
    };
  }

  outcome(c: CourseGainEntry): 'RELEASED' | 'REFUNDED' | 'SPLIT' {
    if (c.escrowStatus === 'SPLIT') return 'SPLIT';
    if (c.status === 'REFUNDED' || c.escrowStatus === 'REFUNDED') return 'REFUNDED';
    return 'RELEASED';
  }
  outcomeLabel(c: CourseGainEntry): string { return { RELEASED: 'Payée au coursier', REFUNDED: 'Client remboursé', SPLIT: 'Partagée' }[this.outcome(c)]; }

  month(yyyyMM: string): string {
    const [y, m] = yyyyMM.split('-').map(Number);
    const s = new Date(y, (m || 1) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  nf(v: number): string { return new Intl.NumberFormat('fr-FR').format(v || 0).replace(/ /g, ' '); }
  xaf(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0)).replace(/ /g, ' ')} XAF`; }
  pct(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v || 0)} %`; }
}
