import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideShieldCheck,
  LucideUser,
  LucideIdCard,
  LucideScanFace,
  LucideWallet,
  LucideCamera,
  LucideCheck,
  LucideCheckCircle,
  LucideXCircle,
  LucideClock,
  LucideSend,
  LucideArrowLeft,
} from '@lucide/angular';

interface KycStatus {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [
    RouterLink,
    NgClass,
    NgIf,
    LucideShieldCheck,
    LucideUser,
    LucideIdCard,
    LucideScanFace,
    LucideWallet,
    LucideCamera,
    LucideCheck,
    LucideCheckCircle,
    LucideXCircle,
    LucideClock,
    LucideSend,
    LucideArrowLeft,
  ],
  styles: [`
    /* ── Indicateur d'étapes ── */
    .kyc-steps {
      display: flex;
      align-items: flex-start;
      margin-bottom: 28px;
      position: relative;
    }
    .kyc-step {
      flex: 1;
      text-align: center;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .kyc-step::before {
      content: "";
      position: absolute;
      top: 16px;
      left: 50%;
      right: -50%;
      height: 2px;
      background: var(--cc-line);
      z-index: 0;
    }
    .kyc-step:last-child::before { display: none; }
    .kyc-step-num {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--surface);
      border: 2px solid var(--cc-line);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: .85rem;
      color: var(--cc-muted);
      position: relative;
      z-index: 1;
    }
    .kyc-step.done .kyc-step-num {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }
    .kyc-step.active .kyc-step-num {
      background: var(--cc-forest);
      border-color: var(--cc-forest);
      color: white;
    }
    .kyc-step-label {
      font-size: .78rem;
      color: var(--cc-muted);
      font-weight: 600;
    }
    .kyc-step.active .kyc-step-label { color: var(--cc-forest); }
    .kyc-step.done .kyc-step-label { color: var(--primary); }

    /* ── Zone upload ── */
    .upload-zone {
      border: 2px dashed var(--cc-line);
      border-radius: 10px;
      padding: 22px 16px;
      text-align: center;
      cursor: pointer;
      background: var(--cc-paper);
      transition: border-color .15s, background .15s;
    }
    .upload-zone:hover {
      border-color: var(--cc-forest);
      background: var(--cc-success-bg);
    }
    .upload-zone.has-file {
      border-color: var(--primary);
      background: var(--cc-success-bg);
    }

    .upload-zone.has-error {
      border-color: var(--cc-danger);
      background: var(--cc-danger-bg);
    }

    /* ── Message d'erreur fichier ── */
    .file-error {
      font-size: .78rem;
      color: var(--cc-danger);
      margin: 5px 0 0;
      line-height: 1.4;
    }

    /* ── Grille 2 colonnes ── */
    .kyc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 640px) {
      .kyc-grid { grid-template-columns: 1fr; gap: 12px; }
      .kyc-step-label { font-size: .68rem; }
    }

    /* ── Encart statut ── */
    .status-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 24px;
      text-align: center;
    }
    .status-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .status-icon-wrap.pending  { background: var(--cc-warning-bg); color: var(--cc-warning); }
    .status-icon-wrap.approved { background: var(--cc-success-bg); color: var(--primary); }
    .status-icon-wrap.rejected { background: var(--cc-danger-bg); color: var(--cc-danger); }

    /* ── Barre de progression ── */
    .upload-progress {
      height: 4px;
      background: var(--cc-line);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    .upload-progress-bar {
      height: 100%;
      background: var(--primary);
      transition: width .2s;
    }

    [data-theme="dark"] .upload-zone {
      background: var(--surface);
      border-color: var(--cc-line);
    }
    [data-theme="dark"] .upload-zone:hover {
      border-color: var(--cc-lime);
      background: var(--surface);
    }
    [data-theme="dark"] .upload-zone.has-file {
      border-color: var(--cc-lime);
      background: var(--surface);
    }
    [data-theme="dark"] .kyc-step-num {
      background: var(--surface);
      border-color: var(--cc-line);
    }
    [data-theme="dark"] .kyc-step::before { background: var(--cc-line); }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-mb-24px { margin-bottom: 24px; }
    .st-m-0-fs-1-1rem { margin: 0; font-size: 1.1rem; }
    .st-max-400px { max-width: 400px; }
    .st-m-0-fs-1-1rem-c-primary { margin: 0; font-size: 1.1rem; color: var(--primary); }
    .st-d-flex-g-10px-p-14px-16px { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; background: var(--cc-danger-bg); border: 1px solid var(--cc-danger); margin-bottom: 20px; }
    .st-c-danger-flex-0-mt-1px { color: var(--cc-danger); flex-shrink: 0; margin-top: 1px; }
    .st-c-danger-d-block-mb-3px { color: var(--cc-danger); display: block; margin-bottom: 3px; }
    .st-fs-88rem-c-danger { font-size: .88rem; color: var(--cc-danger); }
    .st-mb-20px { margin-bottom: 20px; }
    .st-mb-18px { margin-bottom: 18px; }
    .st-d-flex-ai-center-g-8px { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: .95rem; margin-bottom: 16px; }
    .st-c-primary { color: var(--primary); }
    .st-marg-auto-fs-7rem { margin-left: auto; font-size: .7rem; }
    .st-mb-16px { margin-bottom: 16px; }
    .st-c-forest { color: var(--cc-forest); }
    .st-d-none { display: none; }
    .st-c-muted-mb-6px-d-block { color: var(--cc-muted); margin-bottom: 6px; display: block; margin-inline: auto; }
    .st-m-0 { margin: 0; }
    .st-m-3px-0-0-fs-72rem { margin: 3px 0 0; font-size: .72rem; }
    .st-c-primary-mb-4px-d-block { color: var(--primary); margin-bottom: 4px; display: block; margin-inline: auto; }
    .st-m-0-fw-600-c-primary { margin: 0; font-weight: 600; color: var(--primary); }
    .st-m-2px-0-0 { margin: 2px 0 0; }
    .st-d-flex-ai-center-g-8px-2 { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: .95rem; margin-bottom: 14px; }
    .st-mb-14px { margin-bottom: 14px; }
    .st-max-320px-m-auto { max-width: 320px; margin: auto; }
    .st-c-muted-mb-8px-d-block { color: var(--cc-muted); margin-bottom: 8px; display: block; margin-inline: auto; }
    .st-fw-600-c-forest-m-0 { font-weight: 600; color: var(--cc-forest); margin: 0; }
    .st-mt-3px { margin-top: 3px; }
    .st-mt-2px-fs-72rem { margin-top: 2px; font-size: .72rem; }
    .st-c-primary-mb-8px-d-block { color: var(--primary); margin-bottom: 8px; display: block; margin-inline: auto; }
    .st-fw-600-c-primary-m-0 { font-weight: 600; color: var(--primary); margin: 0; }
    .st-ta-center-mt-8px { text-align: center; margin-top: 8px; }
    .st-mb-22px { margin-bottom: 22px; }
    .st-mb-6px { margin-bottom: 6px; }
    .st-w-100 { width: 100%; }
    .st-w-17px-heig-17px-bord-2px { width: 17px; height: 17px; border-width: 2px; }
    .st-ta-center-mt-12px { text-align: center; margin-top: 12px; }
  `],
  template: `
  <div class="page-head st-mb-24px">
    <div>
      <h1>Vérification d'identité</h1>
      <p>Complétez votre dossier KYC pour accepter des missions.</p>
    </div>
    <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
      <svg lucideArrowLeft size="15"></svg> Retour
    </a>
  </div>

  <!-- ── Statut déjà soumis (PENDING ou APPROVED) ── -->
  <ng-container *ngIf="showStatusCard()">
    <div class="card st-mb-24px">
      <div class="status-card">

        <!-- PENDING -->
        <ng-container *ngIf="kycStatus()?.status === 'PENDING'">
          <div class="status-icon-wrap pending">
            <svg lucideClock size="32"></svg>
          </div>
          <h2 class="st-m-0-fs-1-1rem">Dossier en cours de vérification</h2>
          <p class="text-muted text-sm st-max-400px">
            Votre dossier KYC a été soumis et est en cours d'examen par notre équipe.
            La vérification prend généralement moins de 24 heures.
          </p>
          <span class="badge badge-warning">En attente</span>
        </ng-container>

        <!-- APPROVED -->
        <ng-container *ngIf="kycStatus()?.status === 'APPROVED'">
          <div class="status-icon-wrap approved">
            <svg lucideShieldCheck size="32"></svg>
          </div>
          <h2 class="st-m-0-fs-1-1rem-c-primary">Identité vérifiée ✓</h2>
          <p class="text-muted text-sm">
            Votre identité a été validée. Vous pouvez accepter des missions.
          </p>
          <a routerLink="/courier/dashboard" class="btn btn-primary btn-sm">
            Retour au tableau de bord
          </a>
        </ng-container>

      </div>
    </div>
  </ng-container>

  <!-- ── Formulaire KYC (NONE ou REJECTED) ── -->
  <ng-container *ngIf="showForm()">

    <!-- Alerte si rejeté -->
    <div class="st-d-flex-g-10px-p-14px-16px" *ngIf="kycStatus()?.status === 'REJECTED'"
>
      <svg class="st-c-danger-flex-0-mt-1px" lucideXCircle size="18"></svg>
      <div>
        <strong class="st-c-danger-d-block-mb-3px">Dossier rejeté</strong>
        <span class="st-fs-88rem-c-danger">
          {{ kycStatus()?.rejectionReason ?? 'Veuillez resoumettre votre dossier avec des documents valides.' }}
        </span>
      </div>
    </div>

    <!-- Indicateur d'étapes -->
    <div class="kyc-steps" aria-label="Progression du dossier KYC">
      <div class="kyc-step" [ngClass]="stepClass(1)">
        <div class="kyc-step-num">
          <ng-container *ngIf="currentStep() > 1; else n1">
            <svg lucideCheck size="16"></svg>
          </ng-container>
          <ng-template #n1>1</ng-template>
        </div>
        <span class="kyc-step-label">Identité</span>
      </div>
      <div class="kyc-step" [ngClass]="stepClass(2)">
        <div class="kyc-step-num">
          <ng-container *ngIf="currentStep() > 2; else n2">
            <svg lucideCheck size="16"></svg>
          </ng-container>
          <ng-template #n2>2</ng-template>
        </div>
        <span class="kyc-step-label">Documents</span>
      </div>
      <div class="kyc-step" [ngClass]="stepClass(3)">
        <div class="kyc-step-num">
          <ng-container *ngIf="currentStep() > 3; else n3">
            <svg lucideCheck size="16"></svg>
          </ng-container>
          <ng-template #n3>3</ng-template>
        </div>
        <span class="kyc-step-label">Selfie</span>
      </div>
      <div class="kyc-step" [ngClass]="stepClass(4)">
        <div class="kyc-step-num">4</div>
        <span class="kyc-step-label">Paiement</span>
      </div>
    </div>

    <!-- Notice sécurité -->
    <div class="app-notice st-mb-20px">
      <svg lucideShieldCheck size="18"></svg>
      <div>
        <strong>Vos données sont protégées</strong>
        <span>Vos documents sont chiffrés et utilisés uniquement pour la vérification d'identité. Ils ne sont jamais partagés avec les clients.</span>
      </div>
    </div>

    <!-- ── ÉTAPE 1 : Informations personnelles ── -->
    <div class="card st-mb-18px">
      <div class="st-d-flex-ai-center-g-8px">
        <svg class="st-c-primary" lucideUser size="17"></svg>
        Informations personnelles
        <span *ngIf="currentStep() > 1" class="badge badge-success st-marg-auto-fs-7rem">Complété</span>
      </div>
      <div class="kyc-grid st-mb-16px">
        <div class="form-group">
          <label class="form-label" for="firstName">Prénom</label>
          <input id="firstName" type="text" class="form-input"
                 [value]="firstName" (input)="firstName = getVal($event)"
                 placeholder="Jean" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="lastName">Nom de famille</label>
          <input id="lastName" type="text" class="form-input"
                 [value]="lastName" (input)="lastName = getVal($event)"
                 placeholder="Kamga" required>
        </div>
      </div>
      <div class="kyc-grid">
        <div class="form-group">
          <label class="form-label" for="dob">Date de naissance</label>
          <input id="dob" type="date" class="form-input"
                 [value]="dob" (input)="dob = getVal($event)" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="nationality">Nationalité</label>
          <select id="nationality" class="form-select"
                  [value]="nationality" (change)="nationality = getVal($event)">
            <option value="Camerounaise">Camerounaise</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── ÉTAPE 2 : Documents ── -->
    <div class="card st-mb-18px">
      <div class="st-d-flex-ai-center-g-8px">
        <svg class="st-c-forest" lucideIdCard size="17"></svg>
        Pièce d'identité *
      </div>

      <div class="form-group st-mb-16px">
        <label class="form-label" for="docType">Type de document</label>
        <select id="docType" class="form-select"
                [value]="documentType" (change)="documentType = getVal($event)">
          <option value="CNI">Carte Nationale d'Identité</option>
          <option value="PASSPORT">Passeport</option>
        </select>
      </div>

      <div class="kyc-grid">
        <!-- Recto -->
        <div>
          <p class="form-label">Recto du document</p>
          <div class="upload-zone" [ngClass]="{'has-file': !!frontFile(), 'has-error': !!frontFileError()}"
               (click)="frontInput.click()" (keyup.enter)="frontInput.click()" tabindex="0">
            <input class="st-d-none" #frontInput type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
 (change)="onFrontChange($event)">
            <ng-container *ngIf="!frontFile(); else frontDone">
              <svg class="st-c-muted-mb-6px-d-block" lucideCamera size="28"></svg>
              <p class="text-sm text-muted st-m-0">Photo du recto</p>
              <p class="text-sm text-muted st-m-3px-0-0-fs-72rem">JPG, PNG, PDF · max 10 Mo</p>
            </ng-container>
            <ng-template #frontDone>
              <svg class="st-c-primary-mb-4px-d-block" lucideCheck size="24"></svg>
              <p class="text-sm st-m-0-fw-600-c-primary">{{ frontFile()!.name }}</p>
              <p class="text-sm text-muted st-m-2px-0-0">{{ formatSize(frontFile()!.size) }}</p>
            </ng-template>
          </div>
          <p *ngIf="frontFileError()" class="file-error">⚠ {{ frontFileError() }}</p>
        </div>

        <!-- Verso -->
        <div>
          <p class="form-label">Verso du document</p>
          <div class="upload-zone" [ngClass]="{'has-file': !!backFile(), 'has-error': !!backFileError()}"
               (click)="backInput.click()" (keyup.enter)="backInput.click()" tabindex="0">
            <input class="st-d-none" #backInput type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
 (change)="onBackChange($event)">
            <ng-container *ngIf="!backFile(); else backDone">
              <svg class="st-c-muted-mb-6px-d-block" lucideCamera size="28"></svg>
              <p class="text-sm text-muted st-m-0">Photo du verso</p>
              <p class="text-sm text-muted st-m-3px-0-0-fs-72rem">JPG, PNG, PDF · max 10 Mo</p>
            </ng-container>
            <ng-template #backDone>
              <svg class="st-c-primary-mb-4px-d-block" lucideCheck size="24"></svg>
              <p class="text-sm st-m-0-fw-600-c-primary">{{ backFile()!.name }}</p>
              <p class="text-sm text-muted st-m-2px-0-0">{{ formatSize(backFile()!.size) }}</p>
            </ng-template>
          </div>
          <p *ngIf="backFileError()" class="file-error">⚠ {{ backFileError() }}</p>
        </div>
      </div>
    </div>

    <!-- ── ÉTAPE 3 : Selfie ── -->
    <div class="card st-mb-18px">
      <div class="st-d-flex-ai-center-g-8px-2">
        <svg class="st-c-forest" lucideScanFace size="17"></svg>
        Selfie de vérification *
      </div>
      <p class="text-sm text-muted st-mb-14px">
        Prenez un selfie en tenant votre pièce d'identité bien visible à côté de votre visage.
      </p>
      <div class="upload-zone st-max-320px-m-auto" [ngClass]="{'has-file': !!selfieFile(), 'has-error': !!selfieFileError()}"
           (click)="selfieInput.click()" (keyup.enter)="selfieInput.click()" tabindex="0"
>
        <input class="st-d-none" #selfieInput type="file" accept="image/jpeg,image/png,image/webp"
 (change)="onSelfieChange($event)">
        <ng-container *ngIf="!selfieFile(); else selfieDone">
          <svg class="st-c-muted-mb-8px-d-block" lucideUser size="36"></svg>
          <p class="text-sm st-fw-600-c-forest-m-0">Prendre le selfie</p>
          <p class="text-sm text-muted st-mt-3px">Ou importer une photo existante</p>
          <p class="text-sm text-muted st-mt-2px-fs-72rem">JPG, PNG, WebP · max 10 Mo</p>
        </ng-container>
        <ng-template #selfieDone>
          <svg class="st-c-primary-mb-8px-d-block" lucideCheckCircle size="36"></svg>
          <p class="text-sm st-fw-600-c-primary-m-0">{{ selfieFile()!.name }}</p>
          <p class="text-sm text-muted st-mt-3px">{{ formatSize(selfieFile()!.size) }}</p>
        </ng-template>
      </div>
      <p *ngIf="selfieFileError()" class="file-error st-ta-center-mt-8px">⚠ {{ selfieFileError() }}</p>
    </div>

    <!-- ── ÉTAPE 4 : Coordonnées de paiement ── -->
    <div class="card st-mb-22px">
      <div class="st-d-flex-ai-center-g-8px-2">
        <svg class="st-c-forest" lucideWallet size="17"></svg>
        Coordonnées de paiement *
      </div>
      <div class="form-group st-mb-14px">
        <label class="form-label" for="payoutMethod">Méthode de reversement</label>
        <select id="payoutMethod" class="form-select"
                [value]="payoutMethod" (change)="payoutMethod = getVal($event)">
          <option value="MTN">MTN Mobile Money</option>
          <option value="ORANGE">Orange Money</option>
          <option value="BANK">Virement bancaire</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="payoutNumber">Numéro / IBAN</label>
        <input id="payoutNumber" type="text" class="form-input"
               [value]="payoutNumber" (input)="payoutNumber = getVal($event)"
               placeholder="+237 6XX XXX XXX" required>
      </div>
    </div>

    <!-- Barre de progression upload -->
    <div class="st-mb-16px" *ngIf="uploadProgress() > 0 && uploadProgress() < 100">
      <p class="text-sm text-muted st-mb-6px">Upload en cours… {{ uploadProgress() }}%</p>
      <div class="upload-progress">
        <div class="upload-progress-bar" [style.width.%]="uploadProgress()"></div>
      </div>
    </div>

    <!-- Bouton submit -->
    <button type="button" class="btn btn-primary btn-lg st-w-100"

            [disabled]="!isFormValid() || isLoading()"
            (click)="onSubmit()">
      <ng-container *ngIf="!isLoading(); else spinnerTpl">
        <svg lucideSend size="17"></svg>
        Soumettre mon dossier KYC
      </ng-container>
      <ng-template #spinnerTpl>
        <span class="spinner st-w-17px-heig-17px-bord-2px"></span>
        Envoi en cours…
      </ng-template>
    </button>

    <p class="text-sm text-muted st-ta-center-mt-12px">
      La vérification prend généralement moins de 24 heures.
    </p>

  </ng-container>
  `
})
export class KycComponent implements OnInit {

