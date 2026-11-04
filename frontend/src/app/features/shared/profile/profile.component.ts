import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideArrowLeft,
  LucideLock,
  LucideSave,
  LucideShieldCheck,
  LucideShieldAlert,
  LucideClock,
  LucideXCircle,
  LucideCheckCircle2,
} from '@lucide/angular';

interface UserProfile {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  country: string | null;
  city: string | null;
  status: string;
  trustScore: number | null;
  badge: string | null;
  kycStatus: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    NgIf,
    AppShellComponent,
    LucideArrowLeft,
    LucideLock,
    LucideSave,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideClock,
    LucideXCircle,
    LucideCheckCircle2,
  ],
  styles: [`
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 22px;
      margin-bottom: 28px;
      padding-bottom: 26px;
      border-bottom: 1px solid #e1e8e0;
    }
    .avatar-lg {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #e8f5ef;
      color: #123b32;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.8rem;
      flex-shrink: 0;
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .section-title {
      font-size: .95rem;
      font-weight: 700;
      color: #123b32;
      margin-bottom: 12px;
    }
    @media (max-width: 640px) {
      .avatar-section { flex-direction: column; text-align: center; gap: 14px; }
      .profile-grid   { grid-template-columns: 1fr; gap: 0; }
    }
    [data-theme="dark"] .avatar-section { border-bottom-color: #2e4037; }
    [data-theme="dark"] .avatar-lg { background: #1e3029; color: #d7ed9a; }
    [data-theme="dark"] hr { border-top-color: #2e4037 !important; }
    /* ── Bannière KYC (même style que courier/dashboard) ── */
    .kyc-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
      border: 1px solid #b45309;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(120, 53, 15, .25);
      flex-wrap: wrap;
    }
    .kyc-banner__icon-wrap {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255,255,255,.15);
      color: #fde68a;
      flex-shrink: 0;
    }
    .kyc-banner__body { flex: 1; min-width: 160px; }
    .kyc-banner__title {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 2px;
    }
    .kyc-banner__desc {
      margin: 0;
      font-size: 12px;
      color: #fde68a;
      line-height: 1.4;
    }
    .kyc-banner__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fde68a;
      color: #78350f;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    .kyc-banner__cta:hover { background: #fef3c7; transform: translateY(-1px); }
    @media (max-width: 560px) {
      .kyc-banner__body { min-width: unset; width: 100%; }
      .kyc-banner__cta  { width: 100%; justify-content: center; }
    }
  `],
  template: `
<app-shell [pageTitle]="isCourier ? 'Mon profil coursier' : 'Mon profil'">
  <div class="page-head" style="margin-bottom: 24px;">
    <div>
      <h1>{{ isCourier ? 'Mon profil coursier' : 'Mon profil' }}</h1>
      <p>{{ isCourier ? 'Gérez vos coordonnées et préférences de mission.' : 'Gérez vos informations personnelles.' }}</p>
    </div>
    <a [routerLink]="isCourier ? '/courier/dashboard' : '/client/dashboard'" class="btn btn-secondary btn-sm">
      <svg lucideArrowLeft size="15"></svg> Retour
    </a>
  </div>

  <!-- Chargement -->
  <div *ngIf="isLoading()" style="text-align:center; padding: 40px 0;">
    <span class="spinner" style="width:28px; height:28px; border-width:3px; display:inline-block;"></span>
    <p class="text-muted text-sm" style="margin-top:12px;">Chargement du profil…</p>
  </div>

  <!-- Formulaire -->
  <div *ngIf="!isLoading() && profile()" class="card">

    <!-- Section avatar -->
    <div class="avatar-section">
      <div class="avatar-lg">{{ profile()!.initials }}</div>
      <div>
        <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:4px;">
          {{ profile()!.fullName ?? profile()!.email }}
        </h3>
        <p class="text-sm text-muted" style="margin-bottom: 8px;">
          <ng-container *ngIf="profile()!.trustScore !== null && (profile()!.trustScore ?? 0) > 0">
            ⭐ {{ profile()!.trustScore?.toFixed(1) }} / 5 ·
          </ng-container>
          {{ profile()!.role === 'COURIER' ? 'Compte coursier' : 'Compte client' }}
        </p>
        <!-- Badge KYC pour coursier -->
        <ng-container *ngIf="isCourier">
          <span *ngIf="profile()!.kycStatus === 'APPROVED'" class="badge badge-success">
            <svg lucideShieldCheck size="12" style="display:inline;vertical-align:middle;margin-right:3px;"></svg>
            Identité vérifiée
          </span>
          <span *ngIf="profile()!.kycStatus === 'PENDING'" class="badge badge-warning">
            <svg lucideClock size="12" style="display:inline;vertical-align:middle;margin-right:3px;"></svg>
            KYC en attente
          </span>
          <span *ngIf="profile()!.kycStatus === 'REJECTED'" class="badge badge-danger">
            <svg lucideXCircle size="12" style="display:inline;vertical-align:middle;margin-right:3px;"></svg>
            KYC rejeté
          </span>
          <span *ngIf="profile()!.kycStatus === 'NONE'" class="badge" style="background:#f7f8f5; color:#8a9490; border:1px solid #e1e8e0;">
            <svg lucideShieldAlert size="12" style="display:inline;vertical-align:middle;margin-right:3px;"></svg>
            KYC non soumis
          </span>
        </ng-container>      </div>
    </div>

    <!-- Nom complet -->
    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="fullName">Nom complet</label>
      <input id="fullName" type="text" class="form-input"
             [value]="fullName" (input)="fullName = getVal($event)"
             placeholder="Votre nom complet">
    </div>

    <!-- Email + Téléphone -->
    <div class="profile-grid" style="margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input id="email" type="email" class="form-input"
               [value]="profile()!.email" disabled
               style="opacity: .65; cursor: not-allowed;"
               title="L'email ne peut pas être modifié.">
        <p class="form-hint">L'email ne peut pas être modifié.</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="phone">Téléphone</label>
        <input id="phone" type="tel" class="form-input"
               [value]="phone" (input)="phone = getVal($event)"
               placeholder="+237 6XX XXX XXX">
      </div>
    </div>

    <!-- Pays + Ville -->
    <div class="profile-grid" style="margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label" for="country">Pays de résidence</label>
        <select id="country" class="form-select"
                [value]="country" (change)="country = getVal($event)">
          <option value="">— Sélectionner —</option>
          <option value="Cameroun">Cameroun</option>
          <option value="France">France</option>
          <option value="Belgique">Belgique</option>
          <option value="Canada">Canada</option>
          <option value="Autre">Autre</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="city">
          {{ isCourier ? 'Zone de couverture' : 'Ville cible au Cameroun' }}
        </label>
        <ng-container *ngIf="!isCourier; else courierCity">
          <select id="city" class="form-select"
                  [value]="city" (change)="city = getVal($event)">
            <option value="">— Sélectionner —</option>
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
            <option value="Bafoussam">Bafoussam</option>
            <option value="Autre">Autre</option>
          </select>
        </ng-container>
        <ng-template #courierCity>
          <input id="city" type="text" class="form-input"
                 [value]="city" (input)="city = getVal($event)"
                 placeholder="Ex: Yaoundé centre">
        </ng-template>
      </div>
    </div>

    <!-- Section KYC (coursier uniquement) -->
    <!-- Bannière KYC (coursier uniquement, masquée si APPROVED) -->
    <div *ngIf="isCourier && profile()!.kycStatus !== 'APPROVED'" class="kyc-banner">
      <div class="kyc-banner__icon-wrap">
        <svg lucideShieldAlert size="20"></svg>
      </div>
      <div class="kyc-banner__body">
        <ng-container *ngIf="profile()!.kycStatus === 'PENDING'">
          <strong class="kyc-banner__title">Vérification d'identité en cours</strong>
          <p class="kyc-banner__desc">Votre dossier KYC est en cours d'examen par notre équipe (24-48h).</p>
        </ng-container>
        <ng-container *ngIf="profile()!.kycStatus === 'REJECTED'">
          <strong class="kyc-banner__title">Dossier KYC refusé — action requise</strong>
          <p class="kyc-banner__desc">Votre dossier a été refusé. Soumettez-en un nouveau pour accepter des missions.</p>
        </ng-container>
        <ng-container *ngIf="profile()!.kycStatus !== 'PENDING' && profile()!.kycStatus !== 'REJECTED'">
          <strong class="kyc-banner__title">Votre identité doit être vérifiée</strong>
          <p class="kyc-banner__desc">Le KYC doit être validé pour accepter de nouvelles missions.</p>
        </ng-container>
      </div>
      <a class="kyc-banner__cta" routerLink="/courier/kyc">
        <svg lucideShieldCheck size="13"></svg>
        {{ profile()!.kycStatus === 'REJECTED' ? 'Resoumettre' : (profile()!.kycStatus === 'PENDING' ? 'Voir mon dossier' : 'Compléter le dossier') }}
      </a>
    </div>

    <!-- Section Sécurité -->
    <hr style="border:0; border-top:1px solid #e1e8e0; margin:22px 0;">
    <p class="section-title">Sécurité</p>
    <button type="button" class="btn btn-secondary"
            (click)="goForgotPassword()">
      <svg lucideLock size="15"></svg> Changer le mot de passe
    </button>

    <!-- Bouton Enregistrer -->
    <div style="margin-top: 28px; padding-top: 22px; border-top: 1px solid #e1e8e0;">
      <button type="button" class="btn btn-primary btn-lg"
              style="width:100%;"
              [disabled]="isSaving()"
              (click)="onSave()">
        <ng-container *ngIf="!isSaving(); else savingTpl">
          <svg lucideSave size="17"></svg>
          Enregistrer les modifications
        </ng-container>
        <ng-template #savingTpl>
          <span class="spinner" style="width:17px; height:17px; border-width:2px;"></span>
          Enregistrement…
        </ng-template>
      </button>
    </div>

  </div>
</app-shell>
  `
})
export class ProfileComponent implements OnInit {

