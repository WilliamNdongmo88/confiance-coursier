import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { warnLoadFailed } from '../../../shared/state/load-error';
import { LucideArrowRight, LucideClock, LucideLockKeyhole, LucidePercent, LucideSmartphone, LucideTrendingUp, LucideWallet } from '@lucide/angular';

/**
 * Gains du coursier (Impeccable, mode Operate).
 * Distingue l'argent déjà gagné (courses validées) de l'argent bloqué en séquestre (courses en cours ou en
 * attente de validation). Montants figés au paiement, fournis par le serveur. « Versé » n'est affiché que si un
 * prestataire de paiement réel est branché (paymentMode ≠ SIMULATION).
 */
@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideArrowRight, LucideClock, LucideLockKeyhole, LucidePercent, LucideSmartphone, LucideTrendingUp, LucideWallet],
  styles: [`
    :host { display: block; --em: #56635c; }
    :host-context([data-theme="dark"]) { --em: #B0C0B7; }
    .e { max-width: 1040px; margin: 0 auto; }
    .e-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .e-head p { margin: 0 0 18px; font-size: 15px; color: var(--em); }
    .hero { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .k { padding: 18px; border-radius: 16px; background: var(--cc-white); border: 1px solid var(--cc-line); animation: e-in .45s cubic-bezier(.16,1,.3,1) both; }
    .k:nth-child(2) { animation-delay: .05s; } .k:nth-child(3) { animation-delay: .1s; }
    .k.main { background: var(--cc-forest); border-color: transparent; color: #fff; }
    .k small { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--em); }
    .k.main small { color: #cfdcd4; }
    .k strong { display: block; margin-top: 6px; font-size: 26px; letter-spacing: -.03em; font-weight: 800; color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .k.main strong { font-size: 30px; color: #fff; }
    .k span { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.4; color: var(--em); }
    .k.main span { color: #cfdcd4; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 20px; margin-bottom: 16px; animation: e-in .45s cubic-bezier(.16,1,.3,1) .12s both; }
    .box h2 { margin: 0 0 4px; font-size: 16.5px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .box > p { margin: 0 0 12px; font-size: 13.5px; color: var(--em); }
    .tx { display: grid; grid-template-columns: 1fr auto; gap: 4px 14px; padding: 13px 0; border-top: 1px solid var(--cc-line); }
    .tx:first-of-type { border-top: 0; }
    .tx-t { font-size: 14px; font-weight: 650; line-height: 1.35; color: var(--cc-ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .tx-m { grid-column: 1; font-size: 12.5px; color: var(--em); }
    .tx-n { grid-row: 1 / span 2; grid-column: 2; text-align: right; }
    .tx-n b { display: block; font-size: 15.5px; color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .tx-n small { display: block; font-size: 12px; color: var(--em); white-space: nowrap; }
    .badge-s { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11.5px; font-weight: 750; background: var(--cc-success-bg); color: var(--cc-success); }
    .badge-s.wait { background: var(--cc-warning-bg); color: #8a5a14; }
    .empty { padding: 22px 8px; text-align: center; font-size: 14px; color: var(--em); }
    .split { display: grid; gap: 8px; font-size: 13.5px; }
    .split div { display: flex; justify-content: space-between; gap: 10px; color: var(--em); }
    .split b { color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .split + .note { margin-top: 12px; }
    .split .tot { padding-top: 8px; border-top: 1px solid var(--cc-line); font-size: 14.5px; }
    .acc { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--cc-paper-2); margin-bottom: 10px; }
    .acc-ic { flex: none; width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; font-weight: 900; font-size: 12px; }
    .acc-ic.mtn { background: #ffcc00; color: #1a1a1a; } .acc-ic.om { background: #ff7900; color: #fff; } .acc-ic.none { background: var(--cc-line); color: var(--em); }
    .acc b { display: block; font-size: 14px; color: var(--cc-ink); }
    .acc span { font-size: 13px; color: var(--em); }
    .note { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--em); }
    .link { display: inline-flex; align-items: center; gap: 5px; min-height: 40px; color: var(--primary); font-weight: 700; text-decoration: none; font-size: 14px; }
    .sk { height: 96px; border-radius: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: e-sk 1.2s linear infinite; }
    @keyframes e-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes e-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .e-head h1, :host-context([data-theme="dark"]) .k:not(.main) strong, :host-context([data-theme="dark"]) .box h2,
    :host-context([data-theme="dark"]) .tx-t, :host-context([data-theme="dark"]) .tx-n b, :host-context([data-theme="dark"]) .split b,
    :host-context([data-theme="dark"]) .acc b { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .k.main { background: #12392f; }
    :host-context([data-theme="dark"]) .acc { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .badge-s.wait { color: #E3A857; }
    :host-context([data-theme="dark"]) .link { color: var(--cc-lime); }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .hero { grid-template-columns: 1fr 1fr; }
      .k.main { grid-column: 1 / -1; }
      .k { padding: 14px; } .k strong { font-size: 20px; } .k.main strong { font-size: 26px; }
      .box { padding: 18px 16px; }
    }
    @media (prefers-reduced-motion: reduce) { .k, .box, .sk { animation: none; } }
  `],
  template: `
    <div class="e">
      <section class="e-head">
        <h1>Mes gains</h1>
        <p>Ce que vous avez gagné, et l’argent qui vous attend en séquestre.</p>
      </section>

      @if (loading()) {
        <div class="hero"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      } @else {
        <section class="hero" aria-label="Résumé">
          <article class="k main">
            <small><svg lucideTrendingUp size="14"></svg> Gagné en {{ monthName }}</small>
            <strong>{{ xaf(monthNet()) }}</strong>
            <span>{{ monthCount() }} course{{ monthCount() > 1 ? 's' : '' }} validée{{ monthCount() > 1 ? 's' : '' }} · net après commission</span>
          </article>
          <article class="k">
            <small><svg lucideLockKeyhole size="14"></svg> En attente</small>
            <strong>{{ xaf(pendingNet()) }}</strong>
            <span>{{ pending().length ? 'Bloqué en séquestre : à vous après validation' : 'Aucune course en attente' }}</span>
          </article>
          <article class="k">
            <small><svg lucideWallet size="14"></svg> Depuis le début</small>
            <strong>{{ xaf(totalNet()) }}</strong>
            <span>{{ done().length }} course{{ done().length > 1 ? 's' : '' }} terminée{{ done().length > 1 ? 's' : '' }}</span>
          </article>
        </section>

        <div class="grid">
          <div>
            @if (pending().length) {
              <section class="box" aria-labelledby="e-wait">
                <h2 id="e-wait">En attente de validation</h2>
                <p>Payées par le client : l’argent est réservé pour vous jusqu’à la validation des preuves.</p>
                @for (t of pending(); track t.id) {
                  <article class="tx">
                    <span class="tx-t">{{ t.description }}</span>
                    <div class="tx-n"><b>{{ xaf(t.net) }}</b><span class="badge-s wait">{{ t.status === 'PROOFS_SUBMITTED' ? 'Preuves envoyées' : 'En cours' }}</span></div>
                    <span class="tx-m">{{ zone(t.zone) }}</span>
                  </article>
                }
              </section>
            }

            <section class="box" aria-labelledby="e-hist">
              <h2 id="e-hist">Courses payées</h2>
              <p>Le détail de chaque gain : tarif, commission et net.</p>
              @for (t of done(); track t.id) {
                <article class="tx">
                  <span class="tx-t">{{ t.description }}</span>
                  <div class="tx-n">
                    <b>+ {{ xaf(t.net) }}</b>
                    <small>{{ xaf(t.brut) }} − {{ xaf(t.frais) }}</small>
                    <span class="badge-s">{{ paid() ? 'Versé' : 'Libéré' }}</span>
                  </div>
                  <span class="tx-m">{{ t.date | date:'d MMM yyyy' }} · {{ zone(t.zone) }}</span>
                </article>
              } @empty {
                <div class="empty">Pas encore de course validée. Vos gains apparaîtront ici dès la première.</div>
              }
            </section>
          </div>

          <aside>
            <section class="box" aria-labelledby="e-acc">
              <h2 id="e-acc">Compte de reversement</h2>
              <div class="acc">
                @if (payoutMethod()) {
                  <span class="acc-ic" [class.mtn]="payoutMethod() === 'MTN'" [class.om]="payoutMethod() === 'ORANGE'">{{ payoutMethod() === 'MTN' ? 'MTN' : 'OM' }}</span>
                  <div><b>{{ payoutMethod() === 'MTN' ? 'MTN Mobile Money' : 'Orange Money' }}</b><span>{{ payoutMasked() }}</span></div>
                } @else {
                  <span class="acc-ic none"><svg lucideSmartphone size="18"></svg></span>
                  <div><b>Aucun compte enregistré</b><span>Il est demandé avec la vérification d’identité.</span></div>
                }
              </div>
              @if (!paid()) {
                <p class="note">Les paiements sont en mode test : aucun virement réel n’est encore effectué vers ce compte.</p>
              } @else {
                <p class="note">Vos gains y sont versés après la validation de chaque course.</p>
              }
              @if (!payoutMethod()) { <a class="link" routerLink="/courier/kyc">Compléter ma vérification <svg lucideArrowRight size="14"></svg></a> }
            </section>

            <section class="box" aria-labelledby="e-calc">
              <h2 id="e-calc">Comment est calculé votre gain</h2>
              <div class="split">
                <div><span>Tarifs facturés</span><b>{{ xaf(totalBrut()) }}</b></div>
                <div><span>Commission@if (rate() !== null) { ({{ rate() }}&nbsp;%) }</span><b>− {{ xaf(totalFees()) }}</b></div>
                <div class="tot"><span>Votre gain net</span><b>{{ xaf(totalNet()) }}</b></div>
              </div>
              <p class="note">Les achats que vous avancez pour le client vous sont remboursés en plus et ne sont pas comptés ici. Un nouveau taux ne s’applique qu’aux nouvelles courses.</p>
            </section>
          </aside>
        </div>
      }
    </div>
  `,
})
export class EarningsComponent implements OnInit {
  readonly loading = signal(true);
  readonly rate = signal<number | null>(null);
  readonly paid = signal(false);
  readonly payoutMethod = signal<string | null>(null);
  readonly payoutMasked = signal('');
  private readonly rows = signal<Transaction[]>([]);
  readonly monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  readonly done = computed(() => this.rows().filter((t) => t.status === 'COMPLETED'));
  readonly pending = computed(() => this.rows().filter((t) => t.status !== 'COMPLETED'));
  private readonly thisMonth = computed(() => {
    const now = new Date();
    return this.done().filter((t) => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  });
  readonly monthNet = computed(() => this.thisMonth().reduce((s, t) => s + t.net, 0));
  readonly monthCount = computed(() => this.thisMonth().length);
  readonly pendingNet = computed(() => this.pending().reduce((s, t) => s + t.net, 0));
  readonly totalNet = computed(() => this.done().reduce((s, t) => s + t.net, 0));
  readonly totalBrut = computed(() => this.done().reduce((s, t) => s + t.brut, 0));
  readonly totalFees = computed(() => this.done().reduce((s, t) => s + t.frais, 0));

  private courseService = inject(CourseService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  ngOnInit(): void {
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (p) => { this.rate.set(p?.commissionRateCourier ?? null); this.paid.set(!!p?.paymentMode && p.paymentMode !== 'SIMULATION'); },
      error: warnLoadFailed('taux de commission actuel', 'taux masqué'),
    });
    this.http.get<any>('/api/users/me').subscribe({
      next: (u) => { this.payoutMethod.set(u?.payoutMethod ?? null); this.payoutMasked.set(u?.payoutNumberMasked ?? ''); },
      error: warnLoadFailed('compte de reversement', 'compte non affiché'),
    });
    this.courseService.getMyMissions().subscribe({
      next: (data) => {
        // Montants figés au paiement (TICK-070) ; gain = net versé hors remboursement des achats avancés
        this.rows.set(data
          .filter((c) => c.courierAmount != null && ['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED'].includes(c.status))
          .map((c) => ({
            id: c.id,
            status: c.status,
            date: c.completedAt || c.paidAt || c.createdAt,
            description: c.description,
            zone: c.zone,
            brut: Number(c.courseAmount ?? 0),
            frais: Number(c.courierCommissionAmount ?? 0),
            net: Number(c.courierAmount) - Number(c.realCosts ?? 0),
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger vos gains.'); },
    });
  }

  xaf(n: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n || 0)))} XAF`; }

  zone(z?: string): string { return String(z ?? '').replace(' - ', ' · '); }
}

interface Transaction {
  id: number;
  status: string;
  date: string;
  description: string;
  zone: string;
  brut: number;
  frais: number;
  net: number;
}
