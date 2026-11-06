import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { homeForRole } from '../../../core/auth/session';
import {
  LucideAlertTriangle,
  LucideArrowLeft,
} from '@lucide/angular';

const MOTIF_OPTIONS = [
  { value: 'harcelement', label: 'Harcèlement ou menaces' },
  { value: 'fraude',      label: 'Tentative de fraude' },
  { value: 'injures',     label: 'Propos injurieux ou irrespectueux' },
  { value: 'faux',        label: 'Faux profil / usurpation d\'identité' },
  { value: 'autre',       label: 'Autre' },
];

@Component({
  selector: 'app-report-user',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, LucideAlertTriangle, LucideArrowLeft],
  styles: [`
    .alert-warning {
      background: var(--cc-warning-bg); border: 1px solid var(--cc-warning);
      border-radius: var(--radius-md); padding: 14px 16px;
      display: flex; gap: 12px; margin-bottom: 22px; font-size: .88rem;
    }
    .alert-warning svg { flex-shrink: 0; color: var(--cc-warning); margin-top: 1px; }
    .alert-warning strong { display: block; color: var(--cc-warning); margin-bottom: 4px; }
    .alert-warning p { color: var(--cc-warning); margin: 0; }
    [data-theme="dark"] .alert-warning { background: rgba(120,53,15,.15); border-color: var(--cc-warning); }
    [data-theme="dark"] .alert-warning strong, [data-theme="dark"] .alert-warning p { color: var(--cc-warning); }
    .btn-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 28px; flex-wrap: wrap; }
    @media (max-width: 480px) { .btn-row { flex-direction: column-reverse; } .btn-row .btn { width: 100%; } }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-mb-16px { margin-bottom: 16px; }
    .st-bg-bg { background: var(--bg); }
    .st-d-inline-block-w-14px-heig-14px { display: inline-block; width: 14px; height: 14px; margin-right: 8px; border: 2px solid rgba(255,255,255,.3); border-top-color: var(--surface); border-radius: 50%; animation: spin .7s linear infinite; }
  `],
  template: `
  <div class="app-main-inner">

    <div class="page-head">
      <div>
        <h1>Signaler un utilisateur</h1>
        <p>Signalez un comportement inapproprié (harcèlement, fraude, injures).</p>
      </div>
      <button class="btn btn-secondary btn-sm" (click)="goBack()">
        <svg lucideArrowLeft size="15"></svg> Retour
      </button>
    </div>

    <div class="card">
      <!-- Alerte -->
      <div class="alert-warning">
        <svg lucideAlertTriangle size="18"></svg>
        <div>
          <strong>Attention</strong>
          <p>Un signalement abusif peut entraîner la suspension de votre propre compte.
             Ne signalez que des faits réels et vérifiables.</p>
        </div>
      </div>

      <form (submit)="onSubmit($event)">

        <!-- Utilisateur signalé (lecture seule) -->
        <div class="form-group st-mb-16px">
          <label class="form-label">Utilisateur signalé</label>
          <input type="text" class="form-input st-bg-bg"
                 [value]="targetId ? 'Utilisateur #' + targetId : '—'"
                 readonly>
        </div>

        <!-- Motif -->
        <div class="form-group st-mb-16px">
          <label class="form-label" for="motif">Motif du signalement *</label>
          <select id="motif" class="form-select" [(ngModel)]="motif" name="motif" required>
            <option value="">Sélectionnez un motif…</option>
            <option *ngFor="let o of motifOptions" [value]="o.value">{{ o.label }}</option>
          </select>
        </div>

        <!-- Description -->
        <div class="form-group st-mb-16px">
          <label class="form-label" for="desc">Description détaillée *</label>
          <textarea id="desc" class="form-textarea" rows="5"
            placeholder="Décrivez précisément ce qui s'est passé. Ces informations seront lues par l'administrateur…"
            [(ngModel)]="description" name="description" required></textarea>
          <p class="form-hint">Soyez précis et factuel. Minimum 20 caractères.</p>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-ghost" (click)="goBack()">Annuler</button>
          <button type="submit" class="btn btn-danger"
                  [disabled]="!isFormValid() || isSubmitting()">
            <ng-container *ngIf="!isSubmitting()">
              <svg lucideAlertTriangle size="15"></svg>
              Envoyer le signalement
            </ng-container>
            <ng-container *ngIf="isSubmitting()">
              <span class="st-d-inline-block-w-14px-heig-14px"></span>
              Envoi…
            </ng-container>
          </button>
        </div>

      </form>
    </div>
  </div>
  `
})
export class ReportUserComponent implements OnInit {

  targetId!: number;
  motif       = '';
  description = '';
  isSubmitting = signal(false);

  readonly motifOptions = MOTIF_OPTIONS;

  private previousUrl = '';

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private http:    HttpClient,
    private toast:   ToastService,
    private auth:    AuthService,
  ) {}

  ngOnInit(): void {
    this.targetId = Number(this.route.snapshot.paramMap.get('userId'));
    // Mémorise l'URL précédente pour le bouton Retour
    this.previousUrl = document.referrer || '/client/dashboard';
    if (!this.targetId) {
      this.toast.error('Identifiant d\'utilisateur manquant.');
      this.router.navigate([homeForRole(this.auth.getCurrentUserRole())]);
    }
  }

  isFormValid(): boolean {
    return !!this.motif && this.description.trim().length >= 20;
  }

  goBack(): void {
    window.history.back();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.isFormValid() || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const body = {
      targetId:    String(this.targetId),
      motif:       this.motif,
      description: this.description,
    };

    this.http.post('/api/reports', body).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Signalement envoyé. L\'admin va examiner votre dossier.');
        setTimeout(() => this.router.navigate([homeForRole(this.auth.getCurrentUserRole())]), 1800);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'envoi du signalement.');
      }
    });
  }
}
