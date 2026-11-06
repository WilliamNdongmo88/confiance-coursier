import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, CommissionSettings } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucidePercent, LucideUser, LucideBike,
  LucideSettings2, LucideSave, LucideAlertTriangle,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-commissions',
  standalone: true,
  imports: [
    FormsModule,
    LucidePercent, LucideUser, LucideBike,
    LucideSettings2, LucideSave, LucideAlertTriangle,
  ],
  template: `
      <section class="page-head">
        <div>
          <h1>Taux de commission</h1>
          <p>Configurez les frais prélevés sur chaque transaction.</p>
        </div>
      </section>

      <div class="warning-banner">
        <span class="warning-banner-icon"><svg lucideAlertTriangle size="18"></svg></span>
        <div class="warning-banner-body">
          <strong>Attention</strong>
          <p>Toute modification prend effet immédiatement sur les nouvelles courses. Les courses en cours ne sont pas affectées.</p>
        </div>
      </div>

      @if (loading()) {
        <p style="text-align:center;padding:40px;color:var(--text-muted)">Chargement…</p>
      } @else {
        <!-- Frais client -->
        <div class="rate-card">
          <div class="rate-card-header">
            <div class="rate-icon"><svg lucideUser size="20"></svg></div>
            <div>
              <h2>Frais de service — Client</h2>
              <p>Prélevés sur le montant total payé par le client. Peut être mis à 0%.</p>
            </div>
          </div>
          <div class="rate-preview">
            <svg lucidePercent size="18" style="color:var(--primary)"></svg>
            Taux actuel : <strong>{{ clientRate() }}%</strong>
          </div>
          <div class="rate-input-group">
            <input type="range" min="0" max="10" step="0.5"
              [ngModel]="clientRate()" (ngModelChange)="clientRate.set($event)"
              aria-label="Taux client">
            <input type="number" min="0" max="10" step="0.5"
              [ngModel]="clientRate()" (ngModelChange)="clientRate.set($event)"
              aria-label="Valeur taux client">
            <span style="color:var(--text-muted);font-size:.9rem">%</span>
          </div>
        </div>

        <!-- Frais coursier -->
        <div class="rate-card">
          <div class="rate-card-header">
            <div class="rate-icon" style="background:var(--warning-light);color:var(--warning)">
              <svg lucideBike size="20"></svg>
            </div>
            <div>
              <h2>Frais de service — Coursier</h2>
              <p>Prélevés sur le tarif brut du coursier avant versement.</p>
            </div>
          </div>
          <div class="rate-preview">
            <svg lucidePercent size="18" style="color:var(--warning)"></svg>
            Taux actuel : <strong style="color:var(--warning)">{{ courierRate() }}%</strong>
          </div>
          <div class="rate-input-group">
            <input type="range" min="0" max="40" step="1"
              [ngModel]="courierRate()" (ngModelChange)="courierRate.set($event)"
              aria-label="Taux coursier">
            <input type="number" min="0" max="40" step="1"
              [ngModel]="courierRate()" (ngModelChange)="courierRate.set($event)"
              aria-label="Valeur taux coursier">
            <span style="color:var(--text-muted);font-size:.9rem">%</span>
          </div>
        </div>

        <!-- Tarif minimum -->
        <div class="rate-card">
          <div class="rate-card-header">
            <div class="rate-icon" style="background:#e5f1e8;color:#17634f">
              <svg lucideSettings2 size="20"></svg>
            </div>
            <div>
              <h2>Paramètres généraux</h2>
              <p>Règles métier applicables à toute la plateforme.</p>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tarif minimum d'un coursier (XAF)</label>
            <input type="number" class="form-input" min="0" step="500"
              [ngModel]="minTarif()" (ngModelChange)="minTarif.set($event)">
            <p class="form-hint">Le coursier ne pourra pas soumettre une offre en dessous de ce montant.</p>
          </div>
        </div>

        <!-- Simulation -->
        <h2 style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:14px">
          Simulation sur une course exemple
        </h2>
        <div class="simulation">
          <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">
            Frais réels : 15 000 XAF · Tarif coursier brut : 6 250 XAF
          </p>
          <div class="sim-row"><span>Frais réels :</span><span>15 000 XAF</span></div>
          <div class="sim-row"><span>Tarif coursier :</span><span>6 250 XAF</span></div>
          @if (clientRate() > 0) {
            <div class="sim-row">
              <span>Frais service client ({{ clientRate() }}%) :</span>
              <span>{{ formatXaf(fraisClientSim()) }}</span>
            </div>
          }
          <div class="sim-row total">
            <span>Total payé par le client :</span>
            <span>{{ formatXaf(totalClientSim()) }}</span>
          </div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
            <div class="sim-row"><span>Tarif brut coursier :</span><span>6 250 XAF</span></div>
            <div class="sim-row">
              <span>Commission plateforme ({{ courierRate() }}%) :</span>
              <span>{{ formatXaf(commissionSim()) }}</span>
            </div>
            <div class="sim-row total">
              <span>Net versé au coursier :</span>
              <span style="color:var(--success)">{{ formatXaf(netCoursierSim()) }}</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" style="width:100%" (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner"></span>
          } @else {
            <svg lucideSave size="17"></svg>
          }
          Enregistrer les taux et paramètres
        </button>
      }
  `,
  styles: [`
    /* ── Bannière avertissement ── */
    .warning-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #fff3dc;
      border: 1px solid rgba(166,107,22,.25);
      border-radius: var(--radius-md, 10px);
      padding: 14px 16px;
      margin-bottom: 22px;
    }
    .warning-banner-icon {
      color: #a66b16;
      flex-shrink: 0;
      margin-top: 1px;
      display: flex;
    }
    .warning-banner-body strong {
      display: block;
      font-size: .9rem;
      font-weight: 700;
      color: #5a3e10;
      margin-bottom: 3px;
    }
    .warning-banner-body p {
      margin: 0;
      font-size: .84rem;
      color: #6b5530;
      line-height: 1.5;
    }

    :host-context([data-theme="dark"]) .warning-banner {
      background: #2d2008;
      border-color: rgba(253,230,138,.2);
    }
    :host-context([data-theme="dark"]) .warning-banner-icon { color: #fcd34d; }
    :host-context([data-theme="dark"]) .warning-banner-body strong { color: #fef3c7; }
    :host-context([data-theme="dark"]) .warning-banner-body p { color: #fde68a; }
    .rate-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 22px;
      margin-bottom: 18px; box-sizing: border-box; width: 100%;
    }
    .rate-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
    .rate-icon {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      background: var(--primary-light); color: var(--primary);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .rate-card-header h2 { font-size: .98rem; font-weight: 700; color: var(--text); margin-bottom: 3px; }
    .rate-card-header p { font-size: .82rem; color: var(--text-muted); line-height: 1.5; }
    .rate-preview {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
      padding: 12px 16px; background: var(--bg);
      border-radius: var(--radius-md); font-size: .95rem; flex-wrap: wrap;
    }
    .rate-preview strong { font-size: 1.4rem; font-weight: 800; color: var(--primary); }
    .rate-input-group { display: flex; align-items: center; gap: 10px; }
    .rate-input-group input[type="range"] { flex: 1; accent-color: var(--primary); min-width: 0; }
    .rate-input-group input[type="number"] {
      width: 64px; padding: 8px; border: 1px solid var(--border);
      border-radius: var(--radius-md); font-size: .95rem; font-weight: 700;
      text-align: center; color: var(--text); background: var(--bg-card); flex-shrink: 0;
    }
    .simulation {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px;
      margin-bottom: 22px; box-sizing: border-box; width: 100%;
    }
    .sim-row {
      display: flex; justify-content: space-between; margin-bottom: 8px;
      font-size: .9rem; color: var(--text-muted); gap: 8px;
    }
    .sim-row span:last-child { text-align: right; flex-shrink: 0; }
    .sim-row.total {
      font-weight: 700; color: var(--text);
      border-top: 1px dashed var(--border); padding-top: 10px;
      margin-top: 10px; font-size: .98rem;
    }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff; border-radius: 50%;
      display: inline-block; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) {
      .rate-input-group { width: 100%; }
      .rate-input-group input[type="range"] { width: 0; flex: 1; min-width: 0; }
    }
  `],
})
export class AdminCommissionsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly clientRate = signal(0);
  readonly courierRate = signal(20);
  readonly minTarif = signal(0); // valeur réelle chargée depuis /api/admin/commissions (TICK-070)
  readonly loading = signal(false);
  readonly saving = signal(false);

  // Simulation constants
  private readonly SIM_FRAIS_REELS = 15000;
  private readonly SIM_TARIF_BRUT = 6250;

  readonly fraisClientSim = computed(() =>
    Math.round((this.SIM_FRAIS_REELS + this.SIM_TARIF_BRUT) * this.clientRate() / 100)
  );
  readonly totalClientSim = computed(() =>
    this.SIM_FRAIS_REELS + this.SIM_TARIF_BRUT + this.fraisClientSim()
  );
  readonly commissionSim = computed(() =>
    Math.round(this.SIM_TARIF_BRUT * this.courierRate() / 100)
  );
  readonly netCoursierSim = computed(() =>
    this.SIM_TARIF_BRUT - this.commissionSim()
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.adminService.getCommissions().subscribe({
      next: (settings) => {
        this.clientRate.set(settings.commissionRateClient);
        this.courierRate.set(settings.commissionRateCourier);
        this.minTarif.set(settings.tarifMinimumCoursier);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des commissions.');
        this.loading.set(false);
      },
    });
  }

  formatXaf(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' XAF';
  }

  save(): void {
    this.saving.set(true);
    this.adminService.updateCommissions({
      commissionRateClient: this.clientRate(),
      commissionRateCourier: this.courierRate(),
      tarifMinimumCoursier: this.minTarif(),
    }).subscribe({
      next: (settings) => {
        this.clientRate.set(settings.commissionRateClient);
        this.courierRate.set(settings.commissionRateCourier);
        this.minTarif.set(settings.tarifMinimumCoursier);
        this.toast.success('Taux et paramètres mis à jour.');
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors de la sauvegarde.');
        this.saving.set(false);
      },
    });
  }
}
