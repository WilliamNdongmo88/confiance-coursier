import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AdminService, AdminKycResponse, DisputeResponse, GainsStatsResponse, ReportResponse, UserProfileResponse,
} from '../../../core/services/admin.service';
import { LucideArrowRight, LucideCircleCheck, LucideFlag, LucideFlaskConical, LucideScale, LucideShieldCheck, LucideTrendingUp, LucideUsers } from '@lucide/angular';

interface Task { id: number; title: string; meta: string; since: string; link: string; old: boolean; }

/**
 * Tableau de bord admin (Impeccable, mode Operate).
 * D'abord ce qui attend une décision, du plus ancien au plus récent ; ensuite l'activité réelle de la plateforme.
 * Uniquement des chiffres fournis par le serveur : un bloc dont la source échoue est masqué, jamais rempli de zéros.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, LucideArrowRight, LucideCircleCheck, LucideFlag, LucideFlaskConical, LucideScale, LucideShieldCheck, LucideTrendingUp, LucideUsers],
  styles: [`
    :host { display: block; --dm: #56635c; }
    :host-context([data-theme="dark"]) { --dm: #B0C0B7; }
    .d { max-width: 1100px; margin: 0 auto; }
    .d-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .d-head p { margin: 0 0 18px; font-size: 15px; color: var(--dm); }
    .test { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .test svg { flex: none; margin-top: 1px; color: var(--primary); }
    .todo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }
    .t { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 16px; background: var(--cc-white); border: 1px solid var(--cc-line); color: inherit; text-decoration: none;
      transition: transform .2s, box-shadow .2s, border-color .2s; animation: d-in .45s cubic-bezier(.16,1,.3,1) both; }
    .t:nth-child(2) { animation-delay: .05s; } .t:nth-child(3) { animation-delay: .1s; }
    .t:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(18,59,50,.08); border-color: var(--primary); }
    .t-ic { flex: none; width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--cc-success-bg); color: var(--cc-success); }
    .t.hot .t-ic { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .t b { display: block; font-size: 26px; line-height: 1; font-weight: 800; letter-spacing: -.03em; color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .t span { display: block; margin-top: 4px; font-size: 13.5px; color: var(--dm); }
    .t .go { margin-left: auto; flex: none; color: var(--dm); }
    h2 { margin: 0 0 10px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; align-items: start; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 16px 18px; animation: d-in .45s cubic-bezier(.16,1,.3,1) .12s both; }
    .box-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .box-h h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 750; color: var(--cc-ink); }
    .box-h a { display: inline-flex; align-items: center; min-height: 40px; padding: 0 4px; font-size: 13.5px; font-weight: 700; color: var(--primary); text-decoration: none; }
    .row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid var(--cc-line); color: inherit; text-decoration: none; }
    .row:first-of-type { border-top: 0; }
    .row:hover .row-t { color: var(--primary); }
    .row-x { flex: 1; min-width: 0; }
    .row-t { display: block; font-size: 14px; font-weight: 650; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-m { display: block; margin-top: 2px; font-size: 12.5px; color: var(--dm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .since { flex: none; padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 700; background: var(--cc-paper-2); color: var(--dm); white-space: nowrap; }
    .since.old { background: var(--cc-warning-bg); color: #8a5a14; }
    .ok { display: flex; align-items: center; gap: 8px; padding: 12px 0 4px; font-size: 13.5px; color: var(--dm); }
    .ok svg { color: var(--cc-success); }
    .more { display: block; padding-top: 8px; font-size: 12.5px; color: var(--dm); }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .s { padding: 16px; border-radius: 16px; background: var(--cc-white); border: 1px solid var(--cc-line); animation: d-in .45s cubic-bezier(.16,1,.3,1) .18s both; }
    .s small { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dm); }
    .s strong { display: block; margin-top: 6px; font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .s span { display: block; margin-top: 3px; font-size: 12.5px; color: var(--dm); }
    .sk { height: 78px; border-radius: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: d-sk 1.2s linear infinite; }
    @keyframes d-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes d-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .d-head h1, :host-context([data-theme="dark"]) .t b, :host-context([data-theme="dark"]) h2,
    :host-context([data-theme="dark"]) .box-h h3, :host-context([data-theme="dark"]) .row-t, :host-context([data-theme="dark"]) .s strong,
    :host-context([data-theme="dark"]) .test { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .test, :host-context([data-theme="dark"]) .since { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .test svg, :host-context([data-theme="dark"]) .box-h a { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .t:hover { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .t.hot .t-ic { color: #F0A39C; }
    :host-context([data-theme="dark"]) .since.old { background: rgba(227,168,87,.14); color: #E3A857; }
    @media (max-width: 960px) { .cols { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 640px) {
      .todo { grid-template-columns: 1fr; gap: 8px; }
      .t { padding: 12px 14px; } .t b { font-size: 22px; }
      .s { padding: 14px; } .s strong { font-size: 19px; }
    }
    @media (prefers-reduced-motion: reduce) { .t, .box, .s, .sk { animation: none; } .t:hover { transform: none; } }
  `],
  template: `
    <div class="d">
      <section class="d-head">
        <h1>Vue d’ensemble</h1>
        <p>{{ today }} · @if (loading()) { chargement… } @else if (totalTodo() === 0) { rien n’attend votre décision. } @else { {{ totalTodo() }} élément{{ totalTodo() > 1 ? 's attendent' : ' attend' }} votre décision. }</p>
      </section>

      @if (simulation()) {
        <div class="test" role="note"><svg lucideFlaskConical size="16"></svg>
          <span>Paiements en mode test : aucun argent réel ne circule. Les montants ci-dessous sont ceux des courses simulées.</span></div>
      }

      @if (loading()) {
        <div class="todo"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      } @else {
        <section class="todo" aria-label="À traiter">
          <a class="t" [class.hot]="kyc().length > 0" routerLink="/admin/kyc">
            <span class="t-ic"><svg lucideShieldCheck size="20"></svg></span>
            <div><b>{{ kyc().length }}</b><span>{{ kyc().length > 1 ? 'identités à vérifier' : 'identité à vérifier' }}</span></div>
            <svg class="go" lucideArrowRight size="16"></svg>
          </a>
          <a class="t" [class.hot]="disputes().length > 0" routerLink="/admin/disputes">
            <span class="t-ic"><svg lucideScale size="20"></svg></span>
            <div><b>{{ disputes().length }}</b><span>{{ disputes().length > 1 ? 'litiges à arbitrer' : 'litige à arbitrer' }}</span></div>
            <svg class="go" lucideArrowRight size="16"></svg>
          </a>
          <a class="t" [class.hot]="reports().length > 0" routerLink="/admin/reports">
            <span class="t-ic"><svg lucideFlag size="20"></svg></span>
            <div><b>{{ reports().length }}</b><span>{{ reports().length > 1 ? 'signalements à examiner' : 'signalement à examiner' }}</span></div>
            <svg class="go" lucideArrowRight size="16"></svg>
          </a>
        </section>

        @if (activeGroups().length) {
        <h2>À traiter en premier</h2>
        <div class="cols">
          @for (g of activeGroups(); track g.key) {
            <section class="box" [attr.aria-labelledby]="'d-' + g.key">
              <div class="box-h">
                <h3 [id]="'d-' + g.key">
                  @switch (g.key) { @case ('kyc') { <svg lucideShieldCheck size="16"></svg> } @case ('disp') { <svg lucideScale size="16"></svg> } @default { <svg lucideFlag size="16"></svg> } }
                  {{ g.title }}
                </h3>
                <a [routerLink]="g.link">Tout voir</a>
              </div>
              @for (t of g.items.slice(0, 4); track t.id) {
                <a class="row" [routerLink]="t.link">
                  <span class="row-x"><span class="row-t">{{ t.title }}</span><span class="row-m">{{ t.meta }}</span></span>
                  <span class="since" [class.old]="t.old" [attr.title]="t.old ? 'En attente depuis plus de 24 h' : null">{{ t.since }}</span>
                </a>
              } @empty {
                <div class="ok"><svg lucideCircleCheck size="16"></svg> {{ g.empty }}</div>
              }
              @if (g.items.length > 4) { <span class="more">et {{ g.items.length - 4 }} de plus</span> }
            </section>
          }
        </div>
        }

        @if (gains() || users()) {
          <h2>Activité de la plateforme</h2>
          <section class="stats" aria-label="Activité">
            @if (gains(); as gs) {
              <article class="s"><small><svg lucideTrendingUp size="14"></svg> Commission en {{ monthName }}</small>
                <strong>{{ xaf(gs.gainsThisMonth) }}</strong><span>{{ trend(gs) }}</span></article>
              <article class="s"><small>Courses terminées</small><strong>{{ nf(gs.totalCourses) }}</strong><span>depuis le lancement</span></article>
            }
            @if (users(); as us) {
              <article class="s"><small><svg lucideUsers size="14"></svg> Coursiers</small><strong>{{ nf(couriers()) }}</strong>
                <span>{{ nf(verifiedCouriers()) }} vérifié{{ verifiedCouriers() > 1 ? 's' : '' }}</span></article>
              <article class="s"><small><svg lucideUsers size="14"></svg> Clients</small><strong>{{ nf(clients()) }}</strong>
                <span>@if (suspended()) { {{ suspended() }} compte{{ suspended() > 1 ? 's' : '' }} suspendu{{ suspended() > 1 ? 's' : '' }} } @else { aucun compte suspendu }</span></article>
            }
          </section>
        }
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private http = inject(HttpClient);

  readonly loading = signal(true);
  readonly kyc = signal<AdminKycResponse[]>([]);
  readonly disputes = signal<DisputeResponse[]>([]);
  readonly reports = signal<ReportResponse[]>([]);
  readonly gains = signal<GainsStatsResponse | null>(null);
  readonly users = signal<UserProfileResponse[] | null>(null);
  readonly simulation = signal(false);

  readonly today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  readonly monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  readonly totalTodo = computed(() => this.kyc().length + this.disputes().length + this.reports().length);
  readonly couriers = computed(() => (this.users() ?? []).filter((u) => u.role === 'COURIER').length);
  readonly verifiedCouriers = computed(() => (this.users() ?? []).filter((u) => u.role === 'COURIER' && u.kycStatus === 'APPROVED').length);
  readonly clients = computed(() => (this.users() ?? []).filter((u) => u.role === 'CLIENT').length);
  readonly suspended = computed(() => (this.users() ?? []).filter((u) => u.role !== 'ADMIN' && u.status !== 'ACTIVE').length);

  /** Chaque file est triée du plus ancien au plus récent : ce qui attend depuis longtemps passe d'abord. */
  readonly groups = computed(() => [
    { key: 'kyc', title: 'Identités', link: '/admin/kyc', empty: 'Aucun dossier en attente',
      items: this.sorted(this.kyc().map((k) => this.task(k.id, k.userFullName || `${k.firstName ?? ''} ${k.lastName ?? ''}`.trim() || 'Coursier',
        k.documentType === 'PASSPORT' ? 'Passeport' : 'Carte d’identité', k.submittedAt, '/admin/kyc'))) },
    { key: 'disp', title: 'Litiges', link: '/admin/disputes', empty: 'Aucun litige ouvert',
      items: this.sorted(this.disputes().map((d) => this.task(d.id, this.motif(d.motifCode), `Course n° ${d.courseId}`, d.createdAt, '/admin/disputes'))) },
    { key: 'rep', title: 'Signalements', link: '/admin/reports', empty: 'Aucun signalement ouvert',
      items: this.sorted(this.reports().map((r) => this.task(r.id, r.motif, r.description || `Signalement n° ${r.id}`, r.createdAt, '/admin/reports'))) },
  ]);

  /** Seules les files non vides sont détaillées : les tuiles du haut disent déjà « 0 ». */
  readonly activeGroups = computed(() => this.groups().filter((g) => g.items.length > 0));

  ngOnInit(): void {
    const safe = <T>(o: Observable<T>) => o.pipe(catchError(() => of(null)));
    forkJoin({
      kyc: safe(this.adminService.getKycList('PENDING')),
      disputes: safe(this.adminService.getDisputes('OPEN')),
      reports: safe(this.adminService.getReports('OPEN')),
      gains: safe(this.adminService.getGains()),
      users: safe(this.adminService.getUsers()),
      pub: safe(this.http.get<{ paymentMode?: string }>('/api/commissions/public')),
    }).subscribe((r) => {
      this.kyc.set(r.kyc ?? []);
      this.disputes.set(r.disputes ?? []);
      this.reports.set(r.reports ?? []);
      this.gains.set(r.gains);
      this.users.set(r.users);
      this.simulation.set(r.pub?.paymentMode === 'SIMULATION');
      this.loading.set(false);
    });
  }

  private task(id: number, title: string, meta: string, at: string | null | undefined, link: string): Task & { at: number } {
    const t = at ? new Date(at).getTime() : Date.now();
    const h = Math.max(0, (Date.now() - t) / 3_600_000);
    const since = h < 1 ? 'à l’instant' : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} j`;
    return { id, title, meta, since, link, old: h >= 24, at: t };
  }

  private sorted<T extends { at: number }>(l: T[]): T[] { return [...l].sort((a, b) => a.at - b.at); }

  motif(code: string): string {
    return code === 'SYS-NL' ? 'Non-livraison (automatique)' : code;
  }

  trend(g: GainsStatsResponse): string {
    if (!g.gainsLastMonth) return `${this.xaf(g.gainsLastMonth || 0)} le mois dernier`;
    const p = Math.round(((g.gainsThisMonth - g.gainsLastMonth) / g.gainsLastMonth) * 100);
    return `${p >= 0 ? '+' : ''}${p} % par rapport au mois dernier`;
  }

  nf(n: number): string { return new Intl.NumberFormat('fr-FR').format(n || 0); }
  xaf(n: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))} XAF`; }
}
