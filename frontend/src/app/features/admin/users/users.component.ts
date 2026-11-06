import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, UserProfileResponse, DisputeResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideX, LucideScale, LucideChevronRight,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, RouterLink,
    LucideX, LucideScale, LucideChevronRight,
  ],
  template: `

      <!-- ── En-tête ── -->
      <section class="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <p>{{ allUsers().length }} compte(s) au total — clients et coursiers.</p>
        </div>
      </section>

      <!-- ── Barre de filtres ── -->
      <div class="filter-bar">
        <input type="search" class="filter-search"
          placeholder="Rechercher un utilisateur…"
          [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
          aria-label="Rechercher">
        <select class="form-select filter-select"
          [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event)"
          aria-label="Filtrer par rôle">
          <option value="">Tous les rôles</option>
          <option value="CLIENT">Clients</option>
          <option value="COURIER">Coursiers</option>
        </select>
        <select class="form-select filter-select"
          [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)"
          aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="SUSPENDED">Suspendus</option>
        </select>
      </div>

      @if (loading()) {
        <p style="text-align:center;padding:40px;color:var(--text-muted)">Chargement…</p>
      } @else {

        <!-- ══════════════════════════════════ TABLEAU DESKTOP ══════════════════════════════════ -->
        <div class="panel table-panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut KYC</th>
                  <th>Inscription</th>
                  <th>Courses</th>
                  <th>Statut compte</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user.id) {
                  <tr>
                    <!-- Utilisateur -->
                    <td>
                      <div class="user-cell">
                        <div class="u-avatar">{{ user.initials }}</div>
                        <div>
                          <div class="u-name">{{ user.fullName || '—' }}</div>
                          <div class="u-email">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <!-- Rôle -->
                    <td>
                      @if (user.role === 'CLIENT') {
                        <span class="badge badge-primary">Client</span>
                      } @else if (user.role === 'COURIER') {
                        <span class="badge badge-success">Coursier</span>
                      } @else {
                        <span class="badge badge-warning">{{ user.role }}</span>
                      }
                    </td>
                    <!-- KYC -->
                    <td>
                      @if (user.kycStatus === 'APPROVED') {
                        <span class="status-badge status-badge--success" style="font-size:.73rem">Approuvé</span>
                      } @else if (user.kycStatus === 'PENDING') {
                        <span class="status-badge status-badge--warning" style="font-size:.73rem">En attente</span>
                      } @else if (user.kycStatus === 'REJECTED') {
                        <span class="status-badge status-badge--danger" style="font-size:.73rem">Refusé</span>
                      } @else {
                        <span style="color:var(--text-muted)">—</span>
                      }
                    </td>
                    <!-- Inscription -->
                    <td>{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
                    <!-- Courses (trustScore utilisé comme proxy — — en attendant un endpoint dédié) -->
                    <td style="color:var(--text-muted);font-size:.85rem">—</td>
                    <!-- Statut compte -->
                    <td>
                      @if (user.status === 'ACTIVE') {
                        <span class="status-badge status-badge--success" style="font-size:.73rem">Actif</span>
                      } @else {
                        <span class="status-badge status-badge--neutral" style="font-size:.73rem">Suspendu</span>
                      }
                    </td>
                    <!-- Actions -->
                    <td>
                      <div class="act-cell">
                        <button class="btn btn-secondary btn-sm" (click)="openModal(user)">Voir</button>
                        @if (user.status === 'ACTIVE') {
                          <button class="btn btn-danger btn-sm" (click)="suspend(user)">Suspendre</button>
                        } @else {
                          <button class="btn btn-primary btn-sm" (click)="activate(user)">Réactiver</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- ══════════════════════════════════ CARTES MOBILE ══════════════════════════════════ -->
        <div class="mobile-cards">
          @for (user of filteredUsers(); track user.id) {
            <div class="u-card">
              <div class="u-card-head">
                <div class="u-avatar">{{ user.initials }}</div>
                <div class="u-card-info">
                  <div class="u-name">{{ user.fullName || '—' }}</div>
                  <div class="u-email">{{ user.email }}</div>
                </div>
                @if (user.status === 'ACTIVE') {
                  <span class="status-badge status-badge--success" style="font-size:.73rem">Actif</span>
                } @else {
                  <span class="status-badge status-badge--neutral" style="font-size:.73rem">Suspendu</span>
                }
              </div>
              <div class="u-card-meta">
                @if (user.role === 'CLIENT') {
                  <span class="badge badge-primary">Client</span>
                } @else if (user.role === 'COURIER') {
                  <span class="badge badge-success">Coursier</span>
                }
                @if (user.kycStatus === 'APPROVED') {
                  <span class="status-badge status-badge--success" style="font-size:.73rem">KYC ✓</span>
                } @else if (user.kycStatus === 'PENDING') {
                  <span class="status-badge status-badge--warning" style="font-size:.73rem">KYC en attente</span>
                }
                <span class="u-card-note">{{ user.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="u-card-btns">
                <button class="btn btn-secondary btn-sm" style="flex:1" (click)="openModal(user)">Voir</button>
                @if (user.status === 'ACTIVE') {
                  <button class="btn btn-danger btn-sm" style="flex:1" (click)="suspend(user)">Suspendre</button>
                } @else {
                  <button class="btn btn-primary btn-sm" style="flex:1" (click)="activate(user)">Réactiver</button>
                }
              </div>
            </div>
          } @empty {
            <div style="text-align:center;padding:30px;color:var(--text-muted)">
              Aucun utilisateur trouvé.
            </div>
          }
        </div>
      }

    <!-- ══════════════════════════════════ MODALE DÉTAIL ══════════════════════════════════ -->
    @if (modalOpen() && selectedUser()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-box">

          <!-- Bouton fermer -->
          <button class="modal-close" type="button" aria-label="Fermer" (click)="closeModal()">
            <svg lucideX size="18"></svg>
          </button>

          <!-- ── Profil ── -->
          <div class="m-profile">
            <div class="m-avatar">{{ selectedUser()!.initials }}</div>
            <h2 class="m-name">{{ selectedUser()!.fullName || selectedUser()!.email }}</h2>
            <p class="m-email">{{ selectedUser()!.email }}</p>
            @if (selectedUser()!.status === 'ACTIVE') {
              <span class="m-status-badge m-status-active">Actif</span>
            } @else {
              <span class="m-status-badge m-status-suspended">Suspendu</span>
            }
          </div>

          <!-- ── Stats 2×2 ── -->
          <div class="m-stats-grid">
            <div class="m-stat-box">
              <div class="m-stat-value">
                @if (selectedUser()!.role === 'CLIENT') { Client }
                @else if (selectedUser()!.role === 'COURIER') { Coursier }
                @else { {{ selectedUser()!.role }} }
              </div>
              <div class="m-stat-label">Rôle</div>
            </div>
            <div class="m-stat-box">
              <div class="m-stat-value m-stat-star">
                @if (selectedUser()!.trustScore > 0) {
                  ⭐ {{ selectedUser()!.trustScore | number:'1.1-1' }}
                } @else {
                  —
                }
              </div>
              <div class="m-stat-label">Note moyenne</div>
            </div>
            <div class="m-stat-box">
              <div class="m-stat-value">
                {{ selectedUser()!.city || selectedUser()!.country || '—' }}
              </div>
              <div class="m-stat-label">Ville</div>
            </div>
            <div class="m-stat-box">
              <div class="m-stat-value">{{ userDisputes().length }}</div>
              <div class="m-stat-label">Litiges</div>
            </div>
          </div>

          <!-- ── Litiges liés ── -->
          @if (userDisputes().length > 0) {
            <div class="m-litiges">
              <h4>
                <svg lucideScale size="17" style="color:var(--danger)"></svg>
                Litiges liés à cet utilisateur
              </h4>
              @for (dispute of userDisputes(); track dispute.id) {
                <a routerLink="/admin/disputes" class="m-litige-item" (click)="closeModal()">
                  <div class="m-litige-info">
                    <h5>Litige #{{ dispute.id }} — {{ dispute.motifCode }}</h5>
                    <p>Course #{{ dispute.courseId }} · {{ dispute.createdAt | date:'dd/MM/yyyy' }}</p>
                  </div>
                  <svg lucideChevronRight size="18" style="color:var(--text-muted);flex-shrink:0"></svg>
                </a>
              }
            </div>
          }

          <!-- ── Footer ── -->
          <div class="m-actions">
            <button class="btn btn-secondary" type="button" (click)="closeModal()">Fermer</button>
            @if (selectedUser()!.status === 'ACTIVE') {
              <button class="btn btn-danger" type="button"
                      (click)="suspendFromModal()">
                Suspendre
              </button>
            } @else {
              <button class="btn btn-primary" type="button"
                      (click)="activateFromModal()">
                Réactiver
              </button>
            }
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Filtres ── */
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-search {
      flex: 1; min-width: 0; padding: 9px 14px;
      border: 1px solid var(--border); border-radius: 8px;
      background: var(--bg-card); color: var(--text);
      font-size: .9rem; outline: none; box-sizing: border-box;
    }
    .filter-search:focus { border-color: var(--primary); }
    .filter-select { flex-shrink: 0; width: 160px; }

    /* ── Tableau ── */
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
    table { width: 100%; border-collapse: collapse; min-width: 640px; }
    th {
      font-size: .82rem; color: var(--text-muted); font-weight: 600;
      padding: 10px 12px; border-bottom: 1px solid var(--border);
      white-space: nowrap; text-align: left;
    }
    td {
      padding: 12px 12px; border-bottom: 1px solid var(--border);
      font-size: .88rem; color: var(--text); vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg); }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .u-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: .82rem; flex-shrink: 0;
    }
    .u-name { font-weight: 600; font-size: .88rem; color: var(--text); }
    .u-email { font-size: .75rem; color: var(--text-muted); }
    .act-cell { display: flex; gap: 6px; flex-wrap: nowrap; }

    /* ── Cartes mobile ── */
    .mobile-cards { display: none; }
    .u-card {
      border: 1px solid var(--border); border-radius: 10px; padding: 14px;
      margin-bottom: 10px; background: var(--bg-card); box-sizing: border-box; width: 100%;
    }
    .u-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .u-card-info { flex: 1; min-width: 0; }
    .u-card-meta {
      display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;
      font-size: .82rem; align-items: center;
    }
    .u-card-note { font-size: .78rem; color: var(--text-muted); }
    .u-card-btns { display: flex; gap: 8px; }

    /* ── Modale overlay ── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(16, 38, 29, 0.55);
      z-index: 9100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      animation: mo-fade .18s ease;
    }
    @keyframes mo-fade { from { opacity: 0; } to { opacity: 1; } }

    .modal-box {
      width: min(480px, 100%);
      background: var(--bg-card);
      border-radius: 16px;
      padding: 32px 24px 24px;
      box-shadow: 0 28px 80px rgba(16, 38, 29, 0.25);
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      animation: mo-slide .2s ease;
    }
    @keyframes mo-slide {
      from { transform: translateY(14px) scale(.97); opacity: 0; }
      to   { transform: translateY(0)     scale(1);   opacity: 1; }
    }

    .modal-close {
      position: absolute; top: 14px; right: 14px;
      border: 0; background: transparent; color: var(--text-muted);
      cursor: pointer; padding: 6px; border-radius: 50%;
      display: grid; place-items: center; transition: background .15s;
    }
    .modal-close:hover { background: var(--bg); }

    /* ── Profil ── */
    .m-profile { text-align: center; margin-bottom: 24px; }
    .m-avatar {
      width: 84px; height: 84px; border-radius: 50%;
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 2rem; margin: 0 auto 12px;
    }
    .m-name { font-size: 1.25rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
    .m-email { font-size: .9rem; color: var(--text-muted); margin-bottom: 12px; }
    .m-status-badge {
      display: inline-block; padding: 5px 14px;
      border-radius: 20px; font-size: .8rem; font-weight: 700;
    }
    .m-status-active    { background: var(--success-light); color: var(--success); }
    .m-status-suspended { background: var(--warning-light); color: var(--warning); }

    /* ── Stats 2×2 ── */
    .m-stats-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 12px; margin-bottom: 24px;
    }
    .m-stat-box {
      background: var(--bg); border-radius: 12px;
      padding: 16px; text-align: center;
    }
    .m-stat-value {
      font-size: 1.1rem; font-weight: 800; color: var(--text);
      margin-bottom: 4px; min-height: 1.4em;
    }
    .m-stat-star { color: #F59E0B; }
    .m-stat-label {
      font-size: .7rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: .05em;
    }

    /* ── Litiges ── */
    .m-litiges {
      border-top: 1px solid var(--border);
      padding-top: 20px; margin-bottom: 24px;
    }
    .m-litiges h4 {
      font-size: .95rem; font-weight: 700; color: var(--text);
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .m-litige-item {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
      padding: 14px; cursor: pointer; text-decoration: none;
      transition: border-color .15s, background .15s; margin-bottom: 8px;
    }
    .m-litige-item:hover { border-color: var(--primary); background: var(--primary-light); }
    .m-litige-info h5 { font-size: .88rem; font-weight: 700; color: var(--text); margin-bottom: 2px; }
    .m-litige-info p  { font-size: .78rem; color: var(--text-muted); }

    /* ── Footer ── */
    .m-actions { display: flex; gap: 10px; }
    .m-actions .btn { flex: 1; justify-content: center; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .filter-bar { flex-direction: column; }
      .filter-search, .filter-select { width: 100%; }
      .table-panel { display: none !important; }
      .mobile-cards { display: block; }
    }
  `],
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast        = inject(ToastService);

  readonly allUsers    = signal<UserProfileResponse[]>([]);
  readonly allDisputes = signal<DisputeResponse[]>([]);
  readonly loading     = signal(false);

  // ─── Filtres ────────────────────────────────────────────────────────────────
  readonly searchQuery  = signal('');
  readonly roleFilter   = signal('');
  readonly statusFilter = signal('');

  readonly filteredUsers = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const role   = this.roleFilter();
    const status = this.statusFilter();
    return this.allUsers().filter(u => {
      if (q) {
        const name  = (u.fullName || '').toLowerCase();
        const email = u.email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (role   && u.role   !== role)   return false;
      if (status && u.status !== status) return false;
      return true;
    });
  });

  // ─── Modale ─────────────────────────────────────────────────────────────────
  readonly modalOpen    = signal(false);
  readonly selectedUser = signal<UserProfileResponse | null>(null);

  /** Litiges impliquant l'utilisateur sélectionné */
  readonly userDisputes = computed<DisputeResponse[]>(() => {
    const user = this.selectedUser();
    if (!user) return [];
    return this.allDisputes().filter(
      d => d.openedBy === user.id || d.courseId === user.id   // openedBy suffit en pratique
    );
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getUsers().subscribe({
      next: (data) => { this.allUsers.set(data); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement utilisateurs.'); this.loading.set(false); },
    });
    // Charge tous les litiges pour la modale (best-effort, silencieux si échec)
    this.adminService.getDisputes().subscribe({
      next: (data) => this.allDisputes.set(data),
      error: () => {},
    });
  }

  // ─── Modale ─────────────────────────────────────────────────────────────────
  openModal(user: UserProfileResponse): void {
    this.selectedUser.set(user);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedUser.set(null);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
  }

  // ─── Actions tableau ────────────────────────────────────────────────────────
  suspend(user: UserProfileResponse): void {
    this.adminService.suspendUser(user.id).subscribe({
      next: (updated) => {
        this._updateUser(updated);
        this.toast.success(`${user.fullName || user.email} suspendu.`);
      },
      error: () => this.toast.error('Erreur lors de la suspension.'),
    });
  }

  activate(user: UserProfileResponse): void {
    this.adminService.activateUser(user.id).subscribe({
      next: (updated) => {
        this._updateUser(updated);
        this.toast.success(`${user.fullName || user.email} réactivé.`);
      },
      error: () => this.toast.error('Erreur lors de la réactivation.'),
    });
  }

  // ─── Actions depuis la modale ────────────────────────────────────────────────
  suspendFromModal(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.adminService.suspendUser(user.id).subscribe({
      next: (updated) => {
        this._updateUser(updated);
        this.selectedUser.set(updated);
        this.toast.success(`${user.fullName || user.email} suspendu.`);
      },
      error: () => this.toast.error('Erreur lors de la suspension.'),
    });
  }

  activateFromModal(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.adminService.activateUser(user.id).subscribe({
      next: (updated) => {
        this._updateUser(updated);
        this.selectedUser.set(updated);
        this.toast.success(`${user.fullName || user.email} réactivé.`);
      },
      error: () => this.toast.error('Erreur lors de la réactivation.'),
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  private _updateUser(updated: UserProfileResponse): void {
    this.allUsers.update(list => list.map(u => u.id === updated.id ? updated : u));
  }
}
