import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideBike, LucideInfo, LucideUser } from '@lucide/angular';

interface Rates { client: number; courier: number; min: number; }

const LIMITS = { client: 10, courier: 40 };

/**
 * Commissions (admin, Impeccable, mode Operate).
 * Deux prélèvements indépendants, comme dans PaymentService :
 *  - frais de service client = (tarif + achats) × taux client, AJOUTÉS au prix payé par le client ;
 *  - commission coursier = tarif × taux coursier, retenue sur le tarif seul (les achats lui sont remboursés).
 * Le taux client ne réduit donc jamais ce que reçoit le coursier.
 */
@Component({
  selector: 'app-admin-commissions',
  standalone: true,
  imports: [FormsModule, LucideBike, LucideInfo, LucideUser],
  styles: [`
    :host { display: block; min-width: 0; --cm: #56635c; }
    :host-context([data-theme="dark"]) { --cm: #B0C0B7; }
    .c { max-width: 980px; margin: 0 auto; padding-bottom: 90px; }
    .c-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .c-head p { margin: 0 0 14px; font-size: 15px; color: var(--cm); }
    .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 18px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .note svg { flex: none; margin-top: 1px; color: var(--primary); }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; margin-bottom: 14px; }
    .card { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 18px; animation: c-in .45s cubic-bezier(.16,1,.3,1) both; }
    .card:nth-child(2) { animation-delay: .05s; }
    .card-h { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .ic { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-success-bg); color: var(--primary); }
    .ic.cour { background: var(--cc-warning-bg); color: #8a5a14; }
    .card-h h2 { margin: 0 0 3px; font-size: 16px; font-weight: 750; color: var(--cc-ink); }
    .card-h p { margin: 0; font-size: 13px; line-height: 1.45; color: var(--cm); }
    .rate { display: flex; align-items: center; gap: 12px; }
    .rate input[type="range"] { flex: 1; min-width: 0; accent-color: var(--primary); height: 28px; }
    .num { flex: none; display: flex; align-items: center; gap: 4px; }
    .num input { width: 76px; min-height: 44px; padding: 0 10px; border: 1px solid var(--cc-line); border-radius: 10px; background: var(--cc-white); color: var(--cc-ink); font: inherit; font-size: 18px; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
    .num span { font-size: 16px; font-weight: 700; color: var(--cm); }
    .was { margin: 8px 0 0; font-size: 12.5px; color: var(--cm); }
    .was b { color: var(--cc-ink); }
    .err { margin: 6px 0 0; font-size: 12.5px; color: var(--cc-danger); }
    .min label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 700; color: var(--cc-ink); }
    .min .row { display: flex; align-items: center; gap: 8px; max-width: 280px; }
    .min .row input { flex: 1; min-width: 0; }
    .min .row span { font-weight: 700; color: var(--cm); }
    .min p { margin: 6px 0 0; font-size: 13px; color: var(--cm); }
    h2.sec { margin: 22px 0 4px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    p.sec { margin: 0 0 12px; font-size: 13.5px; color: var(--cm); }
    .ex { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .ex label { display: grid; gap: 4px; font-size: 12.5px; font-weight: 700; color: var(--cm); }
    .ex input { width: 150px; }
    .sim { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .col { padding: 16px; border-radius: 14px; border: 1px solid var(--cc-line); background: var(--cc-white); }
    .col h3 { margin: 0 0 10px; display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 750; color: var(--cc-ink); }
    .line { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 13.5px; color: var(--cm); }
    .line b { color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 650; }
    .tot { margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--cc-line); font-size: 14.5px; }
    .tot b { font-size: 18px; font-weight: 800; }
    .col.cour .tot b { color: var(--cc-success); }
    .bar { position: sticky; bottom: 12px; z-index: 5; margin-top: 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px;
      background: var(--cc-forest); color: #fff; box-shadow: 0 12px 32px rgba(18,59,50,.25); animation: c-up .3s cubic-bezier(.16,1,.3,1); }
    .bar span { flex: 1 1 200px; font-size: 14px; }
    .bar button { min-height: 44px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
    .bar .ghost { border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; }
    .bar .save { border: 0; background: var(--cc-lime); color: #123b32; }
    .bar button:disabled { opacity: .5; cursor: not-allowed; }
    .sk { height: 150px; border-radius: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: c-sk 1.2s linear infinite; }
    @keyframes c-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes c-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes c-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .c-head h1, :host-context([data-theme="dark"]) .card-h h2, :host-context([data-theme="dark"]) h2.sec,
    :host-context([data-theme="dark"]) .col h3, :host-context([data-theme="dark"]) .line b, :host-context([data-theme="dark"]) .min label,
    :host-context([data-theme="dark"]) .was b, :host-context([data-theme="dark"]) .note { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .note, :host-context([data-theme="dark"]) .ic { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .note svg, :host-context([data-theme="dark"]) .ic { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .ic.cour { color: #E3A857; background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .col.cour .tot b { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .rate input[type="range"] { accent-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .bar { background: #0f2c25; border: 1px solid rgba(214,240,140,.25); }
    @media (max-width: 860px) { .grid, .sim { grid-template-columns: minmax(0, 1fr); } }
    @media (max-width: 640px) {
      .card, .col { padding: 16px 14px; }
      .ex label { flex: 1 1 140px; } .ex input { width: 100%; }
      .bar { bottom: 76px; } .bar button { flex: 1 1 auto; }
    }
    @media (prefers-reduced-motion: reduce) { .card, .bar, .sk { animation: none; } }
  `],
  template: `
    <div class="c">
      <section class="c-head">
        <h1>Commissions</h1>
        <p>Ce que la plateforme gagne sur chaque course payée.</p>
      </section>

      <div class="note" role="note"><svg lucideInfo size="16"></svg>
        <span>Les nouveaux taux s’appliquent aux courses payées après l’enregistrement. Les courses déjà payées gardent leurs montants.</span></div>

      @if (loading()) {
        <div class="grid"><div class="sk"></div><div class="sk"></div></div>
      } @else {
        <div class="grid">
          <section class="card" aria-labelledby="c-client">
            <div class="card-h">
              <span class="ic" aria-hidden="true"><svg lucideUser size="19"></svg></span>
              <div><h2 id="c-client">Frais de service client</h2>
                <p>Calculés sur le tarif du coursier et les achats avancés, puis ajoutés au prix payé par le client. Ils ne réduisent jamais ce que reçoit le coursier.</p></div>
            </div>
            <div class="rate">
              <input type="range" min="0" [max]="limits.client" step="0.5" [ngModel]="rates().client" (ngModelChange)="set('client', $event)" aria-label="Frais de service client, en pourcentage">
              <label class="num"><input type="number" min="0" [max]="limits.client" step="0.5" inputmode="decimal" [ngModel]="rates().client" (ngModelChange)="set('client', $event)" aria-label="Frais de service client (%)"><span>%</span></label>
            </div>
            @if (errors().client) { <p class="err">{{ errors().client }}</p> }
            @else if (saved() && saved()!.client !== rates().client) { <p class="was">Enregistré : <b>{{ pct(saved()!.client) }}</b></p> }
          </section>

          <section class="card" aria-labelledby="c-courier">
            <div class="card-h">
              <span class="ic cour" aria-hidden="true"><svg lucideBike size="19"></svg></span>
              <div><h2 id="c-courier">Commission sur le tarif du coursier</h2>
                <p>Retenue sur son tarif seulement. Les achats qu’il avance lui sont remboursés en entier.</p></div>
            </div>
            <div class="rate">
              <input type="range" min="0" [max]="limits.courier" step="1" [ngModel]="rates().courier" (ngModelChange)="set('courier', $event)" aria-label="Commission coursier, en pourcentage">
              <label class="num"><input type="number" min="0" [max]="limits.courier" step="1" inputmode="decimal" [ngModel]="rates().courier" (ngModelChange)="set('courier', $event)" aria-label="Commission coursier (%)"><span>%</span></label>
            </div>
            @if (errors().courier) { <p class="err">{{ errors().courier }}</p> }
            @else if (saved() && saved()!.courier !== rates().courier) { <p class="was">Enregistré : <b>{{ pct(saved()!.courier) }}</b></p> }
          </section>
        </div>

        <section class="card min" aria-labelledby="c-min">
          <label id="c-min" for="c-min-input">Tarif minimum d’une offre</label>
          <div class="row"><input id="c-min-input" class="form-input" type="number" min="0" step="500" inputmode="numeric" [ngModel]="rates().min" (ngModelChange)="set('min', $event)"><span>XAF</span></div>
          @if (errors().min) { <p class="err">{{ errors().min }}</p> }
          @else { <p>Un coursier ne peut pas proposer un tarif plus bas.@if (saved() && saved()!.min !== rates().min) { Enregistré : {{ xaf(saved()!.min) }}. }</p> }
        </section>

        <h2 class="sec">Exemple sur une course</h2>
        <p class="sec">Modifiez les montants pour voir qui paie et qui reçoit quoi avec ces taux.</p>
        <div class="ex">
          <label>Tarif du coursier (XAF)<input class="form-input" type="number" min="0" step="500" [ngModel]="exTarif()" (ngModelChange)="exTarif.set(n($event))"></label>
          <label>Achats avancés (XAF)<input class="form-input" type="number" min="0" step="500" [ngModel]="exAchats()" (ngModelChange)="exAchats.set(n($event))"></label>
        </div>
        <div class="sim" aria-live="polite">
          <article class="col">
            <h3><svg lucideUser size="15"></svg> Le client paie</h3>
            <div class="line"><span>Tarif du coursier</span><b>{{ xaf(exTarif()) }}</b></div>
            <div class="line"><span>Achats avancés</span><b>{{ xaf(exAchats()) }}</b></div>
            <div class="line"><span>Frais de service ({{ pct(rates().client) }})</span><b>{{ xaf(sim().clientFee) }}</b></div>
            <div class="line tot"><span>Total</span><b>{{ xaf(sim().total) }}</b></div>
          </article>
          <article class="col cour">
            <h3><svg lucideBike size="15"></svg> Le coursier reçoit</h3>
            <div class="line"><span>Son tarif</span><b>{{ xaf(exTarif()) }}</b></div>
            <div class="line"><span>Commission ({{ pct(rates().courier) }})</span><b>− {{ xaf(sim().commission) }}</b></div>
            <div class="line"><span>Achats remboursés</span><b>{{ xaf(exAchats()) }}</b></div>
            <div class="line tot"><span>Total</span><b>{{ xaf(sim().courier) }}</b></div>
          </article>
          <article class="col">
            <h3>La plateforme garde</h3>
            <div class="line"><span>Frais de service client</span><b>{{ xaf(sim().clientFee) }}</b></div>
            <div class="line"><span>Commission coursier</span><b>{{ xaf(sim().commission) }}</b></div>
            <div class="line tot"><span>Total</span><b>{{ xaf(sim().platform) }}</b></div>
          </article>
        </div>

        @if (dirty()) {
          <div class="bar" role="region" aria-label="Modifications non enregistrées">
            <span>Modifications non enregistrées</span>
            <button type="button" class="ghost" (click)="reset()">Annuler</button>
            <button type="button" class="save" [disabled]="saving() || hasErrors()" (click)="save()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        }
      }
    </div>
  `,
})
export class AdminCommissionsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly limits = LIMITS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal<Rates | null>(null);
  readonly rates = signal<Rates>({ client: 0, courier: 20, min: 0 });
  readonly exTarif = signal(6000);
  readonly exAchats = signal(15000);

  readonly errors = computed(() => {
    const r = this.rates();
    const e: Partial<Record<keyof Rates, string>> = {};
    if (!(r.client >= 0 && r.client <= LIMITS.client)) e.client = `Entre 0 et ${LIMITS.client} %.`;
    if (!(r.courier >= 0 && r.courier <= LIMITS.courier)) e.courier = `Entre 0 et ${LIMITS.courier} %.`;
    if (!(r.min >= 0)) e.min = 'Le tarif minimum ne peut pas être négatif.';
    return e;
  });
  readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);
  readonly dirty = computed(() => {
    const s = this.saved(), r = this.rates();
    return !!s && (s.client !== r.client || s.courier !== r.courier || s.min !== r.min);
  });

  /** Mêmes formules et arrondis que PaymentService.initiate (arrondi à l'unité, demi vers le haut). */
  readonly sim = computed(() => {
    const t = this.exTarif(), a = this.exAchats(), r = this.rates();
    const clientFee = Math.round(((t + a) * (r.client || 0)) / 100);
    const commission = Math.round((t * (r.courier || 0)) / 100);
    return { clientFee, commission, total: t + a + clientFee, courier: t - commission + a, platform: clientFee + commission };
  });

  ngOnInit(): void {
    this.adminService.getCommissions().subscribe({
      next: (s) => { this.apply({ client: Number(s.commissionRateClient), courier: Number(s.commissionRateCourier), min: Number(s.tarifMinimumCoursier) }); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des commissions.'); this.loading.set(false); },
    });
  }

  set(key: keyof Rates, v: unknown): void { this.rates.update((r) => ({ ...r, [key]: this.n(v) })); }
  n(v: unknown): number { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : NaN; }
  reset(): void { const s = this.saved(); if (s) this.rates.set({ ...s }); }

  private apply(r: Rates): void { this.saved.set({ ...r }); this.rates.set({ ...r }); }

  save(): void {
    if (this.hasErrors()) return;
    const r = this.rates();
    this.saving.set(true);
    this.adminService.updateCommissions({ commissionRateClient: r.client, commissionRateCourier: r.courier, tarifMinimumCoursier: r.min }).subscribe({
      next: (s) => {
        this.apply({ client: Number(s.commissionRateClient), courier: Number(s.commissionRateCourier), min: Number(s.tarifMinimumCoursier) });
        this.saving.set(false);
        this.toast.success('Commissions enregistrées : elles s’appliquent aux prochaines courses payées.');
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors de l’enregistrement.'); },
    });
  }

  pct(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v || 0)} %`; }
  xaf(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0))} XAF`; }
}
