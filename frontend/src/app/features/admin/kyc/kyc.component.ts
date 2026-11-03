import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminKycResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideShieldCheck, LucideCalendar, LucideIdCard,
  LucideImage, LucideUser, LucideCheck, LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [
    AppShellComponent, DatePipe, FormsModule,
    LucideShieldCheck, LucideCalendar, LucideIdCard,
    LucideImage, LucideUser, LucideCheck, LucideX,
  ],
  template: `
    <app-shell pageTitle="Validations KYC">
      <section class="page-head">
        <div>
          <h1>Validations KYC</h1>
          <p>{{ pendingList().length }} dossier(s) en attente de vérification.</p>
        </div>
        <span class="status-badge status-badge--warning" style="font-size:.85rem;padding:8px 14px">
          {{ pendingList().length }} en attente
        </span>
      </section>

      @if (loading()) {
        <p style="text-align:center;padding:40px;color:var(--text-muted)">Chargement…</p>
      }

      @for (kyc of allList(); track kyc.id) {
        <div class="kyc-card" [style.opacity]="kyc.status !== 'PENDING' ? '.65' : '1'"
             [style.pointer-events]="kyc.status !== 'PENDING' ? 'none' : 'auto'">
          <div class="kyc-avatar">{{ initials(kyc) }}</div>
          <div class="kyc-info">
            <h3>
              {{ kyc.userFullName || 'Utilisateur #' + kyc.userId }}
              @if (kyc.status === 'PENDING') {
                <span class="badge badge-warning" style="font-size:.65rem">En attente</span>
              } @else if (kyc.status === 'APPROVED') {
                <span class="badge badge-success" style="font-size:.65rem">Approuvé</span>
              } @else {
                <span class="badge badge-danger" style="font-size:.65rem">Refusé</span>
              }
            </h3>
            <div class="kyc-meta">
              <span><svg lucideCalendar size="12"></svg> Soumis le {{ kyc.submittedAt | date:'dd/MM/yyyy' }}</span>
              <span><svg lucideIdCard size="12"></svg> {{ kyc.documentType }}</span>
              <span style="opacity:.8">{{ kyc.userEmail }}</span>
            </div>

            @if (kyc.status === 'PENDING') {
              <div class="kyc-docs">
                @if (kyc.frontFileUrl) {
                  <a [href]="kyc.frontFileUrl" target="_blank" class="kyc-doc-thumb" title="Recto">
                    <svg lucideImage size="20"></svg>
                  </a>
                }
                @if (kyc.backFileUrl) {
                  <a [href]="kyc.backFileUrl" target="_blank" class="kyc-doc-thumb" title="Verso">
                    <svg lucideImage size="20"></svg>
                  </a>
                }
                @if (kyc.selfieFileUrl) {
                  <a [href]="kyc.selfieFileUrl" target="_blank" class="kyc-doc-thumb" title="Selfie">
                    <svg lucideUser size="20"></svg>
                  </a>
                }
              </div>
            }

            @if (kyc.status === 'REJECTED' && kyc.rejectionReason) {
              <p style="font-size:.8rem;color:var(--danger);margin-top:8px">
                Raison du rejet : {{ kyc.rejectionReason }}
              </p>
            }
          </div>

          @if (kyc.status === 'PENDING') {
            <div class="kyc-actions">
              @if (rejectingId() !== kyc.id) {
                <button class="btn btn-primary btn-sm" (click)="approve(kyc)">
                  <svg lucideCheck size="14"></svg> Approuver
                </button>
                <button class="btn btn-danger btn-sm" (click)="startReject(kyc)">
                  <svg lucideX size="14"></svg> Refuser
                </button>
              } @else {
                <textarea
                  class="form-input"
                  placeholder="Raison du rejet (min. 10 caractères)"
                  [ngModel]="rejectReason()"
                  (ngModelChange)="rejectReason.set($event)"
                  rows="3"
                  style="font-size:.82rem;width:200px"
                ></textarea>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-danger btn-sm" (click)="confirmReject(kyc)" [disabled]="rejectReason().length < 10">
                    Confirmer
                  </button>
                  <button class="btn btn-secondary btn-sm" (click)="cancelReject()">Annuler</button>
                </div>
              }
            </div>
          } @else {
            <div class="kyc-actions">
              @if (kyc.status === 'APPROVED') {
                <span class="status-badge status-badge--success">Approuvé</span>
              } @else {
                <span class="status-badge status-badge--danger">Refusé</span>
              }
            </div>
          }
        </div>
      } @empty {
        @if (!loading()) {
          <div style="text-align:center;padding:60px;color:var(--text-muted)">
            <svg lucideShieldCheck size="40" style="opacity:.3"></svg>
            <p style="margin-top:12px">Aucune soumission KYC à afficher.</p>
          </div>
        }
      }
    </app-shell>
  `,
  styles: [`
    .kyc-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
      transition: border-color .15s;
    }
    .kyc-card:hover { border-color: var(--primary); }
    .kyc-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .kyc-info { flex: 1; min-width: 0; }
    .kyc-info h3 { font-size: .98rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .kyc-meta {
      display: flex; gap: 10px; flex-wrap: wrap;
      font-size: .8rem; color: var(--text-muted); margin-bottom: 10px;
    }
    .kyc-meta span { display: flex; align-items: center; gap: 4px; }
    .kyc-docs { display: flex; gap: 8px; flex-wrap: wrap; }
    .kyc-doc-thumb {
      width: 60px; height: 45px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); cursor: pointer; transition: border-color .15s;
    }
    .kyc-doc-thumb:hover { border-color: var(--primary); }
    .kyc-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    @media (max-width: 640px) {
      .kyc-card { flex-direction: column; }
      .kyc-actions { flex-direction: row; width: 100%; }
      .kyc-actions .btn { flex: 1; justify-content: center; }
    }
  `],
})
export class AdminKycComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly allList = signal<AdminKycResponse[]>([]);
  readonly loading = signal(false);
  readonly rejectingId = signal<number | null>(null);
  readonly rejectReason = signal('');

  readonly pendingList = computed(() => this.allList().filter(k => k.status === 'PENDING'));

  ngOnInit(): void {
    this.loadKyc();
  }

  private loadKyc(): void {
    this.loading.set(true);
    this.adminService.getKycList().subscribe({
      next: (data) => {
        this.allList.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des KYC.');
        this.loading.set(false);
      },
    });
  }

  initials(kyc: AdminKycResponse): string {
    const name = kyc.userFullName;
    if (name) {
      return name.split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
    }
    return kyc.userEmail ? kyc.userEmail.charAt(0).toUpperCase() : '?';
  }

  approve(kyc: AdminKycResponse): void {
    this.adminService.approveKyc(kyc.id).subscribe({
      next: (updated) => {
        this.allList.update(list => list.map(k => k.id === updated.id ? updated : k));
        this.toast.success(`${kyc.userFullName || 'Utilisateur'} approuvé(e) !`);
      },
      error: () => this.toast.error('Erreur lors de l\'approbation.'),
    });
  }

  startReject(kyc: AdminKycResponse): void {
    this.rejectingId.set(kyc.id);
    this.rejectReason.set('');
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectReason.set('');
  }

  confirmReject(kyc: AdminKycResponse): void {
    this.adminService.rejectKyc(kyc.id, this.rejectReason()).subscribe({
      next: (updated) => {
        this.allList.update(list => list.map(k => k.id === updated.id ? updated : k));
        this.toast.success(`Dossier de ${kyc.userFullName || 'utilisateur'} refusé.`);
        this.cancelReject();
      },
      error: () => this.toast.error('Erreur lors du rejet.'),
    });
  }
}
