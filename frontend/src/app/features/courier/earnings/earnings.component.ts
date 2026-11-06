import { warnLoadFailed } from '../../../shared/state/load-error';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideWallet,
  LucidePercent,
  LucidePackageCheck,
  LucideArrowLeft,
} from '@lucide/angular';


@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    LucideWallet,
    LucidePercent,
    LucidePackageCheck,
    LucideArrowLeft,
  ],
  template: `

      <!-- ── En-tête ── -->
      <section class="page-head">
        <div>
          <h1>Mes gains</h1>
          <p>Suivez vos revenus et les frais de service appliqués.</p>
        </div>
        <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
          <svg lucideArrowLeft size="15"></svg> Retour
        </a>
      </section>

      <!-- ── Métriques ── -->
      <section class="metrics-grid" style="margin-bottom:22px" aria-label="Résumé des gains">

        <!-- Revenus ce mois -->
        <article class="metric-card">
          <span class="metric-icon"><svg lucideWallet size="20"></svg></span>
          <div>
            <span class="metric-label">Revenus ce mois</span>
            <strong class="metric-value">
              @if (loading) { — }
              @else { {{ formatXaf(monthNet) }} }
            </strong>
            <div class="metric-note">Net après frais de service</div>
          </div>
        </article>

        <!-- Frais de service -->
        <article class="metric-card">
          <span class="metric-icon" style="background:#fef3dc;color:#a66b16">
            <svg lucidePercent size="20"></svg>
          </span>
          <div>
            <span class="metric-label">Frais de service</span>
            <strong class="metric-value">{{ currentCommissionRate === null ? '…' : currentCommissionRate + '%' }}</strong>
            <div class="metric-note">Sur chaque course terminée</div>
          </div>
        </article>

        <!-- Courses ce mois -->
        <article class="metric-card">
          <span class="metric-icon"><svg lucidePackageCheck size="20"></svg></span>
          <div>
            <span class="metric-label">Courses ce mois</span>
            <strong class="metric-value">{{ loading ? '—' : monthCount.toString() }}</strong>
            <div class="metric-note">Terminées avec succès</div>
          </div>
        </article>

      </section>

      <!-- ── Total depuis inscription ── -->
      <section class="panel" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="margin:0;font-size:16px">Total depuis votre inscription</h2>
            <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">
              {{ completedTransactions.length }} course{{ completedTransactions.length > 1 ? 's' : '' }} terminée{{ completedTransactions.length > 1 ? 's' : '' }}
            </p>
          </div>
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            <div>
              <span style="font-size:12px;color:var(--text-muted)">Brut total</span>
              <div style="font-weight:700;font-size:18px;color:var(--text)">
                {{ loading ? '—' : formatXaf(totalBrut) }}
              </div>
            </div>
            <div>
              <span style="font-size:12px;color:var(--text-muted)">Commissions déduites</span>
              <div style="font-weight:700;font-size:18px;color:var(--danger)">
                {{ loading ? '—' : formatXaf(totalFees) }}
              </div>
            </div>
            <div>
              <span style="font-size:12px;color:var(--text-muted)">Net total</span>
              <div style="font-weight:700;font-size:18px;color:var(--success)">
                {{ loading ? '—' : formatXaf(totalNet) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Transactions ── -->
      <div class="panel">
        <div class="panel-head">
          <div><h2>Transactions</h2><p>Détail de chaque versement</p></div>
        </div>

        <!-- État chargement -->
        @if (loading) {
          <div style="padding:32px;text-align:center;color:var(--text-muted)">
            Chargement…
          </div>
        }

        <!-- État vide -->
        @if (!loading && completedTransactions.length === 0) {
          <div style="padding:32px;text-align:center;color:var(--text-muted)">
            <svg lucidePackageCheck size="32" style="opacity:.35;margin:0 auto 8px"></svg>
            <p style="margin:0;font-size:14px;">Aucune course terminée pour le moment.</p>
            <a routerLink="/courier/dashboard" class="text-link" style="margin-top:8px;display:inline-block">
              Voir les missions disponibles →
            </a>
          </div>
        }

        <!-- Tableau desktop -->
        @if (!loading && completedTransactions.length > 0) {
          <div class="table-responsive table-desktop" style="padding:0 18px">
            <table class="earnings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Brut</th>
                  <th>Commission</th>
                  <th>Net</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of completedTransactions; track tx.id) {
                  <tr>
                    <td>{{ tx.date | date:'dd/MM/yyyy' }}</td>
                    <td>{{ tx.description }} — {{ tx.zone }}</td>
                    <td>{{ formatXaf(tx.brut) }}</td>
                    <td style="color:var(--danger)">-{{ formatXaf(tx.frais) }}</td>
                    <td style="font-weight:700;color:var(--success)">{{ formatXaf(tx.net) }}</td>
                    <td>
                      <span class="badge badge-success">Versé</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Cartes mobiles -->
          <div class="tx-cards">
            @for (tx of completedTransactions; track tx.id) {
              <div class="tx-card-item">
                <div class="tx-card-top">
                  <span class="tx-card-title">{{ tx.description }} — {{ tx.zone }}</span>
                  <span class="badge badge-success" style="flex-shrink:0">Versé</span>
                </div>
                <div class="tx-card-meta">{{ tx.date | date:'dd/MM/yyyy' }}</div>
                <div class="tx-card-stats">
                  <div>
                    <span class="tx-card-label">Brut</span>
                    <strong>{{ formatXaf(tx.brut) }}</strong>
                  </div>
                  <div>
                    <span class="tx-card-label">Frais</span>
                    <strong style="color:var(--danger)">-{{ formatXaf(tx.frais) }}</strong>
                  </div>
                  <div>
                    <span class="tx-card-label">Net</span>
                    <strong style="color:var(--success)">{{ formatXaf(tx.net) }}</strong>
                  </div>
                </div>
              </div>
            }
          </div>
        }

      </div>

  `,
  styles: `
    /* ── Table desktop ── */
    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .earnings-table { width: 100%; border-collapse: collapse; }
    .earnings-table th {
      font-size: .83rem;
      color: var(--text-muted);
      font-weight: 600;
      padding: 10px 8px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      text-align: left;
    }
    .earnings-table td {
      padding: 14px 8px;
      border-bottom: 1px solid var(--border);
      font-size: .92rem;
      color: var(--text);
    }
    .earnings-table tr:last-child td { border-bottom: none; }

    /* ── Cartes mobile ── */
    .tx-cards { display: none; }
    .tx-card-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .tx-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .tx-card-title {
      font-size: .88rem;
      font-weight: 700;
      color: var(--text);
      flex: 1;
      padding-right: 8px;
    }
    .tx-card-meta {
      font-size: .8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .tx-card-stats {
      display: flex;
      gap: 16px;
      font-size: .85rem;
    }
    .tx-card-label {
      display: block;
      color: var(--text-muted);
      font-size: .78rem;
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .table-desktop { display: none !important; }
      .tx-cards { display: block; }
    }
  `,
})
export class EarningsComponent implements OnInit {

