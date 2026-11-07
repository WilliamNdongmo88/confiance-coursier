import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService, ReportResponse, UserProfileResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideAlertOctagon, LucideCheck, LucideCircleCheck, LucideFlag, LucideInfo, LucideTriangleAlert } from '@lucide/angular';

type Tab = 'OPEN' | 'PROCESSED' | 'ALL';
type Decision = 'REJET' | 'AVERTISSEMENT' | 'SUSPENSION';

/** Libellés des motifs : mêmes valeurs que le formulaire de signalement (report-user). */
const MOTIFS: Record<string, string> = {
  harcelement: 'Harcèlement ou menaces',
  injures: 'Propos injurieux',
  fraude: 'Tentative de fraude',
  faux: 'Faux profil',
  autre: 'Autre comportement',
};

const DECISIONS: Record<Decision, { label: string; done: string; effect: string }> = {
  REJET: { label: 'Classer sans suite', done: 'Classé sans suite', effect: 'Aucune sanction. La personne signalée est prévenue par e-mail que le signalement est classé.' },
  AVERTISSEMENT: { label: 'Avertir', done: 'Averti', effect: 'Le compte reste actif. La personne reçoit un avertissement par e-mail.' },
  SUSPENSION: { label: 'Suspendre le compte', done: 'Compte suspendu', effect: 'La personne est déconnectée et ne peut plus utiliser la plateforme. Elle est prévenue par e-mail.' },
};

/**
 * Signalements (admin, Impeccable, mode Operate).
 * Montre qui est signalé et par qui (noms, rôles, état du compte, signalements reçus sur 30 jours) plutôt que des
 * identifiants ; chaque décision affiche ses conséquences et se confirme avant l'envoi.
 */
