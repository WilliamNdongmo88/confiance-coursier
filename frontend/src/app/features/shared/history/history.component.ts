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
} from '@lucide/angular';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
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
  ],
  template: `

      <!-- ── En-tête de page ── -->
      <section class="page-head">
        <div>
          <h1>{{ isClient ? 'Historique des courses' : 'Historique des missions' }}</h1>
          <p>{{ isClient ? 'Retrouvez toutes vos commandes passées.' : 'Retrouvez toutes vos courses passées.' }}</p>
        </div>
        @if (isClient) {
          <a routerLink="/client/create-course" class="primary-action">
            <svg lucidePlus size="14"></svg> Nouvelle course
          </a>
        } @else {
          <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
            <svg lucideArrowLeft size="15"></svg> Retour
          </a>
        }
      </section>

      <!-- ── Filtres ── -->
      <div class="history-filters">
        <div class="filter-group">
          <label for="statusFilter">Statut</label>
          <select id="statusFilter" class="form-select" [value]="statusFilter()"
                  (change)="statusFilter.set($any($event.target).value)">
            @for (st of filterStatuses; track st) {
              <option [value]="st">{{ statusLabel(st) }}</option>
            }
          </select>
        </div>
        <div class="filter-group">
          <label for="dateSort">Tri par date</label>
          <select id="dateSort" class="form-select" [value]="dateSort()"
                  (change)="dateSort.set($any($event.target).value)">
            <option value="newest">Plus récentes d'abord</option>
            <option value="oldest">Plus anciennes d'abord</option>
          </select>
        </div>
      </div>

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
                <div class="row-title">{{ course.description }} — {{ course.zone }}</div>
                <div class="row-meta">
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

          <!-- Tableau desktop -->
          <div class="table-responsive table-desktop">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Net perçu</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (course of filteredCourses(); track course.id) {
                  <tr>
                    <td>{{ course.scheduledAt | date:'dd/MM/yyyy' }}</td>
                    <td>{{ course.description }} — {{ course.zone }}</td>
                    <td class="fw-600" [class.text-success]="course.status === 'COMPLETED'" [class.text-muted]="course.status !== 'COMPLETED'">
                      {{ course.status === 'COMPLETED' ? netPercu(course) : '—' }}
                    </td>
                    <td>
                      <app-status-badge [status]="course.status" role="COURIER" />
                    </td>
                    <td>
                      @if (nextAction(course, 'COURIER'); as action) {
                        <a [routerLink]="action.link" class="text-link">{{ action.label }}</a>
                      }
                      @if (course.chatRoomId) {
                        <a [routerLink]="['/chat', course.chatRoomId]" class="text-link">
                          Chat
                        </a>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Cartes mobile -->
          <div class="hist-cards">
            @for (course of filteredCourses(); track course.id) {
              <div class="hist-card-item">
                <div class="hist-card-top">
                  <span class="hist-card-title">{{ course.description }} — {{ course.zone }}</span>
                  <app-status-badge [status]="course.status" role="COURIER" />
                </div>
                <div class="hist-card-meta">{{ course.scheduledAt | date:'dd/MM/yyyy' }}</div>
                <div class="hist-card-stats">
                  <div>
                    <span class="hist-card-label">Net</span>
                    <strong [class.text-success]="course.status === 'COMPLETED'" [class.text-muted]="course.status !== 'COMPLETED'">
                      {{ course.status === 'COMPLETED' ? netPercu(course) : '—' }}
                    </strong>
                  </div>
                  <div>
                    <span class="hist-card-label">Statut</span>
                    <strong>{{ statusLabel(course.status) }}</strong>
                  </div>
                </div>
              </div>
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
    .filter-group .form-select {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      font-size: 14px;
      min-width: 180px;
    }

    /* ── Table desktop (courier) ── */
    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .history-table { width: 100%; border-collapse: collapse; }
    .history-table th {
      font-size: .83rem;
      color: var(--text-muted);
      font-weight: 600;
      padding: 10px 8px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      text-align: left;
    }
    .history-table td {
      padding: 14px 8px;
      border-bottom: 1px solid var(--border);
      font-size: .92rem;
      color: var(--text);
    }
    .history-table tr:last-child td { border-bottom: none; }

    /* ── Cartes mobile (courier) ── */
    .hist-cards { display: none; }
    .hist-card-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 13px;
      margin-bottom: 10px;
    }
    .hist-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .hist-card-title {
      font-size: .88rem;
      font-weight: 700;
      color: var(--text);
      flex: 1;
      padding-right: 8px;
    }
    .hist-card-meta {
      font-size: .8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .hist-card-stats {
      display: flex;
      gap: 16px;
      font-size: .85rem;
    }
    .hist-card-label {
      display: block;
      color: var(--text-muted);
      font-size: .78rem;
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .history-filters { flex-direction: column; }
      .table-desktop { display: none !important; }
      .hist-cards { display: block; }
    }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-jc-center-p-32px-0-c-muted { justify-content: center; padding: 32px 0; color: var(--cc-muted); }
    .st-jc-center-fd-column-g-8px { justify-content: center; flex-direction: column; gap: 8px; padding: 32px 0; color: var(--cc-muted); text-align: center; }
    .st-opac-35-m-0-auto { opacity: .35; margin: 0 auto; }
    .st-m-0-fs-14px { margin: 0; font-size: 14px; }
  `,
})
export class HistoryComponent implements OnInit {

  courses: any[] = [];
  loading = true;

  /** Filtre statut — "ALL" par défaut */
  statusFilter = signal<string>('ALL');
  /** Tri date — "newest" par défaut */
  dateSort = signal<'newest' | 'oldest'>('newest');

  /** Liste filtrée + triée */
  filteredCourses = computed(() => {
    let result = [...this.courses];
    if (this.statusFilter() !== 'ALL') {
      result = result.filter((c) => c.status === this.statusFilter());
    }
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

  statusLabel(status: string): string {
    return status === 'ALL'
      ? 'Tous les statuts'
      : courseStatus({ id: 0, status }, this.isCourier ? 'COURIER' : 'CLIENT').label;
  }

  nextAction(course: any, role: 'CLIENT' | 'COURIER') { return courseStatus(course, role).action; }

  /** Net perçu par le coursier (tarif − commission, hors remboursement d'achats), fourni par le serveur — TICK-070. */
  netPercu(course: any): string {
    if (course.courierAmount == null) return '—';
    const net = Number(course.courierAmount) - Number(course.realCosts ?? 0);
    return `${Math.round(net).toLocaleString('fr-FR')} XAF`;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
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
