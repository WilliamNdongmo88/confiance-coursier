import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, DisputeResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideScale, LucideUser, LucideCalendar,
  LucideCheck, LucideCheckCircle, LucideMessageSquare,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [
    DatePipe,
    LucideScale, LucideUser, LucideCalendar,
    LucideCheck, LucideCheckCircle, LucideMessageSquare,
  ],
  template: `
      <section class="page-head">
        <div>
          <h1>Litiges</h1>
          <p>{{ openList().length }} litige(s) actif(s) à arbitrer.</p>
        </div>
        <span class="status-badge status-badge--danger" style="font-size:.85rem;padding:8px 14px">
          {{ openList().length }} actif(s)
        </span>
      </section>

      @if (loading()) {
        <p style="text-align:center;padding:40px;color:var(--text-muted)">Chargement…</p>
      }

      @for (dispute of allList(); track dispute.id) {
        <div class="dispute-card" [style.opacity]="dispute.status !== 'OPEN' ? '.6' : '1'"
             [style.pointer-events]="dispute.status !== 'OPEN' ? 'none' : 'auto'">
          <div class="dispute-header">
            <div>
              <div class="dispute-id">Course #{{ dispute.courseId }}</div>
              <div class="dispute-title">{{ dispute.motifCode === 'SYS-NL' ? 'Litige automatique : non-livraison' : dispute.motifCode }}</div>
            </div>
            @if (dispute.status === 'OPEN') {
              <span class="status-badge status-badge--danger">En cours</span>
            } @else {
              <span class="status-badge status-badge--success">Résolu</span>
            }
          </div>
          <div class="dispute-parties">
            <span><svg lucideUser size="12"></svg> Ouvert par : #{{ dispute.openedBy }}</span>
            <span><svg lucideCalendar size="12"></svg> {{ dispute.createdAt | date:'dd/MM/yyyy' }}</span>
          </div>
          @if (dispute.description) {
            <div class="dispute-desc">{{ dispute.description }}</div>
          }
          @if (dispute.decision) {
            <div class="dispute-desc" style="border-left-color:var(--success)">
              <strong style="color:var(--success)">Décision :</strong> {{ dispute.decision }}
            </div>
          }
          @if (dispute.status === 'OPEN') {
            <div class="dispute-actions">
              <button class="btn btn-primary btn-sm" (click)="resolve(dispute, 'REMBOURSEMENT_TOTAL')">
                <svg lucideCheck size="14"></svg> Rembourser le client
              </button>
              <button class="btn btn-secondary btn-sm" (click)="resolve(dispute, 'LIBERATION')">
                <svg lucideCheckCircle size="14"></svg> Payer le coursier
              </button>
              <button class="btn btn-secondary btn-sm" (click)="split(dispute)">
                <svg lucideScale size="14"></svg> Partager
              </button>
              <button class="btn btn-ghost btn-sm" (click)="viewChat()">
                <svg lucideMessageSquare size="14"></svg> Voir les échanges
              </button>
            </div>
          }
        </div>
      } @empty {
        @if (!loading()) {
          <div style="text-align:center;padding:60px;color:var(--text-muted)">
            <svg lucideScale size="40" style="opacity:.3"></svg>
            <p style="margin-top:12px">Aucun litige à afficher.</p>
          </div>
        }
      }
  `,
  styles: [`
    .dispute-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 14px;
    }
    .dispute-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .dispute-id { font-size: .82rem; color: var(--text-muted); margin-bottom: 3px; }
    .dispute-title { font-size: 1rem; font-weight: 700; color: var(--text); }
    .dispute-parties {
      display: flex; gap: 12px; flex-wrap: wrap;
      font-size: .82rem; color: var(--text-muted); margin-bottom: 12px;
    }
    .dispute-parties span { display: flex; align-items: center; gap: 4px; }
    .dispute-desc {
      font-size: .85rem; color: var(--text);
      background: var(--bg); padding: 10px 12px;
      border-radius: var(--radius-md); margin-bottom: 14px;
      line-height: 1.55; border-left: 3px solid var(--danger);
    }
    .dispute-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 640px) {
      .dispute-actions { flex-direction: column; gap: 8px; }
      .dispute-actions .btn { width: 100%; justify-content: center; }
    }
  `],
})
export class AdminDisputesComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly allList = signal<DisputeResponse[]>([]);
  readonly loading = signal(false);
  readonly openList = computed(() => this.allList().filter(d => d.status === 'OPEN'));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getDisputes().subscribe({
      next: (data) => {
        this.allList.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des litiges.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Partage (REMBOURSEMENT_PARTIEL) : l'admin saisit le montant rendu au client (0 < x < total).
   * Le serveur prélève les frais plateforme sur le reste et verse le solde au coursier.
   * Saisie minimale en attendant l'écran détail du litige (TICK-092).
   */
  split(dispute: DisputeResponse): void {
    const raw = window.prompt('Montant à rembourser au client (XAF) — le reste revient au coursier, frais plateforme déduits :');
    if (raw === null) return;
    const amount = Math.round(Number(raw.replace(/\s/g, '')));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.toast.error('Montant invalide.');
      return;
    }
    this.resolve(dispute, 'REMBOURSEMENT_PARTIEL', amount);
  }

  resolve(dispute: DisputeResponse, decision: string, refundAmount?: number): void {
    const labels: Record<string, string> = {
      REMBOURSEMENT_TOTAL: 'Rembourser le client',
      LIBERATION: 'Payer le coursier',
      REMBOURSEMENT_PARTIEL: `Rembourser ${refundAmount ?? 0} XAF au client et verser le reste au coursier`,
    };
    if (!window.confirm(`${labels[decision] ?? decision} ? Cette décision est définitive.`)) return;

    this.adminService.resolveDispute(dispute.id, decision, refundAmount).subscribe({
      next: (updated) => {
        this.allList.update(list => list.map(d => d.id === updated.id ? updated : d));
        const msg = decision === 'REMBOURSEMENT_TOTAL' ? 'Client remboursé. Litige clôturé.'
          : decision === 'REMBOURSEMENT_PARTIEL' ? 'Partage effectué. Litige clôturé.'
          : 'Paiement libéré au coursier. Litige clôturé.';
        this.toast.success(msg);
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Erreur lors de la résolution.'),
    });
  }

  viewChat(): void {
    this.toast.info('Chat du litige — fonctionnalité à venir.');
  }
}