  /** Taux de commission coursier actuel (lu du serveur — TICK-070 : plus de valeur codée en dur). */
  currentCommissionRate: number | null = null;

  loading = true;

  /** Transactions terminées (courses COMPLETED avec montant). */
  completedTransactions: Transaction[] = [];

  // ─── Métriques calculées ──────────────────────────────────────────────────

  get monthNet(): number {
    const now = new Date();
    return this.completedTransactions
      .filter(tx => {
        const d = new Date(tx.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.net, 0);
  }

  get monthCount(): number {
    const now = new Date();
    return this.completedTransactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  get totalBrut(): number {
    return this.completedTransactions.reduce((sum, tx) => sum + tx.brut, 0);
  }

  get totalFees(): number {
    return this.completedTransactions.reduce((sum, tx) => sum + tx.frais, 0);
  }

  get totalNet(): number {
    return this.completedTransactions.reduce((sum, tx) => sum + tx.net, 0);
  }

  // ─── DI ───────────────────────────────────────────────────────────────────

  private courseService = inject(CourseService);
  private authService   = inject(AuthService);
  private toast         = inject(ToastService);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (p) => this.currentCommissionRate = p.commissionRateCourier ?? null,
      error: warnLoadFailed('taux de commission actuel', 'taux affiché « … »'),
    });
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.courseService.getMyMissions().subscribe({
      next: (data) => {
        this.completedTransactions = data
          // TICK-070 : montants figés au paiement, fournis par le serveur
          .filter(c => c.status === 'COMPLETED' && c.courierAmount != null)
          .map(c => {
            const brut = Number(c.courseAmount ?? 0);
            const frais = Number(c.courierCommissionAmount ?? 0);
            // Gain = net versé hors remboursement des achats avancés
            const net = Number(c.courierAmount) - Number(c.realCosts ?? 0);
            return {
              id: c.id,
              date: c.completedAt || c.paidAt || c.createdAt,
              description: c.description,
              zone: c.zone,
              brut,
              frais,
              net,
            };
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Impossible de charger vos gains.');
        console.error(err);
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  formatXaf(amount: number): string {
    if (!amount || amount <= 0) return '0 XAF';
    return `${Math.round(amount).toLocaleString('fr-FR')} XAF`;
  }
}

/** Transaction individuelle (course terminée). */
interface Transaction {
  id: number;
  date: string;
  description: string;
  zone: string;
  brut: number;
  frais: number;
  net: number;
}
