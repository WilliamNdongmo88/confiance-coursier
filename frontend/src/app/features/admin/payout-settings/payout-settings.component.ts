import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService, PayoutSettingsResponse, UpdatePayoutSettingsRequest
} from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideCreditCard, LucideSmartphone, LucideBuilding2,
  LucideSave, LucideShieldCheck,
} from '@lucide/angular';

type PayoutMethod = 'MTN' | 'ORANGE' | 'BANK';

@Component({
  selector: 'app-admin-payout-settings',
  standalone: true,
  imports: [
    FormsModule,
    LucideCreditCard, LucideSmartphone, LucideBuilding2,
    LucideSave, LucideShieldCheck,
  ],
  template: `

      <!-- ── En-tête ── -->
      <section class="page-head">
        <div>
          <h1>Paramètres de reversement</h1>
          <p>Configurez vos coordonnées pour recevoir les gains de la plateforme.</p>
        </div>
      </section>

      <!-- ── Notice de sécurité ── -->
      <div class="app-notice" style="margin-bottom:22px">
        <svg lucideShieldCheck size="16"></svg>
        <div>
          <strong>Ces données restent sur votre plateforme</strong>
          <span>
            Aucune information bancaire ou Mobile Money n'est transmise à un prestataire externe.
            Elles servent uniquement de référence pour vos reversements manuels.
          </span>
        </div>
      </div>

      @if (loading()) {
        <p style="text-align:center;padding:60px;color:var(--text-muted)">Chargement…</p>
      } @else {

        <!-- ── Méthode préférée ── -->
        <div class="payout-card">
          <div class="payout-card-header">
            <div class="payout-icon" style="background:#e4f1e8;color:#17634f">
              <svg lucideCreditCard size="20"></svg>
            </div>
            <div>
              <h2>Méthode préférée</h2>
              <p>Canal prioritaire pour le reversement de vos gains.</p>
            </div>
          </div>
          <div class="method-selector">
            <label class="method-opt" [class.selected]="preferredMethod() === 'MTN'"
                   (click)="preferredMethod.set('MTN')">
              <div class="method-logo mtn">MTN</div>
              <span>MTN Mobile Money</span>
            </label>
            <label class="method-opt" [class.selected]="preferredMethod() === 'ORANGE'"
                   (click)="preferredMethod.set('ORANGE')">
              <div class="method-logo orange">OM</div>
              <span>Orange Money</span>
            </label>
            <label class="method-opt" [class.selected]="preferredMethod() === 'BANK'"
                   (click)="preferredMethod.set('BANK')">
              <div class="method-logo bank">
                <svg lucideBuilding2 size="18"></svg>
              </div>
              <span>Virement bancaire</span>
            </label>
          </div>
        </div>

        <!-- ── MTN Mobile Money ── -->
        <div class="payout-card">
          <div class="payout-card-header">
            <div class="payout-icon" style="background:#fff8e1;color:#f9a825">
              <svg lucideSmartphone size="20"></svg>
            </div>
            <div>
              <h2>MTN Mobile Money</h2>
              <p>Numéro de compte MTN MoMo sur lequel recevoir les paiements.</p>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Numéro MTN MoMo</label>
              <input type="tel" class="form-input" placeholder="+237 6XX XXX XXX"
                     [(ngModel)]="mtnNumber" maxlength="30">
            </div>
            <div class="form-group">
              <label class="form-label">Nom du compte</label>
              <input type="text" class="form-input" placeholder="Nom affiché sur le compte"
                     [(ngModel)]="mtnName" maxlength="100">
            </div>
          </div>
        </div>

        <!-- ── Orange Money ── -->
        <div class="payout-card">
          <div class="payout-card-header">
            <div class="payout-icon" style="background:#fff3e0;color:#e65100">
              <svg lucideSmartphone size="20"></svg>
            </div>
            <div>
              <h2>Orange Money</h2>
              <p>Numéro de compte Orange Money sur lequel recevoir les paiements.</p>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Numéro Orange Money</label>
              <input type="tel" class="form-input" placeholder="+237 6XX XXX XXX"
                     [(ngModel)]="orangeNumber" maxlength="30">
            </div>
            <div class="form-group">
              <label class="form-label">Nom du compte</label>
              <input type="text" class="form-input" placeholder="Nom affiché sur le compte"
                     [(ngModel)]="orangeName" maxlength="100">
            </div>
          </div>
        </div>

        <!-- ── Virement bancaire ── -->
        <div class="payout-card">
          <div class="payout-card-header">
            <div class="payout-icon" style="background:#f0f3ef;color:#6d7a71">
              <svg lucideBuilding2 size="20"></svg>
            </div>
            <div>
              <h2>Virement bancaire</h2>
              <p>Coordonnées bancaires pour les virements directs.</p>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">IBAN / RIB</label>
            <input type="text" class="form-input" placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX"
                   [(ngModel)]="bankIban" maxlength="50">
          </div>
          <div class="form-row" style="margin-top:0">
            <div class="form-group">
              <label class="form-label">Nom de la banque</label>
              <input type="text" class="form-input" placeholder="Ex : Banque Atlantique"
                     [(ngModel)]="bankName" maxlength="100">
            </div>
            <div class="form-group">
              <label class="form-label">Titulaire du compte</label>
              <input type="text" class="form-input" placeholder="Nom du titulaire"
                     [(ngModel)]="bankAccountName" maxlength="100">
            </div>
          </div>
        </div>

        <!-- ── Bouton sauvegarder ── -->
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:4px"
                (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner"></span>
          } @else {
            <svg lucideSave size="17"></svg>
          }
          Enregistrer les coordonnées
        </button>

      }
  `,
  styles: [`
    /* ── Cartes de section ── */
    .payout-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 22px;
      margin-bottom: 18px; box-sizing: border-box; width: 100%;
    }
    .payout-card-header {
      display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px;
    }
    .payout-icon {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .payout-card-header h2 {
      font-size: .98rem; font-weight: 700; color: var(--text); margin-bottom: 3px;
    }
    .payout-card-header p {
      font-size: .82rem; color: var(--text-muted); line-height: 1.5; margin: 0;
    }

    /* ── Sélecteur méthode ── */
    .method-selector {
      display: flex; gap: 12px; flex-wrap: wrap;
    }
    .method-opt {
      flex: 1; min-width: 120px; display: flex; flex-direction: column;
      align-items: center; gap: 8px; padding: 14px 12px;
      border: 2px solid var(--border); border-radius: var(--radius-md);
      cursor: pointer; transition: border-color .15s, background .15s;
      text-align: center; font-size: .85rem; color: var(--text-muted);
      font-weight: 600;
    }
    .method-opt:hover { border-color: var(--primary); }
    .method-opt.selected {
      border-color: var(--primary); background: var(--primary-light);
      color: var(--primary);
    }
    .method-logo {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: .85rem;
    }
    .method-logo.mtn    { background: #ffd600; color: #333; }
    .method-logo.orange { background: #ff6600; color: #fff; }
    .method-logo.bank   { background: var(--bg); color: var(--text-muted);
                          border: 1px solid var(--border); }

    /* ── Ligne de formulaire en 2 colonnes ── */
    .form-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 0;
    }

    /* ── Spinner ── */
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff; border-radius: 50%;
      display: inline-block; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .method-selector { flex-direction: column; }
      .method-opt { flex-direction: row; justify-content: flex-start; padding: 12px 14px; }
    }
  `],
})
export class AdminPayoutSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast        = inject(ToastService);

  readonly loading = signal(false);
  readonly saving  = signal(false);

  // Champs du formulaire (two-way binding)
  mtnNumber        = '';
  mtnName          = '';
  orangeNumber     = '';
  orangeName       = '';
  bankIban         = '';
  bankName         = '';
  bankAccountName  = '';
  preferredMethod  = signal<PayoutMethod>('MTN');

  ngOnInit(): void {
    this.loading.set(true);
    this.adminService.getPayoutSettings().subscribe({
      next: (s: PayoutSettingsResponse) => {
        this.mtnNumber       = s.mtnNumber       ?? '';
        this.mtnName         = s.mtnName         ?? '';
        this.orangeNumber    = s.orangeNumber    ?? '';
        this.orangeName      = s.orangeName      ?? '';
        this.bankIban        = s.bankIban        ?? '';
        this.bankName        = s.bankName        ?? '';
        this.bankAccountName = s.bankAccountName ?? '';
        if (s.preferredMethod === 'MTN' || s.preferredMethod === 'ORANGE'
            || s.preferredMethod === 'BANK') {
          this.preferredMethod.set(s.preferredMethod);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des paramètres.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.saving.set(true);
    const req: UpdatePayoutSettingsRequest = {
      mtnNumber:       this.mtnNumber       || undefined,
      mtnName:         this.mtnName         || undefined,
      orangeNumber:    this.orangeNumber    || undefined,
      orangeName:      this.orangeName      || undefined,
      bankIban:        this.bankIban        || undefined,
      bankName:        this.bankName        || undefined,
      bankAccountName: this.bankAccountName || undefined,
      preferredMethod: this.preferredMethod(),
    };
    this.adminService.updatePayoutSettings(req).subscribe({
      next: () => {
        this.toast.success('Coordonnées enregistrées.');
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors de la sauvegarde.');
        this.saving.set(false);
      },
    });
  }
}