  // ── Champs du formulaire ──────────────────────────────────────────────────
  firstName    = '';
  lastName     = '';
  dob          = '';
  nationality  = 'Camerounaise';
  documentType = 'CNI';
  payoutMethod = 'MTN';
  payoutNumber = '';

  // ── Fichiers ──────────────────────────────────────────────────────────────
  frontFile  = signal<File | null>(null);
  backFile   = signal<File | null>(null);
  selfieFile = signal<File | null>(null);

  // Erreurs de validation par fichier
  frontFileError  = signal<string | null>(null);
  backFileError   = signal<string | null>(null);
  selfieFileError = signal<string | null>(null);

  /** Taille max autorisée par fichier : 10 MB (aligné sur le backend) */
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  /** Types MIME acceptés */
  private readonly ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  // ── État UI ───────────────────────────────────────────────────────────────
  kycStatus      = signal<KycStatus | null>(null);
  isLoading      = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  /** Étape courante (1-4) basée sur les données déjà renseignées */
  currentStep = computed<number>(() => {
    if (!this.firstName || !this.lastName || !this.dob) return 1;
    if (!this.frontFile() || !this.backFile()) return 2;
    if (!this.selfieFile()) return 3;
    return 4;
  });

  /** Afficher la carte de statut (PENDING ou APPROVED) */
  showStatusCard = computed<boolean>(() => {
    const s = this.kycStatus()?.status;
    return s === 'PENDING' || s === 'APPROVED';
  });

