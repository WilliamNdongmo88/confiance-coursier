import { ChatUnreadService } from '../../../core/services/chat-unread.service';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { courseStatus } from '../../../shared/status/course-status';
import { EmptyStateComponent } from '../../../shared/state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/state/error-state.component';
import { SkeletonComponent } from '../../../shared/state/skeleton.component';
import {
  LucidePlus,
  LucideArrowLeft,
  LucideArrowRight,
  LucidePackageOpen,
  LucidePackage,
  LucideShoppingBag,
  LucideTruck,
  LucideMapPin,
  LucideCalendar,
  LucideMessageCircle,
} from '@lucide/angular';
import { ComboFieldComponent } from '../../../shared/components/combo-field/combo-field.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    ComboFieldComponent,
    RouterLink,
    DatePipe,
    DecimalPipe,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    LucidePlus,
    LucideArrowLeft,
    LucideArrowRight,
    LucidePackageOpen,
    LucidePackage,
    LucideShoppingBag,
    LucideTruck,
    LucideMapPin,
    LucideCalendar,
    LucideMessageCircle,
  ],
  template: `

      <!-- ── En-tête de page ── -->
      <section class="page-head">
        <div>
          <h1>{{ isClient ? 'Historique des courses' : 'Historique des missions' }}</h1>
          <p>{{ isClient ? 'Retrouvez toutes vos commandes passées.' : 'Retrouvez toutes vos courses passées.' }}</p>
        </div>
        @if (isClient && !loading && courses.length > 0) {
          <a routerLink="/client/create-course" class="primary-action">
            <svg lucidePlus size="14"></svg> Nouvelle course
          </a>
        } @else if (!isClient) {
          <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
            <svg lucideArrowLeft size="15"></svg> Retour
          </a>
        }
      </section>

      <!-- ── Filtres ── -->
      @if (loading || courses.length > 0) {
      <div class="history-filters">
        <div class="filter-group">
          <label for="statusFilter">Statut</label>
          <app-combo-field inputId="statusFilter" [items]="statusItems" [value]="statusFilter()"
                           (valueChange)="statusFilter.set($event)" ariaLabel="Statut" />
        </div>
        <div class="filter-group">
          <label for="dateSort">Tri par date</label>
          <app-combo-field inputId="dateSort" [items]="sortItems" [value]="dateSort()"
                           (valueChange)="dateSort.set($any($event))" ariaLabel="Tri par date" />
        </div>
      </div>
      }

      <!-- TICK-077 : états chargement / erreur / vide partagés -->
      @if (loading) {
        <section class="panel"><app-skeleton [lines]="4" /></section>
      } @else if (loadError) {
        <section class="panel">
          <app-error-state message="Impossible de charger l'historique." (retry)="loadData()" />
        </section>
      } @else if (filteredCourses().length === 0) {
        <section class="panel">
          <app-empty-state [title]="isClient ? 'Aucune course pour le moment.' : 'Aucune mission pour le moment.'"
                           [actionLabel]="isClient ? 'Créer ma première course' : 'Voir les demandes disponibles'"
                           [actionLink]="isClient ? '/client/create-course' : '/courier/dashboard'" />
        </section>
      }

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!--  VUE CLIENT — row-items (style maquette client/history.html)       -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      @if (!loading && isClient && filteredCourses().length > 0) {
        <section class="panel" aria-label="Historique des courses">
          <div class="panel-head">
            <div>
              <h2>{{ statusFilter() === 'COMPLETED' ? 'Courses terminées' : 'Toutes vos courses' }}</h2>
              <p>{{ filteredCourses().length }} course{{ filteredCourses().length > 1 ? 's' : '' }} au total</p>
            </div>
          </div>

          @for (course of filteredCourses(); track course.id) {
            <article class="row-item">
              <span class="row-icon">
                <svg lucidePackageOpen size="16"></svg>
              </span>
              <div class="row-body">
                <div class="row-title">{{ course.description }}</div>
                <div class="row-meta">
                  <span>{{ zone(course.zone) }}</span>
                  <span class="row-meta-dot"></span>
                  <span>{{ course.scheduledAt | date:'dd MMM yyyy' }}</span>
                  <span class="row-meta-dot"></span>
                  @if (course.totalAmount) {
                    <span>{{ course.totalAmount | number:'1.0-0' }} XAF</span>
                  } @else if (course.courseAmount) {
                    <span>{{ course.courseAmount | number:'1.0-0' }} XAF</span>
                  } @else {
                    <span>Tarif non défini</span>
                  }
                </div>
              </div>
              <div class="row-right">
                <app-status-badge [status]="course.status" role="CLIENT" />
                <div class="row-actions">
                  @if (nextAction(course, 'CLIENT'); as action) {
                    <a [routerLink]="action.link" class="row-action-link">{{ action.label }}</a>
                  }
                  <a [routerLink]="['/client/course-detail', course.id]" class="row-action-link">
                    Voir détail <svg lucideArrowRight size="12"></svg>
                  </a>
                </div>
              </div>
            </article>
          }
        </section>
      }

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!--  VUE COURSIER — table desktop + cartes mobile (maquette courier)    -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      @if (!loading && isCourier && filteredCourses().length > 0) {
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Toutes mes courses</h2>
              <p>{{ filteredCourses().length }} au total depuis votre inscription</p>
            </div>
          </div>

          <!-- Une carte par course, lisible à toutes les largeurs (plus de tableau à colonnes serrées) -->
          <div class="mc-list">
            @for (course of filteredCourses(); track course.id; let i = $index) {
              <article class="mc" [class.declined]="course.notRetained" [style.animation-delay.ms]="i < 12 ? i * 30 : 0">
                <span class="mc-ic" aria-hidden="true">
                  @switch (kind(course.description)) {
                    @case ('ACHAT') { <svg lucideShoppingBag size="17"></svg> }
                    @case ('LIVRAISON') { <svg lucideTruck size="17"></svg> }
                    @default { <svg lucidePackage size="17"></svg> }
                  }
                </span>
                <div class="mc-body">
                  <div class="mc-head">
                    <h3 class="mc-title">{{ title(course.description) }}</h3>
                    <app-status-badge [status]="course.status" role="COURIER" [notRetained]="course.notRetained" />
                  </div>
                  <div class="mc-meta">
                    <span><svg lucideMapPin size="13"></svg> {{ zone(course.zone) }}</span>
                    @if (course.scheduledAt) { <span><svg lucideCalendar size="13"></svg> {{ course.scheduledAt | date:'d MMM yyyy' }}</span> }
                  </div>
                  <div class="mc-foot">
                    @if (course.notRetained) {
                      <span class="mc-note">Le client a choisi un autre coursier.</span>
                    } @else if (course.status === 'COMPLETED') {
                      <span class="mc-amount"><small>Net perçu</small><b>{{ netPercu(course) }}</b></span>
                    } @else if (course.courseAmount) {
                      <span class="mc-amount"><small>Tarif convenu</small><b class="plain">{{ xaf(course.courseAmount) }}</b></span>
                    }
                    <span class="mc-acts">
                      @if (nextAction(course, 'COURIER'); as action) {
                        @if (action.link[0] !== '/chat') { <a [routerLink]="action.link" class="mc-btn main">{{ action.label }}</a> }
                      }
                      @if (course.chatRoomId) {
                        <a [routerLink]="['/chat', course.chatRoomId]" class="mc-btn has-dot"
                           [attr.aria-label]="unread.count(course.chatRoomId) ? 'Chat : ' + unread.count(course.chatRoomId) + ' message(s) non lu(s)' : 'Ouvrir le chat'">
                          <svg lucideMessageCircle size="14"></svg> Chat
                          @if (unread.count(course.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }
                        </a>
                      }
                    </span>
                  </div>
                </div>
              </article>
            }
          </div>
        </section>
      }

  `,
  styles: `
    /* ── Filtres ── */
    .history-filters {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-group label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .filter-group app-combo-field { min-width: 220px; }

    /* ── Missions du coursier : cartes ── */
    .mc-list { display: grid; padding: 0 20px 6px; }
    .mc { display: flex; gap: 12px; padding: 16px 0; border-top: 1px solid var(--cc-line); animation: mc-in .35s cubic-bezier(.16,1,.3,1) both; }
    .mc:first-child { border-top: 0; padding-top: 14px; }
    .mc.declined { opacity: .75; }
    .mc-ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); }
    .mc-body { flex: 1; min-width: 0; }
    .mc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px 12px; flex-wrap: wrap; }
    .mc-title { flex: 1 1 260px; min-width: 0; margin: 0; font-size: 15px; font-weight: 700; line-height: 1.4; color: var(--cc-ink);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .mc-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; font-size: 13px; color: var(--cc-muted); }
    .mc-meta span { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
    .mc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .mc-amount { display: grid; gap: 1px; }
    .mc-amount small { font-size: 12px; color: var(--cc-muted); }
    .mc-amount b { font-size: 16px; font-weight: 800; color: var(--cc-success); font-variant-numeric: tabular-nums; }
    .mc-amount b.plain { color: var(--cc-ink); }
    .mc-note { font-size: 13px; color: var(--cc-muted); }
    .mc-acts { display: flex; gap: 8px; margin-left: auto; }
    .mc-btn { min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink);
      font-size: 13.5px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .mc-btn.main { border-color: transparent; background: var(--primary); color: #fff; }
    @keyframes mc-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    :host-context([data-theme="dark"]) .mc-title, :host-context([data-theme="dark"]) .mc-amount b.plain { color: #F3F7F5; }
    :host-context([data-theme="dark"]) .mc-ic { background: rgba(255,255,255,.05); color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .mc-amount b { color: #9FDDB4; }
    :host-context([data-theme="dark"]) .mc-meta, :host-context([data-theme="dark"]) .mc-note, :host-context([data-theme="dark"]) .mc-amount small { color: #B0C0B7; }
    :host-context([data-theme="dark"]) .mc-btn { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .mc-btn.main { background: var(--cc-lime); color: #123b32; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .history-filters { flex-direction: column; }
      .filter-group app-combo-field { min-width: 0; }
      .mc-list { padding: 0 14px 4px; }
      .mc-title { flex-basis: 100%; }
      .mc-acts { width: 100%; margin-left: 0; }
      .mc-btn { flex: 1; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) { .mc { animation: none; } }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-jc-center-p-32px-0-c-muted { justify-content: center; padding: 32px 0; color: var(--cc-muted); }
    .st-jc-center-fd-column-g-8px { justify-content: center; flex-direction: column; gap: 8px; padding: 32px 0; color: var(--cc-muted); text-align: center; }
    .st-opac-35-m-0-auto { opacity: .35; margin: 0 auto; }
    .st-m-0-fs-14px { margin: 0; font-size: 14px; }
  `,
})
export class HistoryComponent implements OnInit {
  readonly unread = inject(ChatUnreadService);

