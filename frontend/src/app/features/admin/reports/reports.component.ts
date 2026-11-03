import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, ReportResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideFlag, LucideUser, LucideCalendar,
  LucideCheck, LucideAlertOctagon, LucideEye,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    AppShellComponent, DatePipe,
    LucideFlag, LucideUser, LucideCalendar,
    LucideCheck, LucideAlertOctagon, LucideEye,
  ],
  template: `
    <app-shell pageTitle="Signalements">
      <section class="page-head">
        <div>
          <h1>Signalements</h1>
          <p>Gérez les signalements de comportement inapproprié (harcèlement, fraude, injures).</p>
        </div>
        <span class="status-badge status-badge--danger" style="font-size:.85rem;padding:8px 14px">
          {{ openList().length }} actif(s)
        </span>
      </section>

      <div class="app-alert app-alert--warning" style="margin-bottom:24px">
        <span class="app-alert-icon"><svg lucideFlag size="18"></svg></span>
        <div class="app-alert-body">
          <strong>Rappel des règles</strong>
          <p>Un utilisateur ayant accumulé 3 signalements en 30 jours est automatiquement suspendu.
             Vérifiez bien les faits avant de prendre une décision.</p>
        </div>
      </div>

      @if (loading()) {
        <p style="text-align:center;padding:40px;color:var(--text-muted)">Chargement…</p>
      }

      @for (report of allList(); track report.id) {
        <div class="report-card" [style.opacity]="report.status !== 'OPEN' ? '.65' : '1'"
             [style.pointer-events]="report.status !== 'OPEN' ? 'none' : 'auto'">
          <div class="report-header">
            <div>
              <div class="report-id">Signalement #{{ report.id }}</div>
              <div class="report-title">{{ report.motif }}</div>
            </div>
            @if (report.status === 'OPEN') {
              <span class="status-badge status-badge--danger">En attente</span>
            } @else {
              <span class="status-badge status-badge--success">Résolu</span>
            }
          </div>
          <div class="report-parties">
            <span><svg lucideUser size="14"></svg> Signalé par : <strong>#{{ report.reporterId }}</strong></span>
            <span><svg lucideUser size="14"></svg> Utilisateur signalé : <strong>#{{ report.targetId }}</strong></span>
            <span><svg lucideCalendar size="14"></svg> {{ report.createdAt | date:'dd/MM/yyyy à HH:mm' }}</span>
          </div>
          @if (report.description) {
            <div class="report-desc">
              <strong>Description :</strong> "{{ report.description }}"
            </div>
          }
          @if (report.decision) {
            <div class="report-desc" style="border-left-color:var(--success)">
              <strong style="color:var(--success)">Décision de l'admin :</strong> {{ report.decision }}
            </div>
          }
          @if (report.status === 'OPEN') {
            <div class="report-actions">
              <button class="btn btn-primary btn-sm" (click)="process(report, 'REJET')">
                <svg lucideCheck size="14"></svg> Classer sans suite
              </button>
              <button class="btn btn-danger btn-sm" (click)="process(report, 'SUSPENSION')">
                <svg lucideAlertOctagon size="14"></svg> Suspendre
              </button>
              <button class="btn btn-secondary btn-sm" (click)="process(report, 'AVERTISSEMENT')">
                <svg lucideEye size="14"></svg> Avertir
              </button>
            </div>
          }
        </div>
      } @empty {
        @if (!loading()) {
          <div style="text-align:center;padding:60px;color:var(--text-muted)">
            <svg lucideFlag size="40" style="opacity:.3"></svg>
            <p style="margin-top:12px">Aucun signalement à afficher.</p>
          </div>
        }
      }
    </app-shell>
  `,
  styles: [`
    .report-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px; margin-bottom: 14px;
    }
    .report-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .report-id { font-size: .82rem; color: var(--text-muted); margin-bottom: 3px; }
    .report-title { font-size: 1rem; font-weight: 700; color: var(--text); }
    .report-parties {
      display: flex; gap: 16px; flex-wrap: wrap;
      font-size: .85rem; color: var(--text-muted); margin-bottom: 14px;
      background: var(--bg); padding: 10px 14px; border-radius: var(--radius-md);
    }
    .report-parties span { display: flex; align-items: center; gap: 6px; }
    .report-parties strong { color: var(--text); font-weight: 600; }
    .report-desc {
      font-size: .88rem; color: var(--text);
      background: var(--bg); padding: 14px; border-radius: var(--radius-md);
      margin-bottom: 16px; line-height: 1.6; border-left: 3px solid var(--danger);
    }
    .report-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 640px) {
      .report-actions { flex-direction: column; }
      .report-actions .btn { width: 100%; justify-content: center; }
    }
  `],
})
export class AdminReportsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly allList = signal<ReportResponse[]>([]);
  readonly loading = signal(false);
  readonly openList = computed(() => this.allList().filter(r => r.status === 'OPEN'));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getReports().subscribe({
      next: (data) => {
        this.allList.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des signalements.');
        this.loading.set(false);
      },
    });
  }

  process(report: ReportResponse, decision: string): void {
    this.adminService.processReport(report.id, decision).subscribe({
      next: (updated) => {
        this.allList.update(list => list.map(r => r.id === updated.id ? updated : r));
        const msg = decision === 'SUSPENSION'
          ? 'Utilisateur suspendu suite au signalement.'
          : decision === 'AVERTISSEMENT'
          ? 'Avertissement envoyé.'
          : 'Signalement classé sans suite.';
        this.toast.success(msg);
      },
      error: () => this.toast.error('Erreur lors du traitement.'),
    });
  }
}
