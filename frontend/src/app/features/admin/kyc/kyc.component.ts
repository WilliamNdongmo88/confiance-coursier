import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminKycResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import {
  LucideShieldCheck, LucideCalendar, LucideIdCard,
  LucideImage, LucideUser, LucideCheck, LucideX, LucideTrash2,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    MediaViewerComponent,
    LucideShieldCheck, LucideCalendar, LucideIdCard,
    LucideImage, LucideUser, LucideCheck, LucideX, LucideTrash2,
  ],
  template: `
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
        <div class="kyc-card"
             [class.kyc-card--approved]="kyc.status === 'APPROVED'"
             [class.kyc-card--rejected]="kyc.status === 'REJECTED'">

          <!-- ── En-tête de la carte ── -->
          <div class="kyc-card-header">
            <div class="kyc-avatar">{{ initials(kyc) }}</div>
            <div class="kyc-header-info">
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
                <span>{{ kyc.userEmail }}</span>
              </div>
            </div>

            <!-- Boutons d'action (coin haut-droit) -->
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
                    style="font-size:.82rem;width:220px"
                  ></textarea>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-danger btn-sm"
                            (click)="confirmReject(kyc)"
                            [disabled]="rejectReason().length < 10">
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
                  <!-- Statut REJECTED : badge + bouton supprimer -->
                  <span class="status-badge status-badge--danger">Refusé</span>
                  <button class="btn btn-danger btn-sm"
                          style="margin-top:6px; display:flex; align-items:center; gap:5px;"
                          [disabled]="deletingId() === kyc.id"
                          (click)="deleteKyc(kyc)">
                    @if (deletingId() === kyc.id) {
                      <span class="spinner" style="width:13px;height:13px;border-width:2px;"></span>
                    } @else {
                      <svg lucideTrash2 size="13"></svg>
                    }
                    Supprimer
                  </button>
                }
              </div>
            }
          </div>

          <!-- ── Corps : Infos déclarées | Documents ── -->
          <div class="kyc-card-body">

            <!-- Colonne gauche : informations personnelles déclarées -->
            <div class="kyc-section">
              <p class="kyc-section-title">
                <svg lucideUser size="13"></svg>
                Informations déclarées
              </p>
              <dl class="kyc-dl">
                <div class="kyc-dl-row">
                  <dt>Prénom</dt>
                  <dd>{{ kyc.firstName || '—' }}</dd>
                </div>
                <div class="kyc-dl-row">
                  <dt>Nom de famille</dt>
                  <dd>{{ kyc.lastName || '—' }}</dd>
                </div>
                <div class="kyc-dl-row">
                  <dt>Date de naissance</dt>
                  <dd>{{ kyc.birthDate ? (kyc.birthDate | date:'dd/MM/yyyy') : '—' }}</dd>
                </div>
                <div class="kyc-dl-row">
                  <dt>Nationalité</dt>
                  <dd>{{ kyc.nationality || '—' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Colonne droite : documents soumis -->
            <div class="kyc-section">
              <p class="kyc-section-title">
                <svg lucideIdCard size="13"></svg>
                Documents soumis
              </p>
              <div class="kyc-docs">
                @if (kyc.frontFileUrl) {
                  <button class="kyc-doc-thumb" title="Recto — Cliquez pour agrandir"
                          (click)="openViewer(kyc, 0)">
                    <svg lucideImage size="22"></svg>
                    <span class="kyc-doc-label">Recto</span>
                  </button>
                }
                @if (kyc.backFileUrl) {
                  <button class="kyc-doc-thumb" title="Verso — Cliquez pour agrandir"
                          (click)="openViewer(kyc, 1)">
                    <svg lucideImage size="22"></svg>
                    <span class="kyc-doc-label">Verso</span>
                  </button>
                }
                @if (kyc.selfieFileUrl) {
                  <button class="kyc-doc-thumb" title="Selfie — Cliquez pour agrandir"
                          (click)="openViewer(kyc, kyc.backFileUrl ? 2 : 1)">
                    <svg lucideUser size="22"></svg>
                    <span class="kyc-doc-label">Selfie</span>
                  </button>
                }
                @if (!kyc.frontFileUrl && !kyc.backFileUrl && !kyc.selfieFileUrl) {
                  <p style="font-size:.82rem;color:var(--text-muted)">Aucun document disponible.</p>
                }
              </div>
            </div>

          </div>

          @if (kyc.status === 'REJECTED' && kyc.rejectionReason) {
            <p style="font-size:.8rem;color:var(--danger);margin-top:10px;padding:0 4px">
              ✕ Raison du rejet : {{ kyc.rejectionReason }}
            </p>
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

      <!-- Modal prévisualisation documents KYC -->
      <app-media-viewer
        [items]="viewerItems()"
        [activeIndex]="viewerIndex()"
        [open]="viewerOpen()"
        (close)="viewerOpen.set(false)">
      </app-media-viewer>

  `,
  styles: [`
    /* ── Carte principale ── */
    .kyc-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 16px;
      transition: border-color .15s;
    }
    .kyc-card:hover { border-color: var(--primary); }
    .kyc-card--done { opacity: .65; pointer-events: none; }
    /* Approuvé : grisé + non interactif */
    .kyc-card--approved { opacity: .55; pointer-events: none; }
    /* Rejeté : légèrement atténué mais interactions actives (bouton Supprimer) */
    .kyc-card--rejected { opacity: .80; }

    /* ── En-tête : avatar + infos + boutons ── */
    .kyc-card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 16px;
    }
    .kyc-avatar {
      width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem;
    }
    .kyc-header-info { flex: 1; min-width: 0; }
    .kyc-header-info h3 {
      font-size: .98rem; font-weight: 700; color: var(--text);
      margin: 0 0 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .kyc-meta {
      display: flex; gap: 10px; flex-wrap: wrap;
      font-size: .8rem; color: var(--text-muted);
    }
    .kyc-meta span { display: flex; align-items: center; gap: 4px; }
    .kyc-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; align-items: flex-end; }

    /* ── Corps : 2 colonnes côte à côte ── */
    .kyc-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }

    /* ── Section (infos déclarées / documents) ── */
    .kyc-section {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .kyc-section-title {
      font-size: .72rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: var(--primary); margin: 0 0 10px;
      display: flex; align-items: center; gap: 5px;
    }

    /* ── Liste définition (label / valeur) ── */
    .kyc-dl { margin: 0; }
    .kyc-dl-row {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 8px; padding: 5px 0;
      border-bottom: 1px dashed var(--border);
    }
    .kyc-dl-row:last-child { border-bottom: none; }
    .kyc-dl-row dt {
      font-size: .78rem; color: var(--text-muted);
      font-weight: 500; white-space: nowrap;
    }
    .kyc-dl-row dd {
      font-size: .85rem; font-weight: 600; color: var(--text);
      margin: 0; text-align: right;
    }

    /* ── Documents ── */
    .kyc-docs { display: flex; gap: 8px; flex-wrap: wrap; }
    .kyc-doc-thumb {
      width: 80px; height: 64px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--bg-card);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      color: var(--text-muted); cursor: pointer;
      transition: border-color .15s, background .15s, color .15s;
    }
    .kyc-doc-thumb:hover {
      border-color: var(--primary);
      background: var(--primary-light);
      color: var(--primary);
    }
    .kyc-doc-label { font-size: .7rem; font-weight: 600; }

    /* ── Responsive ── */
    @media (max-width: 700px) {
      .kyc-card-body { grid-template-columns: 1fr; }
      .kyc-card-header { flex-wrap: wrap; }
      .kyc-actions { flex-direction: row; width: 100%; justify-content: flex-start; }
    }
  `],
})
export class AdminKycComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly allList      = signal<AdminKycResponse[]>([]);
  readonly loading      = signal(false);
  readonly rejectingId  = signal<number | null>(null);
  readonly rejectReason = signal('');
  readonly deletingId   = signal<number | null>(null);

  readonly pendingList = computed(() => this.allList().filter(k => k.status === 'PENDING'));

  // ─── Media viewer ─────────────────────────────────────────────────────────
  readonly viewerOpen  = signal(false);
  readonly viewerItems = signal<MediaItem[]>([]);
  readonly viewerIndex = signal(0);

  openViewer(kyc: AdminKycResponse, startIndex: number): void {
    const items: MediaItem[] = [];
    if (kyc.frontFileUrl) items.push({ url: kyc.frontFileUrl, type: 'image', label: 'Recto' });
    if (kyc.backFileUrl)  items.push({ url: kyc.backFileUrl,  type: 'image', label: 'Verso' });
    if (kyc.selfieFileUrl) items.push({ url: kyc.selfieFileUrl, type: 'image', label: 'Selfie' });
    this.viewerItems.set(items);
    this.viewerIndex.set(Math.min(startIndex, items.length - 1));
    this.viewerOpen.set(true);
  }

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

  deleteKyc(kyc: AdminKycResponse): void {
    if (!confirm(`Supprimer définitivement le dossier KYC de ${kyc.userFullName || 'cet utilisateur'} et ses fichiers MinIO ?`)) {
      return;
    }
    this.deletingId.set(kyc.id);
    this.adminService.deleteKyc(kyc.id).subscribe({
      next: () => {
        this.allList.update(list => list.filter(k => k.id !== kyc.id));
        this.deletingId.set(null);
        this.toast.success(`Dossier de ${kyc.userFullName || 'utilisateur'} supprimé.`);
      },
      error: (err) => {
        this.deletingId.set(null);
        const msg = err?.error?.message ?? 'Erreur lors de la suppression.';
        this.toast.error(msg);
      },
    });
  }
}
