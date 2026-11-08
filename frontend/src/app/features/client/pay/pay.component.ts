import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideBadgeCheck, LucideCreditCard, LucideFlaskConical, LucideInfo, LucideLockKeyhole,
  LucideReceipt, LucideShieldCheck,
} from '@lucide/angular';

type PaymentMethod = 'MTN' | 'ORANGE' | 'STRIPE';

interface Method { value: PaymentMethod; label: string; hint: string; mark: string; }

/** Ordre : Mobile Money d'abord (usage majoritaire au Cameroun), carte ensuite. */
const METHODS: Method[] = [
  { value: 'MTN', label: 'MTN Mobile Money', hint: 'Depuis votre compte MTN MoMo', mark: 'MTN' },
  { value: 'ORANGE', label: 'Orange Money', hint: 'Depuis votre compte Orange Money', mark: 'OM' },
  { value: 'STRIPE', label: 'Carte bancaire', hint: 'Visa, Mastercard — utile depuis l’étranger', mark: 'card' },
];

/**
 * Paiement d'une course (base maquette-v2/client/pay.html, Impeccable, mode Operate).
 * Le tarif vient du serveur (offre acceptée) ; le client ne saisit que le montant des achats convenu.
 * Taux et délais lus du serveur (/api/commissions/public) — jamais écrits en dur.
 * Tant que `paymentMode` vaut SIMULATION, l'écran l'annonce : aucun débit réel n'a lieu.
 */