@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [DatePipe, LucideAlertOctagon, LucideCheck, LucideCircleCheck, LucideFlag, LucideInfo, LucideTriangleAlert],
  styles: [`
    :host { display: block; min-width: 0; --rm: #56635c; }
    :host-context([data-theme="dark"]) { --rm: #B0C0B7; }
    .r { max-width: 980px; margin: 0 auto; }
    .r-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .r-head p { margin: 0 0 14px; font-size: 15px; color: var(--rm); }
    .rule { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .rule svg { flex: none; margin-top: 1px; color: var(--primary); }
    .tabs { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); }
    .tabs button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 9px; background: none; color: var(--rm); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .tabs button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .tabs b { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; background: var(--cc-line); color: var(--cc-ink); }
    .tabs button.on b.hot { background: #d93a32; color: #fff; }
    .rc { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 18px; margin-bottom: 14px; animation: r-in .4s cubic-bezier(.16,1,.3,1) both; }
    .rc-h { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .rc-ic { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-danger-bg); color: var(--cc-danger); }
    .rc.done .rc-ic { background: var(--cc-paper-2); color: var(--rm); }
    .rc-t { flex: 1; min-width: 0; }
    .rc-t b { display: block; font-size: 16px; font-weight: 750; color: var(--cc-ink); }
    .rc-t span { display: block; margin-top: 2px; font-size: 13px; color: var(--rm); }
    .chip { flex: none; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 750; white-space: nowrap; background: var(--cc-paper-2); color: var(--rm); }
    .chip.old { background: var(--cc-warning-bg); color: #8a5a14; }
    .chip.SUSPENSION { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .chip.AVERTISSEMENT { background: var(--cc-warning-bg); color: #8a5a14; }
    .chip.REJET { background: var(--cc-success-bg); color: var(--cc-success); }
    .who { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; margin-bottom: 12px; }
    .p { padding: 12px; border-radius: 12px; border: 1px solid var(--cc-line); min-width: 0; }
    .p small { display: block; font-size: 12px; font-weight: 700; color: var(--rm); margin-bottom: 4px; }
    .p b { display: block; font-size: 14.5px; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .p span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--rm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .p .flag { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 700; background: var(--cc-warning-bg); color: #8a5a14; white-space: normal; }
    .p .flag.red { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .quote { margin: 0 0 14px; padding: 12px 14px; border-radius: 12px; background: var(--cc-paper-2); font-size: 14px; line-height: 1.55; color: var(--cc-ink); white-space: pre-line; overflow-wrap: anywhere; }
    .quote.none { color: var(--rm); font-style: italic; }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; }
    .acts button, .cf-acts button { min-height: 44px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
    .b-plain { border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); }
    .b-warn { border: 1px solid color-mix(in oklab, var(--cc-warning) 50%, transparent); background: var(--cc-warning-bg); color: #8a5a14; }
    .b-danger { border: 0; background: var(--cc-danger); color: #fff; }
    .b-ok { border: 0; background: var(--primary); color: #fff; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .cf { padding: 14px; border-radius: 12px; border: 1.5px solid var(--cc-line); animation: r-in .3s cubic-bezier(.16,1,.3,1); }
    .cf.SUSPENSION { border-color: color-mix(in oklab, var(--cc-danger) 50%, transparent); }
    .cf b { display: block; font-size: 14.5px; color: var(--cc-ink); }
    .cf p { margin: 4px 0 12px; font-size: 13.5px; line-height: 1.45; color: var(--rm); }
    .cf-acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
    .empty { padding: 34px 16px; text-align: center; border: 1px dashed var(--cc-line); border-radius: 16px; color: var(--rm); }
    .empty svg { color: var(--cc-success); }
    .empty b { display: block; margin: 8px 0 4px; font-size: 16px; color: var(--cc-ink); }
    .sk { height: 180px; border-radius: 16px; margin-bottom: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: r-sk 1.2s linear infinite; }
    @keyframes r-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes r-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .r-head h1, :host-context([data-theme="dark"]) .rc-t b, :host-context([data-theme="dark"]) .p b,
    :host-context([data-theme="dark"]) .quote:not(.none), :host-context([data-theme="dark"]) .cf b, :host-context([data-theme="dark"]) .rule,
    :host-context([data-theme="dark"]) .empty b { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .rule, :host-context([data-theme="dark"]) .tabs, :host-context([data-theme="dark"]) .quote,
    :host-context([data-theme="dark"]) .chip, :host-context([data-theme="dark"]) .rc.done .rc-ic { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .rule svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .tabs button.on { background: #2B4A3E; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .rc-ic, :host-context([data-theme="dark"]) .chip.SUSPENSION, :host-context([data-theme="dark"]) .p .flag.red { color: #F0A39C; }
    :host-context([data-theme="dark"]) .chip.old, :host-context([data-theme="dark"]) .chip.AVERTISSEMENT, :host-context([data-theme="dark"]) .p .flag,
    :host-context([data-theme="dark"]) .b-warn { color: #E3A857; background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .b-ok { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .b-danger { background: #c2413a; }
    @media (max-width: 640px) {
      .rc { padding: 16px 14px; }
      .who { grid-template-columns: 1fr; }
      .acts button { flex: 1 1 100%; justify-content: center; }
      .tabs { display: flex; width: 100%; } .tabs button { flex: 1 1 auto; justify-content: center; padding: 0 6px; font-size: 13.5px; white-space: nowrap; }
    }
    @media (prefers-reduced-motion: reduce) { .rc, .cf, .sk { animation: none; } }
  `],
  template: `
    <div class="r">
      <section class="r-head">
        <h1>Signalements</h1>
        <p>@if (openCount()) { {{ openCount() }} signalement{{ openCount() > 1 ? 's' : '' }} à examiner. } @else { Aucun signalement en attente. }</p>
      </section>

      <div class="rule" role="note"><svg lucideInfo size="16"></svg>
        <span>Un compte est suspendu automatiquement quand 3 personnes différentes, ayant chacune fait une course avec lui, le signalent en 30 jours. Vos décisions s’ajoutent à cette règle.</span></div>

      <div class="tabs" role="tablist" aria-label="Filtrer les signalements">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" [class.on]="tab() === t.key" (click)="tab.set(t.key)">
            {{ t.label }} <b [class.hot]="t.key === 'OPEN' && openCount() > 0">{{ count(t.key) }}</b>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="sk"></div>
      } @else if (list().length === 0) {
        <div class="empty" role="status"><svg lucideCircleCheck size="30"></svg>
          <b>{{ tab() === 'OPEN' ? 'Tout est à jour' : 'Aucun signalement' }}</b>
          <span>{{ tab() === 'OPEN' ? 'Les nouveaux signalements apparaîtront ici.' : 'Rien dans cette catégorie.' }}</span></div>
      } @else {
        @for (r of list(); track r.id; let i = $index) {
          <article class="rc" [class.done]="r.status !== 'OPEN'" [style.animation-delay.ms]="i * 40">
            <div class="rc-h">
              <span class="rc-ic" aria-hidden="true"><svg lucideFlag size="18"></svg></span>
              <div class="rc-t"><b>{{ motif(r.motif) }}</b><span>Signalement n° {{ r.id }} · {{ r.createdAt | date:'d MMM yyyy à HH:mm' }}</span></div>
              @if (r.status === 'OPEN') { <span class="chip" [class.old]="ageH(r) >= 24">{{ since(r) }}</span> }
              @else if (r.decision) { <span class="chip" [class]="'chip ' + r.decision">{{ decisionDone(r.decision) }}</span> }
            </div>

            <div class="who">
              <div class="p">
                <small>Personne signalée</small>
                <b>{{ name(r.targetId) }}</b>
                <span>{{ roleOf(r.targetId) }}</span>
                @if (user(r.targetId)?.status === 'SUSPENDED') { <span class="flag red"><svg lucideAlertOctagon size="12"></svg> Compte déjà suspendu</span> }
                @else if (recentAgainst(r.targetId) > 1) { <span class="flag"><svg lucideTriangleAlert size="12"></svg> {{ recentAgainst(r.targetId) }} signalements reçus en 30 jours</span> }
              </div>
              <div class="p">
                <small>Signalé par</small>
                <b>{{ name(r.reporterId) }}</b>
                <span>{{ roleOf(r.reporterId) }}</span>
              </div>
            </div>

            @if (r.description) { <p class="quote">« {{ r.description }} »</p> }
            @else { <p class="quote none">Aucune précision donnée par la personne qui signale.</p> }

            @if (r.status === 'OPEN') {
              @if (confirming()?.id === r.id) {
                <div class="cf" [class]="'cf ' + confirming()!.decision" role="group" aria-label="Confirmer la décision">
                  <b>{{ decisionLabel(confirming()!.decision) }} : {{ name(r.targetId) }} ?</b>
                  <p>{{ effect(confirming()!.decision) }}</p>
                  <div class="cf-acts">
                    <button type="button" class="b-plain" (click)="confirming.set(null)">Annuler</button>
                    <button type="button" [class]="btnClass(confirming()!.decision)" [disabled]="acting()" (click)="process(r, confirming()!.decision)">Confirmer</button>
                  </div>
                </div>
              } @else {
                <div class="acts">
                  <button type="button" class="b-plain" (click)="confirming.set({ id: r.id, decision: 'REJET' })"><svg lucideCheck size="15"></svg> Classer sans suite</button>
                  <button type="button" class="b-warn" (click)="confirming.set({ id: r.id, decision: 'AVERTISSEMENT' })"><svg lucideTriangleAlert size="15"></svg> Avertir</button>
                  <button type="button" class="b-danger" [disabled]="user(r.targetId)?.status === 'SUSPENDED'" (click)="confirming.set({ id: r.id, decision: 'SUSPENSION' })"><svg lucideAlertOctagon size="15"></svg> Suspendre</button>
                </div>
              }
            }
          </article>
        }
      }
    </div>
  `,
})
export class AdminReportsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly tabs: { key: Tab; label: string }[] = [{ key: 'OPEN', label: 'À examiner' }, { key: 'PROCESSED', label: 'Traités' }, { key: 'ALL', label: 'Tous' }];
  readonly tab = signal<Tab>('OPEN');
  readonly allList = signal<ReportResponse[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly confirming = signal<{ id: number; decision: Decision } | null>(null);
  private readonly users = signal<Map<number, UserProfileResponse>>(new Map());

  readonly openCount = computed(() => this.count('OPEN'));
  readonly list = computed(() => {
    const t = this.tab();
    const l = this.allList().filter((r) => t === 'ALL' || r.status === t);
    // À examiner : le plus ancien d'abord ; sinon le plus récent d'abord
    return [...l].sort((a, b) => (t === 'OPEN' ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  ngOnInit(): void {
    forkJoin({
      reports: this.adminService.getReports().pipe(catchError(() => { this.toast.error('Erreur lors du chargement des signalements.'); return of([] as ReportResponse[]); })),
      // Les noms sont un confort : en cas d'échec, on retombe sur les numéros de compte
      users: this.adminService.getUsers().pipe(catchError(() => of([] as UserProfileResponse[]))),
    }).subscribe(({ reports, users }) => {
      this.allList.set(reports);
      this.users.set(new Map(users.map((u) => [u.id, u])));
      this.loading.set(false);
    });
  }

  count(t: Tab): number { return t === 'ALL' ? this.allList().length : this.allList().filter((r) => r.status === t).length; }

  user(id: number): UserProfileResponse | undefined { return this.users().get(id); }
  name(id: number): string { return this.user(id)?.fullName || this.user(id)?.email || `Compte n° ${id}`; }
  roleOf(id: number): string {
    const u = this.user(id);
    if (!u) return `Compte n° ${id}`;
    const role = u.role === 'COURIER' ? 'Coursier' : u.role === 'CLIENT' ? 'Client' : 'Administrateur';
    return u.email ? `${role} · ${u.email}` : role;
  }

  /** Signalements reçus par ce compte sur 30 jours glissants (hors classés sans suite), comme la règle serveur. */
  recentAgainst(id: number): number {
    const from = Date.now() - 30 * 86_400_000;
    return this.allList().filter((r) => r.targetId === id && r.decision !== 'REJET' && new Date(r.createdAt).getTime() >= from).length;
  }

  motif(m: string): string { return MOTIFS[m] ?? (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Signalement'); }
  ageH(r: ReportResponse): number { return Math.max(0, (Date.now() - new Date(r.createdAt).getTime()) / 3_600_000); }
  since(r: ReportResponse): string { const h = this.ageH(r); return h < 1 ? 'à l’instant' : h < 24 ? `depuis ${Math.floor(h)} h` : `depuis ${Math.floor(h / 24)} j`; }
  decisionLabel(d: Decision): string { return DECISIONS[d].label; }
  decisionDone(d: string): string { return DECISIONS[d as Decision]?.done ?? d; }
  effect(d: Decision): string { return DECISIONS[d].effect; }
  btnClass(d: Decision): string { return d === 'SUSPENSION' ? 'b-danger' : d === 'AVERTISSEMENT' ? 'b-warn' : 'b-ok'; }

  process(r: ReportResponse, decision: Decision): void {
    this.acting.set(true);
    this.adminService.processReport(r.id, decision).subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.confirming.set(null);
        this.allList.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        if (decision === 'SUSPENSION') {
          this.users.update((m) => { const u = m.get(r.targetId); if (u) { const n = new Map(m); n.set(u.id, { ...u, status: 'SUSPENDED' }); return n; } return m; });
        }
        this.toast.success(`${DECISIONS[decision].done}. Un e-mail a été envoyé à ${this.name(r.targetId)}.`);
      },
      error: (err) => { this.acting.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors du traitement.'); },
    });
  }
}
