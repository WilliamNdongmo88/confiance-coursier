import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminKycResponse, DisputeResponse, ReportResponse } from '../../../core/services/admin.service';
import {
  LucideShieldCheck, LucideFlag, LucideScale, LucidePackage,
  LucideBanknote, LucideUsers, LucideUserCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    LucideShieldCheck, LucideFlag, LucideScale, LucidePackage,
    LucideBanknote, LucideUsers, LucideUserCheck,
  ],
  template: `
      <section class="page-head">
        <div>
          <h1>Vue d'ensemble</h1>
          <p>État actuel de la plateforme.</p>
        </div>
      </section>

      @if (totalAlerts() > 0) {
        <div class="app-alert app-alert--warning" style="margin-bottom:24px">
          <span class="app-alert-icon"><svg lucideShieldCheck size="18"></svg></span>
          <div class="app-alert-body">
            <strong>Actions requises</strong>
            <p>
              Il y a <strong>{{ pendingKyc().length }} KYC en attente</strong>,
              <strong>{{ openDisputes().length }} litiges à arbitrer</strong> et
              <strong>{{ openReports().length }} signalements à examiner</strong>.
            </p>
          </div>
        </div>
      }

      <!-- Stats grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><svg lucidePackage size="20"></svg></div>
          <div class="stat-info">
            <h3>—</h3>
            <p>Courses ce mois</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-light);color:var(--success)">
            <svg lucideBanknote size="20"></svg>
          </div>
          <div class="stat-info">
            <h3>—</h3>
            <p>Commissions perçues</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-light);color:var(--warning)">
            <svg lucideUsers size="20"></svg>
          </div>
          <div class="stat-info">
            <h3>—</h3>
            <p>Coursiers actifs</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><svg lucideUserCheck size="20"></svg></div>
          <div class="stat-info">
            <h3>—</h3>
            <p>Clients actifs</p>
          </div>
        </div>
      </div>

      <!-- Task columns -->
      <div class="tasks-grid">
        <!-- KYC en attente -->
        <div class="task-card">
          <div class="task-header">
            <h2 class="task-title">
              <svg lucideShieldCheck size="17" style="color:var(--primary)"></svg>
              KYC en attente
            </h2>
            <a routerLink="/admin/kyc" class="btn btn-secondary btn-sm">Tout voir</a>
          </div>
          <ul class="task-list">
            @for (kyc of pendingKyc().slice(0, 3); track kyc.id) {
              <li class="task-item">
                <div class="task-info">
                  <h4>{{ kyc.userFullName || 'Utilisateur #' + kyc.userId }}</h4>
                  <p>Soumis le {{ kyc.submittedAt | date:'dd/MM/yyyy' }}</p>
                </div>
                <a routerLink="/admin/kyc" class="task-action">Examiner →</a>
              </li>
            } @empty {
              <li class="task-item">
                <div class="task-info">
                  <h4>Aucun KYC en attente</h4>
                  <p>Tous les dossiers sont traités</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <!-- Signalements -->
        <div class="task-card">
          <div class="task-header">
            <h2 class="task-title">
              <svg lucideFlag size="17" style="color:var(--danger)"></svg>
              Signalements
            </h2>
            <a routerLink="/admin/reports" class="btn btn-secondary btn-sm">Tout voir</a>
          </div>
          <ul class="task-list">
            @for (report of openReports().slice(0, 3); track report.id) {
              <li class="task-item">
                <div class="task-info">
                  <h4>Signalement #{{ report.id }}</h4>
                  <p>Motif : {{ report.motif }}</p>
                </div>
                <a routerLink="/admin/reports" class="task-action task-action--danger">Examiner →</a>
              </li>
            } @empty {
              <li class="task-item">
                <div class="task-info">
                  <h4>Aucun signalement</h4>
                  <p>Rien à examiner</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <!-- Litiges -->
        <div class="task-card">
          <div class="task-header">
            <h2 class="task-title">
              <svg lucideScale size="17" style="color:var(--danger)"></svg>
              Litiges à arbitrer
            </h2>
            <a routerLink="/admin/disputes" class="btn btn-secondary btn-sm">Tout voir</a>
          </div>
          <ul class="task-list">
            @for (dispute of openDisputes().slice(0, 3); track dispute.id) {
              <li class="task-item">
                <div class="task-info">
                  <h4>#{{ dispute.id }} — {{ dispute.motifCode }}</h4>
                  <p>Course #{{ dispute.courseId }}</p>
                </div>
                <a routerLink="/admin/disputes" class="task-action task-action--danger">Arbitrer →</a>
              </li>
            } @empty {
              <li class="task-item">
                <div class="task-info">
                  <h4>Aucun litige actif</h4>
                  <p>Tous les litiges sont résolus</p>
                </div>
              </li>
            }
          </ul>
        </div>
      </div>
  `,
  styles: [`
    /* ── Stats grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon {
      width: 46px;
      height: 46px;
      border-radius: var(--radius-md);
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-info h3 {
      font-size: 1.7rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.1;
    }
    .stat-info p {
      font-size: .82rem;
      color: var(--text-muted);
      font-weight: 500;
      margin-top: 2px;
    }

    /* ── Tasks grid ── */
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 24px;
      align-items: start;
    }
    .task-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      flex-direction: column;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .task-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .task-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
    }

    /* ── Task item : layout en colonne ── */
    .task-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
      gap: 8px;
    }
    .task-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .task-info {
      width: 100%;
    }
    .task-info h4 {
      font-weight: 600;
      font-size: .9rem;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-info p {
      font-size: .78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    /* Lien "Examiner" compact sous les infos */
    .task-action {
      font-size: .8rem;
      font-weight: 600;
      color: var(--primary, #17634f);
      text-decoration: none;
      padding: 4px 10px;
      border: 1px solid var(--primary, #17634f);
      border-radius: 6px;
      transition: background .15s, color .15s;
      white-space: nowrap;
    }
    .task-action:hover {
      background: var(--primary, #17634f);
      color: #fff;
    }
    .task-action--danger {
      color: var(--danger, #dc2626);
      border-color: var(--danger, #dc2626);
    }
    .task-action--danger:hover {
      background: var(--danger, #dc2626);
      color: #fff;
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .tasks-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly pendingKyc = signal<AdminKycResponse[]>([]);
  readonly openDisputes = signal<DisputeResponse[]>([]);
  readonly openReports = signal<ReportResponse[]>([]);
  readonly loading = signal(false);

  totalAlerts(): number {
    return this.pendingKyc().length + this.openDisputes().length + this.openReports().length;
  }

  ngOnInit(): void {
    this.loading.set(true);
    // Load pending KYC, open disputes, open reports in parallel
    this.adminService.getKycList('PENDING').subscribe({
      next: (data) => this.pendingKyc.set(data),
      error: () => this.pendingKyc.set([]),
    });
    this.adminService.getDisputes('OPEN').subscribe({
      next: (data) => this.openDisputes.set(data),
      error: () => this.openDisputes.set([]),
    });
    this.adminService.getReports('OPEN').subscribe({
      next: (data) => this.openReports.set(data),
      error: () => this.openReports.set([]),
    });
    this.loading.set(false);
  }
}