  courses: any[] = [];
  loading = true;

  /** Filtre statut — "ALL" par défaut */
  statusFilter = signal<string>('ALL');
  /** Tri date — "newest" par défaut */
  dateSort = signal<'newest' | 'oldest'>('newest');

  /** Liste filtrée + triée */
  filteredCourses = computed(() => {
    let result = [...this.courses];
    const f = this.statusFilter();
    if (f === 'DECLINED') result = result.filter((c) => c.notRetained);
    else if (f !== 'ALL') result = result.filter((c) => c.status === f && !c.notRetained);
    result.sort((a, b) => {
      const dateA = new Date(a.scheduledAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.scheduledAt || b.createdAt || 0).getTime();
      return this.dateSort() === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  });

  private courseService = inject(CourseService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  // ─── Role detection ──────────────────────────────────────────────────────

  get isClient(): boolean {
    return localStorage.getItem('user_role') === 'CLIENT';
  }

  get isCourier(): boolean {
    return localStorage.getItem('user_role') === 'COURIER';
  }

  // ─── Helpers exposés au template ──────────────────────────────────────────

  /** Statuts proposés dans le filtre (libellés issus de courseStatus — TICK-077). */
  readonly filterStatuses = ['ALL', 'COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED', 'ASSIGNED',
    'PUBLISHED', 'DISPUTED', 'REFUNDED', 'CANCELLED'];

  /** Choix des filtres (valeur / libellé) pour le champ de choix commun. */
  private _statusItems?: { value: string; label: string }[];
  get statusItems(): { value: string; label: string }[] {
    if (!this._statusItems) {
      const items = this.filterStatuses.map((st) => ({ value: st, label: this.statusLabel(st) }));
      this._statusItems = this.isCourier ? [...items, { value: 'DECLINED', label: 'Offres déclinées' }] : items;
    }
    return this._statusItems;
  }
  readonly sortItems = [
    { value: 'newest', label: 'Plus récentes d’abord' },
    { value: 'oldest', label: 'Plus anciennes d’abord' },
  ];

  statusLabel(status: string): string {
    return status === 'ALL'
      ? 'Tous les statuts'
      : courseStatus({ id: 0, status }, this.isCourier ? 'COURIER' : 'CLIENT').label;
  }

  nextAction(course: any, role: 'CLIENT' | 'COURIER') { return courseStatus(course, role).action; }

  /** Type de course lu en tête de la description (« Achat — … »). */
  kind(desc?: string): string {
    const m = /^(Achat|Livraison|Retrait) —/.exec(desc ?? '');
    return m ? m[1].toUpperCase() : 'AUTRE';
  }
  /** Description sans le préfixe de type (déjà montré par l'icône). */
  title(desc?: string): string { return (desc ?? '').replace(/^(Achat|Livraison|Retrait) —\s*/, '').trim() || 'Course'; }
  zone(z?: string): string { return String(z ?? '').replace(' - ', ' · '); }
  xaf(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0))} XAF`; }

  /** Net perçu par le coursier (tarif − commission, hors remboursement d'achats), fourni par le serveur — TICK-070. */
  netPercu(course: any): string {
    if (course.courierAmount == null) return '—';
    const net = Number(course.courierAmount) - Number(course.realCosts ?? 0);
    return `${Math.round(net).toLocaleString('fr-FR')} XAF`;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.unread.refresh(true);
    this.loadData();
  }

  /** Échec du chargement principal : état d'erreur avec « Réessayer » (TICK-077). */
  loadError = false;

  loadData(): void {
    this.loading = true;
    this.loadError = false;
    const obs = this.isClient
      ? this.courseService.getMyCourses()
      : this.courseService.getMyMissions();

    obs.subscribe({
      next: (data) => {
        this.courses = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = true;
        console.error(err);
      },
    });
  }
}