  // ── État chargé depuis l'API ──────────────────────────────────────────────
  profile   = signal<UserProfile | null>(null);
  isLoading = signal<boolean>(true);
  isSaving  = signal<boolean>(false);

  // ── Champs du formulaire (initialisés à partir du profil) ────────────────
  fullName = '';
  phone    = '';
  country  = '';
  city     = '';

  get isCourier(): boolean {
    return this.auth.getCurrentUserRole() === 'COURIER';
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  loadProfile(): void {
    this.isLoading.set(true);
    this.http.get<UserProfile>('/api/users/me').subscribe({
      next: (p) => {
        this.profile.set(p);
        this.fullName = p.fullName ?? '';
        this.phone    = p.phone    ?? '';
        this.country  = p.country  ?? '';
        this.city     = p.city     ?? '';
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Impossible de charger le profil.');
      }
    });
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  onSave(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const body = {
      fullName: this.fullName.trim() || null,
      phone:    this.phone.trim()    || null,
      country:  this.country.trim()  || null,
      city:     this.city.trim()     || null,
    };

    this.http.put<UserProfile>('/api/users/me', body).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.isSaving.set(false);
        // Mettre à jour le nom en localStorage pour que la topbar le reflète
        if (updated.fullName) {
          localStorage.setItem('user_full_name', updated.fullName);
        }
        this.toast.success('Profil mis à jour !');
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de la sauvegarde.';
        this.toast.error(msg);
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getVal(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