@Component({
  selector: 'app-pay',
  standalone: true,
  imports: [
    FormsModule, RouterLink,
    LucideBadgeCheck, LucideCreditCard, LucideFlaskConical, LucideInfo, LucideLockKeyhole,
    LucideReceipt, LucideShieldCheck,
  ],
  styles: [`
    :host { display: block; --pm: #56635c; }
    :host-context([data-theme="dark"]) { --pm: #B0C0B7; }
    .pay { max-width: 1040px; margin: 0 auto; }
    .pay-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .pay-head p { margin: 0 0 20px; font-size: 15px; color: var(--pm); max-width: 60ch; }
    .sim { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 18px; padding: 12px 14px; border-radius: 12px;
      background: var(--cc-warning-bg); border: 1px solid color-mix(in oklab, var(--cc-warning) 40%, transparent); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .sim svg { flex: none; margin-top: 1px; color: var(--cc-warning); }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; }
    .blk { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 22px; margin-bottom: 16px;
      animation: pay-in .45s cubic-bezier(.16,1,.3,1) both; }
    .blk:nth-child(2) { animation-delay: .06s; }
    .blk h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 4px; font-size: 17px; letter-spacing: -.02em; font-weight: 750; color: var(--cc-ink); }
    .num { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; }
    .blk > p { margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: var(--pm); }
    .seg { display: inline-grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: var(--cc-paper-2); margin-bottom: 14px; }
    .seg button { min-height: 42px; padding: 0 18px; border: 0; border-radius: 9px; background: none; color: var(--pm); font: inherit; font-weight: 700; cursor: pointer; }
    .seg button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.1); }
    .amount { display: flex; align-items: center; gap: 8px; max-width: 280px; }
    .amount input { font-size: 18px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
    .amount span { font-weight: 700; color: var(--pm); }
    .tip { display: flex; gap: 8px; margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: var(--pm); }
    .tip svg { flex: none; margin-top: 2px; color: var(--primary); }
    .methods { display: grid; gap: 10px; }
    .m { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1.5px solid var(--cc-line); border-radius: 13px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; text-align: left; cursor: pointer; transition: border-color .18s, background .18s, box-shadow .18s; }
    .m:hover { border-color: color-mix(in oklab, var(--primary) 45%, var(--cc-line)); }
    .m.on { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 7%, var(--cc-white)); box-shadow: 0 6px 18px color-mix(in oklab, var(--primary) 14%, transparent); }
    .mark { flex: none; width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; letter-spacing: -.02em; }
    .mark.mtn { background: #ffcc00; color: #1a1a1a; }
    .mark.om { background: #ff7900; color: #fff; }
    .mark.card { background: var(--cc-paper-2); color: var(--primary); }
    .mark svg { display: block; flex: none; width: 21px; height: 21px; }
    .m b { display: block; font-size: 15px; }
    .m small { display: block; margin-top: 2px; font-size: 13px; color: var(--pm); }
    .radio { margin-left: auto; flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid color-mix(in oklab, var(--cc-ink) 30%, transparent); display: grid; place-items: center; }
    .m.on .radio { border-color: var(--primary); }
    .m.on .radio::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); animation: pay-pop .25s cubic-bezier(.16,1,.3,1); }
    .sum { position: sticky; top: 84px; background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 22px;
      box-shadow: 0 14px 34px rgba(18,59,50,.08); animation: pay-in .5s cubic-bezier(.16,1,.3,1) .1s both; }
    .sum h2 { margin: 0 0 12px; font-size: 16px; font-weight: 750; color: var(--cc-ink); }
    .course { padding: 12px; border-radius: 12px; background: var(--cc-paper-2); margin-bottom: 14px; }
    .course p { margin: 0; font-size: 14px; line-height: 1.45; color: var(--cc-ink); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .course small { display: flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 12.5px; color: var(--pm); }
    .line { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 14px; color: var(--pm); }
    .line b { color: var(--cc-ink); font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .total { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--cc-line); }
    .total span { font-weight: 750; color: var(--cc-ink); }
    .total strong { font-size: 26px; letter-spacing: -.03em; color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .total strong.bump { animation: pay-bump .3s cubic-bezier(.16,1,.3,1); }
    .cta { width: 100%; min-height: 52px; margin-top: 16px; justify-content: center; font-size: 15px; }
    .inactive { opacity: .45; box-shadow: none; }
    .methods.nudge { animation: pay-nudge .5s ease-in-out; border-radius: 14px; box-shadow: 0 0 0 3px color-mix(in oklab, var(--cc-danger) 45%, transparent); }
    @keyframes pay-nudge { 0%,100% { transform: none; } 25% { transform: translateX(-5px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-2px); } }
    .escrow { display: grid; gap: 8px; margin-top: 14px; font-size: 13px; line-height: 1.45; color: var(--pm); }
    .escrow div { display: flex; gap: 8px; align-items: flex-start; }
    .escrow svg { flex: none; margin-top: 1px; color: var(--primary); }
    .state { max-width: 560px; margin: 10px auto; text-align: center; padding: 30px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); }
    .state h2 { margin: 0 0 8px; font-size: 19px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .state p { margin: 0 0 16px; color: var(--pm); line-height: 1.55; }
    .sk { height: 120px; border-radius: 16px; margin-bottom: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: pay-sk 1.2s linear infinite; }
    @keyframes pay-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes pay-pop { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes pay-bump { 0% { transform: scale(1); } 40% { transform: scale(1.06); } 100% { transform: scale(1); } }
    @keyframes pay-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .pay-head h1, :host-context([data-theme="dark"]) .blk h2, :host-context([data-theme="dark"]) .sum h2,
    :host-context([data-theme="dark"]) .course p, :host-context([data-theme="dark"]) .state h2 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .num, :host-context([data-theme="dark"]) .m.on .radio::after { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .m.on .radio { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .mark.card, :host-context([data-theme="dark"]) .course { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .mark.card { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .seg button.on { background: #2B4A3E; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .sim, :host-context([data-theme="dark"]) .sum { color: #F3F7F5; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .sum { position: static; }
    }
    .paybar { display: none; }
    @media (max-width: 767.98px) {
      .pay.has-bar { padding-bottom: 84px; }
      .sum .cta { display: none; }
      .paybar { display: flex; align-items: center; gap: 12px; position: fixed; left: 0; right: 0; z-index: 30;
        bottom: calc(56px + env(safe-area-inset-bottom)); padding: 10px 16px; background: var(--cc-white);
        border-top: 1px solid var(--cc-line); box-shadow: 0 -8px 24px rgba(18,59,50,.08); animation: pay-up .35s cubic-bezier(.16,1,.3,1); }
      .paybar div { display: grid; line-height: 1.15; }
      .paybar small { font-size: 12px; color: var(--pm); }
      .paybar strong { font-size: 18px; letter-spacing: -.02em; color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .paybar .primary-action { flex: 1; min-height: 48px; justify-content: center; }
      :host-context([data-theme="dark"]) .paybar strong { color: #F3F7F5; }
    }
    @keyframes pay-up { from { transform: translateY(100%); } to { transform: none; } }
    @media (max-width: 640px) { .blk, .sum { padding: 18px 16px; } .amount { max-width: none; } }
    @media (prefers-reduced-motion: reduce) { .paybar, .blk, .sum, .total strong.bump, .m.on .radio::after, .sk { animation: none; } }
  `],
  template: `
    <div class="pay" [class.has-bar]="!loading() && !loadError() && status() === 'ASSIGNED'">
      <section class="pay-head">
        <h1>Paiement</h1>
        <p>Vérifiez le montant puis payez. Votre argent reste bloqué tant que vous n’avez pas validé les preuves de la course.</p>
      </section>

      @if (loading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else if (loadError()) {
        <div class="state" role="alert">
          <h2>Course introuvable</h2>
          <p>Impossible de charger les informations de paiement. Réessayez depuis le chat de la course.</p>
          <a class="primary-action" routerLink="/client/dashboard">Retour au tableau de bord</a>
        </div>
      } @else if (status() !== 'ASSIGNED') {
        <div class="state" role="status">
          @if (status() === 'PUBLISHED') {
            <h2>Aucune offre acceptée pour l’instant</h2>
            <p>Acceptez d’abord l’offre d’un coursier dans le chat : le paiement s’ouvre ensuite.</p>
            <a class="primary-action" [routerLink]="['/client/select-courier', courseId]">Voir les coursiers</a>
          } @else {
            <h2>Cette course est déjà payée</h2>
            <p>Le paiement a été enregistré. Suivez l’avancement de la course et ses preuves depuis son détail.</p>
            <a class="primary-action" [routerLink]="['/client/course-detail', courseId]">Suivre la course</a>
          }
        </div>
      } @else {
        @if (paymentMode() === 'SIMULATION') {
          <div class="sim" role="note"><svg lucideFlaskConical size="17"></svg>
            <span><strong>Paiement en mode test.</strong> Aucun prestataire de paiement n’est encore branché : aucun montant ne sera réellement débité.</span></div>
        }

        <div class="grid">
          <div>
            <section class="blk" aria-labelledby="pay-buy">
              <h2 id="pay-buy"><span class="num">1</span> Y a-t-il des achats à rembourser ?</h2>
              <p>Si le coursier avance de l’argent pour vous (marché, pharmacie…), indiquez le montant convenu dans le chat.</p>
              <div class="seg" role="radiogroup" aria-label="Achats à rembourser">
                <button type="button" role="radio" [attr.aria-checked]="!hasPurchases()" [class.on]="!hasPurchases()" (click)="setPurchases(false)">Non</button>
                <button type="button" role="radio" [attr.aria-checked]="hasPurchases()" [class.on]="hasPurchases()" (click)="setPurchases(true)">Oui</button>
              </div>
              @if (hasPurchases()) {
                <label class="form-label" for="pay-frais">Montant des achats</label>
                <div class="amount">
                  <input id="pay-frais" class="form-input" type="number" inputmode="numeric" min="0" step="1"
                         [ngModel]="purchases()" (ngModelChange)="purchases.set(clamp($event))" placeholder="0">
                  <span>XAF</span>
                </div>
                <p class="tip"><svg lucideReceipt size="15"></svg>
                  <span>Le coursier devra joindre le reçu à ses preuves. Ne saisissez que le montant convenu dans le chat : si on vous demande autre chose en dehors de la plateforme, signalez-le.</span></p>
              }
            </section>

            <section class="blk" aria-labelledby="pay-method">
              <h2 id="pay-method"><span class="num">2</span> Comment voulez-vous payer ?</h2>
              <p>{{ location() === 'ABROAD' ? 'Vous payez depuis l’étranger : par carte bancaire.' : location() === 'CAMEROON' ? 'Vous payez depuis le Cameroun : par Mobile Money.' : 'Choisissez votre moyen de paiement.' }}</p>
              <div class="methods" id="pay-methods" role="radiogroup" aria-labelledby="pay-method" [class.nudge]="nudge()">
                @for (m of allowedMethods(); track m.value) {
                  <button type="button" class="m" role="radio" [attr.aria-checked]="method() === m.value" [class.on]="method() === m.value" (click)="method.set(m.value)">
                    @if (m.mark === 'card') { <span class="mark card"><svg lucideCreditCard size="21"></svg></span> }
                    @else { <span class="mark" [class.mtn]="m.value === 'MTN'" [class.om]="m.value === 'ORANGE'">{{ m.mark }}</span> }
                    <span><b>{{ m.label }}</b><small>{{ m.hint }}</small></span>
                    <span class="radio" aria-hidden="true"></span>
                  </button>
                }
              </div>
            </section>
          </div>

          <aside class="sum" aria-label="Récapitulatif">
            <h2>Récapitulatif</h2>
            <div class="course">
              <p>{{ description() }}</p>
              @if (courierName()) { <small><svg lucideBadgeCheck size="13"></svg> {{ courierName() }}</small> }
            </div>
            <div class="line"><span>Tarif du coursier</span><b>{{ xaf(tarif()) }}</b></div>
            @if (hasPurchases()) { <div class="line"><span>Achats à rembourser</span><b>{{ xaf(purchases() ?? 0) }}</b></div> }
            @if (feeRate() > 0) { <div class="line"><span>Frais de service ({{ rateLabel() }} %)</span><b>{{ xaf(fees()) }}</b></div> }
            <div class="total">
              <span>Total</span>
              @for (t of [total()]; track t) { <strong class="bump" aria-live="polite">{{ xaf(t) }}</strong> }
            </div>

            <button type="button" class="primary-action cta" [class.inactive]="!canPay()" [attr.aria-disabled]="!canPay()" [disabled]="paying()" (click)="pay()">
              @if (paying()) { Paiement en cours… } @else { <svg lucideLockKeyhole size="16"></svg> Payer {{ xaf(total()) }} }
            </button>

            <div class="escrow">
              <div><svg lucideShieldCheck size="15"></svg><span>L’argent est bloqué : le coursier n’est payé qu’après votre validation des preuves@if (autoValidateHours()) {, ou automatiquement {{ autoValidateHours() }} h après leur envoi si vous ne réagissez pas}.</span></div>
              <div><svg lucideInfo size="15"></svg><span>Sans preuves dans les délais, vous pouvez annuler et être remboursé, ou ouvrir un litige.</span></div>
            </div>
          </aside>
        </div>

        <!-- Mobile : total et paiement toujours à portée de pouce -->
        <div class="paybar">
          <div><small>Total</small><strong>{{ xaf(total()) }}</strong></div>
          <button type="button" class="primary-action" [class.inactive]="!canPay()" [attr.aria-disabled]="!canPay()" [disabled]="paying()" (click)="pay()">
            @if (paying()) { Paiement… } @else { <svg lucideLockKeyhole size="16"></svg> Payer }
          </button>
        </div>
      }
    </div>
  `,
})
export class PayComponent implements OnInit {
  readonly methods = METHODS;
  courseId = 0;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly status = signal('');
  readonly tarif = signal(0);
  readonly description = signal('');
  readonly courierName = signal('');
  readonly feeRate = signal(0);
  readonly autoValidateHours = signal<number | null>(null);
  readonly paymentMode = signal('');

