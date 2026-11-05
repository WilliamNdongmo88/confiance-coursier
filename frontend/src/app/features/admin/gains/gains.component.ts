import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  AdminService, GainsStatsResponse, MonthlyGain, CourseGainEntry
} from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideTrendingUp, LucideBanknote, LucidePackage,
  LucideCalendar, LucideArrowUp, LucideArrowDown,
  LucideChevronDown, LucideChevronUp,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-gains',
  standalone: true,
  imports: [
    AppShellComponent, DecimalPipe,
    LucideTrendingUp, LucideBanknote, LucidePackage,
    LucideCalendar, LucideArrowUp, LucideArrowDown,
    LucideChevronDown, LucideChevronUp,
  ],
  template: `
    <app-shell pageTitle="Gains">

      <!-- ── En-tête ── -->
      <section class="page-head">
        <div>
          <h1>Gains de la plateforme</h1>
          <p>Historique des revenus générés par les commissions sur les courses complétées.</p>
        </div>
      </section>

      @if (loading()) {
        <p style="text-align:center;padding:60px;color:var(--text-muted)">Chargement…</p>
      } @else if (stats()) {

        <!-- ── 4 métriques clés ── -->
        <div class="metrics-grid">

          <div class="metric-card">
            <div class="metric-icon" style="background:#e4f1e8;color:#17634f">
              <svg lucideBanknote size="20"></svg>
            </div>
            <div>
              <div class="metric-label">Gains totaux cumulés</div>
              <div class="metric-value">{{ formatXaf(stats()!.totalGains) }}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon" style="background:#e4f1e8;color:#17634f">
              <svg lucideTrendingUp size="20"></svg>
            </div>
            <div>
              <div class="metric-label">Ce mois-ci</div>
              <div class="metric-value">{{ formatXaf(stats()!.gainsThisMonth) }}</div>
              <div class="metric-compare">
                @if (monthTrend() >= 0) {
                  <span class="trend-up"><svg lucideArrowUp size="12"></svg> +{{ monthTrend() | number:'1.0-1' }}%</span>
                } @else {
                  <span class="trend-down"><svg lucideArrowDown size="12"></svg> {{ monthTrend() | number:'1.0-1' }}%</span>
                }
                <span> vs mois dernier</span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon" style="background:#fff3dc;color:#a66b16">
              <svg lucideBanknote size="20"></svg>
            </div>
            <div>
              <div class="metric-label">Volume brut total</div>
              <div class="metric-value">{{ formatXaf(stats()!.totalVolume) }}</div>
              <div class="metric-sub">Payé par les clients</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon" style="background:#f0f3ef;color:#6d7a71">
              <svg lucidePackage size="20"></svg>
            </div>
            <div>
              <div class="metric-label">Courses complétées</div>
              <div class="metric-value">{{ stats()!.totalCourses }}</div>
              <div class="metric-sub">Depuis le lancement</div>
            </div>
          </div>

        </div>

        <!-- ── Historique mensuel ── -->
        <div class="section-title">
          <svg lucideCalendar size="16"></svg> Historique mensuel
        </div>

        @if (stats()!.monthly.length === 0) {
          <div class="empty-state">
            <svg lucideTrendingUp size="36" style="opacity:.25"></svg>
            <p>Aucun gain enregistré pour le moment.</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table class="gains-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th class="num">Nb courses</th>
                  <th class="num">Gains plateforme</th>
                  <th class="num">Volume brut</th>
                  <th class="num">Marge %</th>
                </tr>
              </thead>
              <tbody>
                @for (row of stats()!.monthly; track row.month) {
                  <tr>
                    <td><strong>{{ formatMonth(row.month) }}</strong></td>
                    <td class="num">{{ row.nbCourses }}</td>
                    <td class="num gains-col">{{ formatXaf(row.gains) }}</td>
                    <td class="num">{{ formatXaf(row.volume) }}</td>
                    <td class="num">
                      <span class="pct-badge">
                        {{ row.volume > 0 ? ((row.gains / row.volume) * 100 | number:'1.1-1') : '—' }}%
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ── Détail des dernières courses ── -->
        <div class="section-title" style="margin-top:28px;cursor:pointer"
             (click)="showDetail.set(!showDetail())" role="button"
             [attr.aria-expanded]="showDetail()">
          <svg lucidePackage size="16"></svg>
          Détail des 50 dernières courses
          @if (showDetail()) {
            <svg lucideChevronUp size="14" style="margin-left:auto"></svg>
          } @else {
            <svg lucideChevronDown size="14" style="margin-left:auto"></svg>
          }
        </div>

        @if (showDetail()) {
          @if (stats()!.recentCourses.length === 0) {
            <div class="empty-state">
              <p>Aucune course avec données de gains.</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="gains-table detail-table">
                <thead>
                  <tr>
                    <th>#Course</th>
                    <th>Complétée le</th>
                    <th class="num">Total client</th>
                    <th class="num">Frais client</th>
                    <th class="num">Comm. coursier</th>
                    <th class="num highlight-col">Gains plateforme</th>
                    <th class="num">Net coursier</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of stats()!.recentCourses; track c.courseId) {
                    <tr>
                      <td><span class="course-id">#{{ c.courseId }}</span></td>
                      <td style="color:var(--text-muted);font-size:.85rem">{{ c.completedAt ?? '—' }}</td>
                      <td class="num">{{ formatXaf(c.totalAmount) }}</td>
                      <td class="num">
                        {{ formatXaf(c.commissionAmount) }}
                        <small>({{ c.commissionRate }}%)</small>
                      </td>
                      <td class="num">
                        {{ formatXaf(c.platformFeeAmount - c.commissionAmount) }}
                        <small>({{ c.commissionRateCourier }}%)</small>
                      </td>
                      <td class="num highlight-col">
                        <strong>{{ formatXaf(c.platformFeeAmount) }}</strong>
                      </td>
                      <td class="num" style="color:var(--cc-success)">
                        {{ formatXaf(c.courierAmount) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

      } @else {
        <div class="empty-state">
          <svg lucideTrendingUp size="40" style="opacity:.3"></svg>
          <p>Impossible de charger les données.</p>
        </div>
      }

    </app-shell>
  `,
  styles: [`
    /* ── Grille métriques ── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
    }
    .metric-icon {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .metric-label  { font-size: .8rem; color: var(--text-muted); margin-bottom: 4px; }
    .metric-value  { font-size: 1.25rem; font-weight: 800; color: var(--text); line-height: 1.1; }
    .metric-sub    { font-size: .78rem; color: var(--text-muted); margin-top: 3px; }
    .metric-compare { display: flex; align-items: center; gap: 4px; font-size: .78rem;
                      color: var(--text-muted); margin-top: 3px; }
    .trend-up   { color: var(--cc-success); font-weight: 700;
                  display: flex; align-items: center; gap: 2px; }
    .trend-down { color: var(--cc-danger);  font-weight: 700;
                  display: flex; align-items: center; gap: 2px; }

    /* ── Titre de section ── */
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: .93rem; font-weight: 700; color: var(--text);
      margin-bottom: 12px; padding: 10px 14px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }

    /* ── Tableaux ── */
    .table-wrap {
      overflow-x: auto; margin-bottom: 6px;
      border: 1px solid var(--border); border-radius: var(--radius-lg);
    }
    .gains-table {
      width: 100%; border-collapse: collapse; font-size: .9rem;
    }
    .gains-table thead tr {
      background: var(--bg); border-bottom: 1px solid var(--border);
    }
    .gains-table th {
      padding: 11px 16px; font-size: .8rem; font-weight: 700;
      color: var(--text-muted); text-align: left; white-space: nowrap;
    }
    .gains-table td {
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .gains-table tbody tr:last-child td { border-bottom: none; }
    .gains-table tbody tr:hover { background: var(--bg); }
    .num { text-align: right !important; }
    .gains-col  { color: var(--cc-success); font-weight: 700; }
    .highlight-col { background: rgba(23,99,79,.05); }
    .pct-badge {
      display: inline-block; padding: 2px 8px;
      background: var(--primary-light); color: var(--primary);
      border-radius: 99px; font-size: .78rem; font-weight: 700;
    }
    .course-id {
      display: inline-block; padding: 2px 8px;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 6px; font-size: .82rem; font-weight: 600; color: var(--text);
    }
    .detail-table th, .detail-table td { padding: 10px 14px; }
    small { color: var(--text-muted); font-size: .78rem; margin-left: 4px; }

    /* ── État vide ── */
    .empty-state {
      text-align: center; padding: 48px;
      color: var(--text-muted); display: flex;
      flex-direction: column; align-items: center; gap: 12px;
    }
    @media (max-width: 640px) {
      .metrics-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 420px) {
      .metrics-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminGainsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast        = inject(ToastService);

  readonly stats      = signal<GainsStatsResponse | null>(null);
  readonly loading    = signal(false);
  readonly showDetail = signal(false);

  /** % d'évolution vs mois dernier (peut être Infinity si mois dernier = 0). */
  readonly monthTrend = computed(() => {
    const s = this.stats();
    if (!s || s.gainsLastMonth === 0) return 0;
    return ((s.gainsThisMonth - s.gainsLastMonth) / s.gainsLastMonth) * 100;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.adminService.getGains().subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des gains.'); this.loading.set(false); },
    });
  }

  formatXaf(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('fr-FR').format(value) + ' XAF';
  }

  formatMonth(yyyyMM: string): string {
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun',
                    'Jul','Aoû','Sep','Oct','Nov','Déc'];
    const [y, m] = yyyyMM.split('-');
    return `${months[parseInt(m, 10) - 1]} ${y}`;
  }
}