  /** Afficher le formulaire (NONE ou REJECTED) */
  showForm = computed<boolean>(() => {
    const s = this.kycStatus()?.status;
    return !s || s === 'NONE' || s === 'REJECTED';
  });

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadKycStatus();
    // Pré-remplir prénom/nom depuis le localStorage
    const fullName = this.auth.getCurrentUserFullName();
    if (fullName) {
      const parts = fullName.trim().split(' ');
      this.firstName = parts[0] ?? '';
      this.lastName  = parts.slice(1).join(' ') ?? '';
    }
  }

  // ── Chargement du statut ──────────────────────────────────────────────────

  loadKycStatus(): void {
    this.http.get<KycStatus>('/api/kyc/my-status').subscribe({
      next:  (s) => this.kycStatus.set(s),
      error: ()  => this.kycStatus.set({ status: 'NONE' })
    });
  }

  // ── Gestion des fichiers ──────────────────────────────────────────────────

  onFrontChange(event: Event): void {
    const f = this.pickFile(event);
    if (f) {
      const err = this.validateFile(f);
      this.frontFileError.set(err);
      this.frontFile.set(err ? null : f);
    }
  }

  onBackChange(event: Event): void {
    const f = this.pickFile(event);
    if (f) {
      const err = this.validateFile(f);
      this.backFileError.set(err);
      this.backFile.set(err ? null : f);
    }
  }

  onSelfieChange(event: Event): void {
    const f = this.pickFile(event);
    if (f) {
      const err = this.validateFile(f);
      this.selfieFileError.set(err);
      this.selfieFile.set(err ? null : f);
    }
  }

  private pickFile(event: Event): File | null {
    return (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  /**
   * Valide un fichier : taille et type MIME.
   * Retourne un message d'erreur ou null si valide.
   */
  private validateFile(file: File): string | null {
    if (file.size > this.MAX_FILE_SIZE) {
      return `Fichier trop lourd (${this.formatSize(file.size)}). Maximum autorisé : 10 Mo.`;
    }
    if (this.ACCEPTED_TYPES.length > 0 && !this.ACCEPTED_TYPES.includes(file.type)) {
      return `Format non supporté (${file.type || 'inconnu'}). Utilisez JPG, PNG, WebP ou PDF.`;
    }
    return null;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  isFormValid(): boolean {
    return !!(
      this.firstName.trim() &&
      this.lastName.trim() &&
      this.dob &&
      this.frontFile() &&
      this.backFile() &&
      this.selfieFile() &&
      this.payoutNumber.trim() &&
      !this.frontFileError() &&
      !this.backFileError() &&
      !this.selfieFileError()
    );
  }

  // ── Soumission ────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.uploadProgress.set(0);

    const form = new FormData();
    form.append('firstName',    this.firstName.trim());
    form.append('lastName',     this.lastName.trim());
    form.append('birthDate',    this.dob);          // format YYYY-MM-DD (input type=date)
    form.append('nationality',  this.nationality);
    form.append('documentType', this.documentType);
    form.append('frontFile',    this.frontFile()!);
    form.append('backFile',     this.backFile()!);
    form.append('selfieFile',   this.selfieFile()!);

    this.http.post<{ message: string; submissionId: number; status: string }>(
      '/api/kyc/submit',
      form,
      { reportProgress: true, observe: 'events' }
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.isLoading.set(false);
          this.uploadProgress.set(100);
          this.toast.success('Dossier KYC soumis ! Vérification sous 24 heures.');
          setTimeout(() => this.router.navigate(['/courier/dashboard']), 1800);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uploadProgress.set(0);
        const msg = err?.error?.message ?? 'Erreur lors de la soumission. Veuillez réessayer.';
        this.toast.error(msg);
      }
    });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  /** Classe CSS de l'étape (done / active / '') */
  stepClass(step: number): string {
    const cur = this.currentStep();
    if (step < cur) return 'done';
    if (step === cur) return 'active';
    return '';
  }

  /** Formate une taille de fichier en Ko / Mo */
  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  /** Extrait la valeur d'un événement input/change */
  getVal(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
