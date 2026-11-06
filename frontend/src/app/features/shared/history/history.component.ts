import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucidePlus,
  LucideArrowLeft,
  LucideArrowRight,
  LucidePackageOpen,
} from '@lucide/angular';

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'PUBLISHED':          return 'status-badge status-badge--info';
    case 'ASSIGNED':           return 'status-badge status-badge--warning';
    case 'IN_PROGRESS':        return 'status-badge status-badge--success';
    case 'PROOFS_SUBMITTED':   return 'status-badge status-badge--purple';
    case 'OVERDUE':            return 'status-badge status-badge--danger';
    case 'REFUNDED':           return 'status-badge status-badge--info';
    case 'COMPLETED':          return 'status-badge status-badge--success';
    case 'CANCELLED':          return 'status-badge status-badge--danger';
    case 'DISPUTED':           return 'status-badge status-badge--danger';
    default:                   return 'status-badge';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PUBLISHED':          return 'Publiée';
    case 'ASSIGNED':           return 'Attribuée';
    case 'IN_PROGRESS':        return 'En cours';
    case 'PROOFS_SUBMITTED':   return 'Preuves soumises';
    case 'OVERDUE':            return 'En retard';
    case 'REFUNDED':           return 'Remboursée';
    case 'COMPLETED':          return 'Terminée';
    case 'CANCELLED':          return 'Annulée';
    case 'DISPUTED':           return 'Litige';
    default:                   return status;
  }
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    AppShellComponent,
    LucidePlus,
    LucideArrowLeft,
    LucideArrowRight,
    LucidePackageOpen,
  ],
  template: `
    <app-shell [pageTitle]="isClient ? 'Historique' : 'Historique'">

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
            <option value="ALL">Tous les statuts</option>
            <option value="COMPLETED">Terminées</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="PROOFS_SUBMITTED">Preuves soumises</option>
            <option value="ASSIGNED">Attribuées</option>
            <option value="PUBLISHED">Publiées</option>
            <option value="CANCELLED">Annulées</option>
            <option value="DISPUTED">Litiges</option>
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

      <!-- ── État chargement ── -->
      @if (loading) {
        <section class="panel">
          <div class="row-item" style="justify-content:center;padding:32px 0;color:#94a199;">
            Chargement…
          </div>
        </section>
      }

      <!-- ── État vide ── -->
      @if (!loading && filteredCourses().length === 0) {
        <section class="panel">
          <div class="row-item" style="justify-content:center;flex-direction:column;gap:8px;padding:32px 0;color:#94a199;text-align:center;">
            <svg lucidePackageOpen size="32" style="opacity:.35;margin:0 auto"></svg>
            <p style="margin:0;font-size:14px;">
              {{ isClient ? 'Aucune course pour le moment.' : 'Aucune mission pour le moment.' }}
            </p>
            @if (isClient) {
              <a routerLink="/client/create-course" class="text-link">Créer votre première course →</a>
            } @else {
              <a routerLink="/courier/dashboard" class="text-link">Voir les demandes disponibles →</a>
            }
          </div>
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
                <span [class]="getBadgeClass(course.status)">
                  {{ getStatusLabel(course.status) }}
                </span>
                <div class="row-actions">
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
                    <td style="font-weight:600;color:{{ course.status === 'COMPLETED' ? 'var(--success,#17634f)' : 'var(--text-muted)' }}">
                      {{ course.status === 'COMPLETED' ? netPercu(course) : '—' }}
                    </td>
                    <td>
                      <span [class]="getBadgeClass(course.status)">{{ getStatusLabel(course.status) }}</span>
                    </td>
                    <td>
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
                  <span [class]="getBadgeClass(course.status)">{{ getStatusLabel(course.status) }}</span>
                </div>
                <div class="hist-card-meta">{{ course.scheduledAt | date:'dd/MM/yyyy' }}</div>
                <div class="hist-card-stats">
                  <div>
                    <span class="hist-card-label">Net</span>
                    <strong [style.color]="course.status === 'COMPLETED' ? 'var(--success,#17634f)' : 'var(--text-muted)'">
                      {{ course.status === 'COMPLETED' ? netPercu(course) : '—' }}
                    </strong>
                  </div>
                  <div>
                    <span class="hist-card-label">Statut</span>
                    <strong>{{ getStatusLabel(course.status) }}</strong>
                  </div>
                </div>
              </div>
            }
          </div>
        </section>
      }

    </app-shell>
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
      color: var(--text-muted, #7f8a82);
    }
    .filter-group .form-select {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, #e2e8e2);
      background: var(--bg-card, #fff);
      color: var(--text, #18271f);
      font-size: 14px;
      min-width: 180px;
    }

    /* ── Table desktop (courier) ── */
    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .history-table { width: 100%; border-collapse: collapse; }
    .history-table th {
      font-size: .83rem;
      color: var(--text-muted, #7f8a82);
      font-weight: 600;
      padding: 10px 8px;
      border-bottom: 1px solid var(--border, #e2e8e2);
      white-space: nowrap;
      text-align: left;
    }
    .history-table td {
      padding: 14px 8px;
      border-bottom: 1px solid var(--border, #e2e8e2);
      font-size: .92rem;
      color: var(--text, #18271f);
    }
    .history-table tr:last-child td { border-bottom: none; }

    /* ── Cartes mobile (courier) ── */
    .hist-cards { display: none; }
    .hist-card-item {
      border: 1px solid var(--border, #e2e8e2);
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
      color: var(--text, #18271f);
      flex: 1;
      padding-right: 8px;
    }
    .hist-card-meta {
      font-size: .8rem;
      color: var(--text-muted, #7f8a82);
      margin-bottom: 8px;
    }
    .hist-card-stats {
      display: flex;
      gap: 16px;
      font-size: .85rem;
    }
    .hist-card-label {
      display: block;
      color: var(--text-muted, #7f8a82);
      font-size: .78rem;
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .history-filters { flex-direction: column; }
      .table-desktop { display: none !important; }
      .hist-cards { display: block; }
    }
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

  getBadgeClass(status: string): string  { return statusBadgeClass(status); }
  getStatusLabel(status: string): string { return statusLabel(status); }

  /** Net perçu par le coursier = tarif × (1 - 20% commission par défaut). */
  netPercu(course: any): string {
    const amount = course.courseAmount;
    if (!amount || amount <= 0) return '—';
    const net = amount * 0.80; // 20% commission par défaut
    return `${Math.round(net).toLocaleString('fr-FR')} XAF`;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
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
        this.toast.error('Impossible de charger l\'historique.');
        console.error(err);
      },
    });
  }
}