  readonly hasPurchases = signal(false);
  readonly purchases = signal<number | null>(null);
  readonly method = signal<PaymentMethod | null>(null);
  readonly paying = signal(false);
  readonly nudge = signal(false);
  /** D'où le client paie (indiqué à la création) : CAMEROON | ABROAD | null (ancienne course). */
  readonly location = signal<'CAMEROON' | 'ABROAD' | null>(null);
  readonly allowedMethods = computed(() => {
    const loc = this.location();
    if (loc === 'ABROAD') return METHODS.filter((m) => m.value === 'STRIPE');
    if (loc === 'CAMEROON') return METHODS.filter((m) => m.value !== 'STRIPE');
    return METHODS;
  });

  /** Même calcul que le serveur (PaymentService) : base = achats + tarif ; frais = base × taux ; total = base + frais. */
  readonly fees = computed(() => Math.round((this.base() * this.feeRate()) / 100));
  readonly total = computed(() => this.base() + this.fees());
  private readonly base = computed(() => this.tarif() + (this.hasPurchases() ? this.purchases() ?? 0 : 0));

  /**
   * Clé d'idempotence générée une seule fois par visite : un nouvel essai après une erreur réseau rejoue
   * la même clé, le serveur renvoie alors le même paiement sans double débit.
   */
  private readonly idempotencyKey = crypto.randomUUID();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId') ?? 0);
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (s) => {
        this.feeRate.set(Number(s?.commissionRateClient ?? 0));
        this.autoValidateHours.set(s?.autoValidateHours ?? null);
        this.paymentMode.set(s?.paymentMode ?? '');
      },
      error: () => this.feeRate.set(0),
    });
    if (!this.courseId) { this.loading.set(false); this.loadError.set(true); return; }
    this.http.get<any>(`/api/courses/${this.courseId}`).subscribe({
      next: (c) => {
        this.tarif.set(Number(c?.courseAmount ?? 0));
        this.status.set(c?.status ?? '');
        this.description.set(c?.description ?? '');
        this.courierName.set(c?.courierName ?? '');
        const loc = c?.clientLocation === 'CAMEROON' || c?.clientLocation === 'ABROAD' ? c.clientLocation : null;
        this.location.set(loc);
        if (loc === 'ABROAD') this.method.set('STRIPE'); // un seul moyen possible : déjà choisi
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  setPurchases(v: boolean): void {
    this.hasPurchases.set(v);
    if (v) setTimeout(() => document.getElementById('pay-frais')?.focus(), 0);
  }

  clamp(v: unknown): number | null {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  xaf(n: number): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} XAF`;
  }

  rateLabel(): string { return String(this.feeRate()).replace('.', ','); }

  canPay(): boolean {
    return this.status() === 'ASSIGNED' && this.tarif() > 0 && !!this.method()
        && (!this.hasPurchases() || this.purchases() !== null);
  }

  pay(): void {
    if (this.paying()) return;
    if (!this.method()) {
      this.toast.error('Choisissez d’abord un moyen de paiement.');
      this.nudge.set(false);
      setTimeout(() => this.nudge.set(true), 0);
      setTimeout(() => this.nudge.set(false), 1600);
      document.getElementById('pay-methods')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (this.hasPurchases() && this.purchases() === null) {
      this.toast.error('Indiquez le montant des achats, ou choisissez « Non ».');
      document.getElementById('pay-frais')?.focus();
      return;
    }
    if (!this.canPay()) return;
    this.paying.set(true);
    this.paymentService.initiate({
      courseId: this.courseId,
      fraisReels: this.hasPurchases() ? this.purchases() ?? 0 : 0,
      paymentMethod: this.method()!,
      idempotencyKey: this.idempotencyKey,
    }).subscribe({
      next: (res) => {
        this.paying.set(false);
        this.toast.success(`Paiement enregistré : l’argent est bloqué jusqu’à votre validation. Réf. ${res.paymentRef}`);
        this.router.navigate(['/client/course-detail', res.courseId]);
      },
      error: (err) => {
        this.paying.set(false);
        this.toast.error(err.error?.message || 'Le paiement n’a pas abouti. Vous pouvez réessayer sans risque de double débit.');
      },
    });
  }
}
