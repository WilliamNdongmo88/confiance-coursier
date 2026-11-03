import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserProfileResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    AppShellComponent, DatePipe, FormsModule,
  ],
  template: `
    <app-shell pageTitle="Utilisateurs">
      <section class="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <p>{{ allUsers().length }} compte(s) au total — clients et coursiers.</p>
        </div>
      </section>

      <!-- Barre de filtres -->
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
        <!-- Tableau desktop -->
        <div class="panel table-panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut KYC</th>
                  <th>Inscription</th>
                  <th>Statut compte</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user.id) {
                  <tr>
                    <td>
                      <div class="user-cell">
                        <div class="u-avatar">{{ user.initials }}</div>
                        <div>
                          <div class="u-name">{{ user.fullName || '—' }}</div>
                          <div class="u-email">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (user.role === 'CLIENT') {
                        <span class="badge badge-primary">{{ user.role }}</span>
                      } @else if (user.role === 'COURIER') {
                        <span class="badge badge-success">{{ user.role }}</span>
                      } @else {
                        <span class="badge badge-warning">{{ user.role }}</span>
                      }
                    </td>
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
                    <td>{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td>
                      @if (user.status === 'ACTIVE') {
                        <span class="status-badge status-badge--success" style="font-size:.73rem">Actif</span>
                      } @else {
                        <span class="status-badge status-badge--neutral" style="font-size:.73rem">Suspendu</span>
                      }
                    </td>
                    <td>
                      <div class="act-cell">
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
                    <td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cartes mobile -->
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
                  <span class="badge badge-primary">{{ user.role }}</span>
                } @else if (user.role === 'COURIER') {
                  <span class="badge badge-success">{{ user.role }}</span>
                }
                {{ user.createdAt | date:'dd/MM/yyyy' }}
              </div>
              <div class="u-card-btns">
                @if (user.status === 'ACTIVE') {
                  <button class="btn btn-danger btn-sm" (click)="suspend(user)">Suspendre</button>
                } @else {
                  <button class="btn btn-primary btn-sm" (click)="activate(user)">Réactiver</button>
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
    </app-shell>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-search {
      flex: 1; min-width: 0; padding: 9px 14px;
      border: 1px solid var(--border); border-radius: 8px;
      background: var(--bg-card); color: var(--text);
      font-size: .9rem; outline: none; box-sizing: border-box;
    }
    .filter-search:focus { border-color: var(--primary); }
    .filter-select { flex-shrink: 0; width: 160px; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }
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
    .mobile-cards { display: none; }
    .u-card { border: 1px solid var(--border); border-radius: 10px; padding: 14px;
      margin-bottom: 10px; background: var(--bg-card); box-sizing: border-box; width: 100%; }
    .u-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .u-card-info { flex: 1; min-width: 0; }
    .u-card-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;
      font-size: .82rem; align-items: center; }
    .u-card-btns { display: flex; gap: 8px; }
    .u-card-btns .btn { flex: 1; justify-content: center; }
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
  private toast = inject(ToastService);

  readonly allUsers = signal<UserProfileResponse[]>([]);
  readonly loading = signal(false);
  readonly searchQuery = signal('');
  readonly roleFilter = signal('');
  readonly statusFilter = signal('');

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();
    return this.allUsers().filter(u => {
      if (query) {
        const name = (u.fullName || '').toLowerCase();
        const email = u.email.toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      if (role && u.role !== role) return false;
      if (status && u.status !== status) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.allUsers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des utilisateurs.');
        this.loading.set(false);
      },
    });
  }

  suspend(user: UserProfileResponse): void {
    this.adminService.suspendUser(user.id).subscribe({
      next: (updated) => {
        this.allUsers.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.toast.success(`${user.fullName || user.email} a été suspendu.`);
      },
      error: () => this.toast.error('Erreur lors de la suspension.'),
    });
  }

  activate(user: UserProfileResponse): void {
    this.adminService.activateUser(user.id).subscribe({
      next: (updated) => {
        this.allUsers.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.toast.success(`${user.fullName || user.email} a été réactivé.`);
      },
      error: () => this.toast.error('Erreur lors de la réactivation.'),
    });
  }
}
