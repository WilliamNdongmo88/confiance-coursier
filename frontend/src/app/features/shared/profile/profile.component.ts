import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideLogOut,
  LucideStar,
  LucideLock,
  LucideSave,
  LucideShieldCheck,
  LucideShieldAlert,
  LucideClock,
  LucideXCircle,
  } from '@lucide/angular';

interface UserProfile {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  country: string | null;
  city: string | null;
  vehicle?: string | null;
  status: string;
  trustScore: number | null;
  badge: string | null;
  kycStatus: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
}

import { CAMEROON_CITIES } from '../../../shared/data/courier-profile';
import { VehiclePickerComponent } from '../../../shared/components/vehicle-picker/vehicle-picker.component';
import { ComboFieldComponent } from '../../../shared/components/combo-field/combo-field.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [VehiclePickerComponent, ComboFieldComponent, 
    RouterLink,
    NgIf,
    LucideLogOut,
    LucideStar,
    LucideLock,
    LucideSave,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideClock,
    LucideXCircle,
    ],
  styles: [`
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 22px;
      margin-bottom: 28px;
      padding-bottom: 26px;
      border-bottom: 1px solid var(--cc-line);
    }
    .avatar-lg {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: var(--cc-success-bg);
      color: var(--cc-forest);
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
      color: var(--cc-forest);
      margin-bottom: 12px;
    }
    @media (max-width: 640px) {
      .avatar-section { flex-direction: column; text-align: center; gap: 14px; }
      .profile-grid   { grid-template-columns: 1fr; gap: 0; }
    }
    [data-theme="dark"] .avatar-section { border-bottom-color: var(--cc-line); }
    :host-context([data-theme="dark"]) .avatar-lg { background: rgba(215,237,154,.14) !important; color: var(--cc-lime) !important; }
    .sec-hint { margin: -4px 0 10px; }
    .star { color: #d99d45; fill: currentColor; }
    .logout-zone { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--cc-line); }
    .btn-logout { width: 100%; min-height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border-radius: 10px; border: 0; background: #b54843; color: #fff; font: inherit; font-weight: 750; cursor: pointer;
      box-shadow: 0 6px 16px rgba(181,72,67,.22); transition: background .15s, transform .12s; }
    .btn-logout:hover { background: #9c3a35; }
    .btn-logout:active { transform: scale(.985); }
    :host-context([data-theme="dark"]) .btn-logout { background: #E2776F !important; color: #1f0d0b !important; }
    [data-theme="dark"] hr { border-top-color: var(--cc-line) !important; }
    /* ── Bannière KYC (même style que courier/dashboard) ── */
    .kyc-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, var(--cc-warning) 0%, var(--cc-warning) 100%);
      border: 1px solid var(--cc-warning);
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
      color: var(--cc-warning);
      flex-shrink: 0;
    }
    .kyc-banner__body { flex: 1; min-width: 160px; }
    .kyc-banner__title {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--on-primary);
      margin-bottom: 2px;
    }
    .kyc-banner__desc {
      margin: 0;
      font-size: 12px;
      color: var(--cc-warning);
      line-height: 1.4;
    }
    .kyc-banner__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--cc-warning);
      color: var(--cc-warning);
      font-size: 12px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    .kyc-banner__cta:hover { background: var(--cc-warning-bg); transform: translateY(-1px); }
    @media (max-width: 560px) {
      .kyc-banner__body { min-width: unset; width: 100%; }
      .kyc-banner__cta  { width: 100%; justify-content: center; }
    }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-mb-24px { margin-bottom: 24px; }
    .st-ta-center-p-40px-0 { text-align: center; padding: 40px 0; }
    .st-w-28px-heig-28px-bord-3px { width: 28px; height: 28px; border-width: 3px; display: inline-block; }
    .st-mt-12px { margin-top: 12px; }
    .st-fs-1-15rem-fw-700-mb-4px { font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; }
    .st-mb-8px { margin-bottom: 8px; }
    .st-d-inline-vert-middle-marg-3px { display: inline; vertical-align: middle; margin-right: 3px; }
    .st-bg-paper-c-muted-bd-1px-solid-li { background: var(--cc-paper); color: var(--cc-muted); border: 1px solid var(--cc-line); }
    .st-mb-16px { margin-bottom: 16px; }
    .st-opac-65-curs-not-allowed { opacity: .65; cursor: not-allowed; }
    .st-bd-0-bt-1px-solid-li-m-22px-0 { border: 0; border-top: 1px solid var(--cc-line); margin: 22px 0; }
    .st-mt-28px-padd-22px-bt-1px-solid-li { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--cc-line); }
    .st-w-100 { width: 100%; }
    .st-w-17px-heig-17px-bord-2px { width: 17px; height: 17px; border-width: 2px; }
  `],
  template: `
  <div class="page-head st-mb-24px">
    <div>
      <h1>{{ isCourier ? 'Mon profil coursier' : 'Mon profil' }}</h1>
      <p>{{ isCourier ? 'Gérez vos coordonnées et préférences de mission.' : 'Gérez vos informations personnelles.' }}</p>
    </div>
  </div>

  <!-- Chargement -->
  <div class="st-ta-center-p-40px-0" *ngIf="isLoading()">
    <span class="spinner st-w-28px-heig-28px-bord-3px"></span>
    <p class="text-muted text-sm st-mt-12px">Chargement du profil…</p>
  </div>

  <!-- Formulaire -->
  <div *ngIf="!isLoading() && profile()" class="card">

    <!-- Section avatar -->
    <div class="avatar-section">
      <div class="avatar-lg">{{ profile()!.initials }}</div>
      <div>
        <h3 class="st-fs-1-15rem-fw-700-mb-4px">
          {{ profile()!.fullName ?? profile()!.email }}
        </h3>
        <p class="text-sm text-muted st-mb-8px">
          <ng-container *ngIf="profile()!.trustScore !== null && (profile()!.trustScore ?? 0) > 0">
            <svg class="st-d-inline-vert-middle-marg-3px star" lucideStar size="13"></svg>{{ rating() }} / 5 ·
          </ng-container>
          {{ profile()!.role === 'COURIER' ? 'Compte coursier' : 'Compte client' }}
        </p>
        <!-- Badge KYC pour coursier -->
        <ng-container *ngIf="isCourier">
          <span *ngIf="profile()!.kycStatus === 'APPROVED'" class="badge badge-success">
            <svg class="st-d-inline-vert-middle-marg-3px" lucideShieldCheck size="12"></svg>
            Identité vérifiée
          </span>
          <span *ngIf="profile()!.kycStatus === 'PENDING'" class="badge badge-warning">
            <svg class="st-d-inline-vert-middle-marg-3px" lucideClock size="12"></svg>
            KYC en attente
          </span>
          <span *ngIf="profile()!.kycStatus === 'REJECTED'" class="badge badge-danger">
            <svg class="st-d-inline-vert-middle-marg-3px" lucideXCircle size="12"></svg>
            KYC rejeté
          </span>
          <span *ngIf="profile()!.kycStatus === 'NONE'" class="badge st-bg-paper-c-muted-bd-1px-solid-li">
            <svg class="st-d-inline-vert-middle-marg-3px" lucideShieldAlert size="12"></svg>
            KYC non soumis
          </span>
        </ng-container>      </div>
    </div>

    <p class="section-title">Vos informations</p>
    <!-- Nom complet -->
    <div class="form-group st-mb-16px">
      <label class="form-label" for="fullName">Nom complet</label>
      <input id="fullName" type="text" class="form-input"
             [value]="fullName" (input)="fullName = getVal($event)"
             placeholder="Votre nom complet">
    </div>

    <!-- Email + Téléphone -->
    <div class="profile-grid st-mb-16px">
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input id="email" type="email" class="form-input st-opac-65-curs-not-allowed"
               [value]="profile()!.email" disabled

               title="L’email ne peut pas être modifié.">
        <p class="form-hint">Sert à vous connecter et à recevoir vos codes : il ne peut pas être modifié.</p>
      </div>
      <div class="form-group">
        <label class="form-label" for="phone">Téléphone</label>
        <input id="phone" type="tel" class="form-input"
               [value]="phone" (input)="phone = getVal($event)"
               placeholder="+237 6XX XXX XXX">
      </div>
    </div>

    <!-- Pays + Ville -->
    <div class="profile-grid st-mb-16px">
      <div class="form-group">
        <label class="form-label" for="country">Pays où vous vivez</label>
        <app-combo-field inputId="country" [options]="countries" [value]="country" (valueChange)="country = $event"
                         emptyLabel="— Sélectionner —" placeholder="— Sélectionner —" ariaLabel="Pays" />
      </div>
      <div class="form-group">
        <label class="form-label" for="city">
          {{ isCourier ? 'Ville où vous travaillez' : 'Ville de vos courses au Cameroun' }}
        </label>
        <ng-container *ngIf="!isCourier; else courierCity">
          <app-combo-field inputId="city" [freeText]="true" [options]="cities" [value]="city" (valueChange)="city = $event"
                           placeholder="Ex : Douala" autocomplete="address-level2" ariaLabel="Villes du Cameroun" />
          <p class="form-hint">Proposée automatiquement à la création de vos courses.</p>
        </ng-container>
        <ng-template #courierCity>
          <app-combo-field inputId="city" [freeText]="true" [options]="cities" [value]="city" (valueChange)="city = $event"
                           placeholder="Ex : Douala" autocomplete="address-level2" ariaLabel="Villes du Cameroun" />
          <p class="form-hint">Les demandes de cette ville vous sont proposées en premier, et les clients vous voient comme « proche ».</p>
        </ng-template>
      </div>
      @if (isCourier) {
        <div class="form-group">
          <span class="form-label" id="vehicle-label">Moyen de déplacement</span>
          <app-vehicle-picker [value]="vehicle" [allowNone]="true" (valueChange)="vehicle = $event" labelledBy="vehicle-label" />
          <p class="form-hint">Affiché aux clients quand ils choisissent un coursier.</p>
        </div>
      }
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
    <hr class="st-bd-0-bt-1px-solid-li-m-22px-0">
    <p class="section-title">Sécurité</p>
    <p class="form-hint sec-hint">Un lien pour choisir un nouveau mot de passe vous sera envoyé par email.</p>
    <button type="button" class="btn btn-secondary"
            (click)="goForgotPassword()">
      <svg lucideLock size="15"></svg> Changer le mot de passe
    </button>

    <!-- Bouton Enregistrer -->
    <div class="st-mt-28px-padd-22px-bt-1px-solid-li">
      <button type="button" class="btn btn-primary btn-lg st-w-100"

              [disabled]="isSaving()"
              (click)="onSave()">
        <ng-container *ngIf="!isSaving(); else savingTpl">
          <svg lucideSave size="17"></svg>
          Enregistrer les modifications
        </ng-container>
        <ng-template #savingTpl>
          <span class="spinner st-w-17px-heig-17px-bord-2px"></span>
          Enregistrement…
        </ng-template>
      </button>
    </div>

    <div class="logout-zone">
      <button type="button" class="btn-logout" (click)="logout()">
        <svg lucideLogOut size="17"></svg> Se déconnecter
      </button>
    </div>

  </div>
  `
})
export class ProfileComponent implements OnInit {

  // ── État chargé depuis l'API ──────────────────────────────────────────────
  profile   = signal<UserProfile | null>(null);
  isLoading = signal<boolean>(true);
  isSaving  = signal<boolean>(false);

  // ── Champs du formulaire (initialisés à partir du profil) ────────────────
  readonly countries = ['Cameroun', 'France', 'Belgique', 'Suisse', 'Allemagne', 'Royaume-Uni', 'Italie', 'Espagne',
    'Canada', 'États-Unis', 'Côte d’Ivoire', 'Gabon', 'Nigeria', 'Afrique du Sud', 'Autre'];
  readonly cities = CAMEROON_CITIES;
  vehicle = '';

  rating(): string { return (this.profile()?.trustScore ?? 0).toFixed(1).replace('.', ','); }

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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
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
        this.vehicle  = p.vehicle  ?? '';
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
      ...(this.isCourier ? { vehicle: this.vehicle } : {}),
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
