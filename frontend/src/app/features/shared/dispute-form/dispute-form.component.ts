import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { homeForRole } from '../../../core/auth/session';
import {
  LucideAlertTriangle,
  LucideArrowLeft,
} from '@lucide/angular';

interface MotifOption { code: string; label: string; group: string; }

const CLIENT_MOTIFS: MotifOption[] = [
  { code: 'L-C1', label: 'L-C1 : La course n\'a pas été effectuée',         group: 'client' },
  { code: 'L-C2', label: 'L-C2 : La course a été partiellement effectuée',  group: 'client' },
  { code: 'L-C3', label: 'L-C3 : Les preuves sont insuffisantes / non conformes', group: 'client' },
  { code: 'L-C4', label: 'L-C4 : Détournement de fonds',                    group: 'client' },
  { code: 'L-C5', label: 'L-C5 : Comportement irrespectueux du coursier',   group: 'client' },
  { code: 'L-C6', label: 'L-C6 : Retard important non justifié',            group: 'client' },
];

const COURIER_MOTIFS: MotifOption[] = [
  { code: 'L-F1', label: 'L-F1 : Le client ne valide pas alors que la course est faite', group: 'coursier' },
  { code: 'L-F2', label: 'L-F2 : Le client refuse de payer un supplément légitime',      group: 'coursier' },
  { code: 'L-F3', label: 'L-F3 : Le client est injurieux / menaçant',                   group: 'coursier' },
  { code: 'L-F4', label: 'L-F4 : Fausse accusation',                                    group: 'coursier' },
];

@Component({
  selector: 'app-dispute-form',
  standalone: true,
  imports: [RouterLink, NgIf, FormsModule, AppShellComponent, LucideAlertTriangle, LucideArrowLeft],
  styles: [`
    .alert-warning {
      background: #fffbeb; border: 1px solid #fcd34d;
      border-radius: var(--radius-md); padding: 14px 16px;
      display: flex; gap: 12px; margin-bottom: 22px; font-size: .88rem;
    }
    .alert-warning svg { flex-shrink: 0; color: #D97706; margin-top: 1px; }
    .alert-warning strong { display: block; color: #92400e; margin-bottom: 4px; }
    .alert-warning p { color: #78350f; margin: 0; }
    [data-theme="dark"] .alert-warning { background: rgba(120,53,15,.15); border-color: #92400e; }
    [data-theme="dark"] .alert-warning strong, [data-theme="dark"] .alert-warning p { color: #fde68a; }
    .btn-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 28px; flex-wrap: wrap; }
    @media (max-width: 480px) { .btn-row { flex-direction: column-reverse; } .btn-row .btn { width: 100%; } }
  `],
  template: `
<app-shell pageTitle="Signaler un problème">
  <div class="app-main-inner">

    <div class="page-head">
      <div>
        <h1>Signaler un problème</h1>
        <p *ngIf="courseId">Ouvrez un litige pour la course #{{ courseId }}.</p>
      </div>
      <a [routerLink]="backLink()" class="btn btn-secondary btn-sm">
        <svg lucideArrowLeft size="15"></svg> Retour
      </a>
    </div>

    <div class="card">
      <!-- Alerte -->
      <div class="alert-warning">
        <svg lucideAlertTriangle size="18"></svg>
        <div>
          <strong>Attention</strong>
          <p>L'ouverture d'un litige bloque les fonds jusqu'à la décision de l'administrateur.
             Utilisez ce formulaire uniquement si vous n'avez pas pu trouver d'accord à l'amiable dans le chat.</p>
        </div>
      </div>

      <!-- TICK-062 : litige possible seulement sur une course payée en cours ou avec preuves soumises -->
      <div *ngIf="blockedReason() as reason" class="alert-warning" role="alert">
        <svg lucideAlertTriangle size="18"></svg>
        <div>
          <strong>Litige impossible</strong>
          <p>{{ reason }}</p>
        </div>
      </div>

      <form (submit)="onSubmit($event)">

        <!-- Motif -->
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" for="motif">Motif du litige *</label>
          <select id="motif" class="form-select" [(ngModel)]="motifCode" name="motifCode" required>
            <option value="">Sélectionnez un motif…</option>
            <!-- TICK-062 : seuls les motifs du rôle connecté sont proposés (le serveur revérifie) -->
            @for (m of motifs; track m.code) {
              <option [value]="m.code">{{ m.label }}</option>
            }
          </select>
        </div>

        <!-- Description -->
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" for="desc">Description détaillée *</label>
          <textarea id="desc" class="form-textarea" rows="5"
            placeholder="Expliquez clairement ce qui s'est passé. Ces informations seront lues par l'administrateur…"
            [(ngModel)]="description" name="description" required></textarea>
          <p class="form-hint">Soyez précis et factuel. Minimum 20 caractères.</p>
        </div>

        <div class="btn-row">
          <a [routerLink]="backLink()" class="btn btn-ghost">Annuler</a>
          <button type="submit" class="btn btn-danger"
                  [disabled]="!isFormValid() || isSubmitting() || !!blockedReason()">
            <ng-container *ngIf="!isSubmitting()">
              <svg lucideAlertTriangle size="15"></svg>
              Confirmer l'ouverture du litige
            </ng-container>
            <ng-container *ngIf="isSubmitting()">
              <span style="display:inline-block;width:14px;height:14px;margin-right:8px;
                border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;
                animation:spin .7s linear infinite"></span>
              Envoi…
            </ng-container>
          </button>
        </div>

      </form>
    </div>
  </div>
</app-shell>
  `
})
export class DisputeFormComponent implements OnInit {

  courseId!: number;
  motifCode   = '';
  description = '';
  isSubmitting = signal(false);

  /** Motifs proposés selon le rôle : L-C* pour le client, L-F* pour le coursier (TICK-062). */
  motifs: MotifOption[] = CLIENT_MOTIFS;

  /** Raison empêchant l'ouverture (statut de la course), ou null si le litige est possible. */
  blockedReason = signal<string | null>(null);

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private toast:  ToastService,
    private auth:   AuthService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.motifs = this.auth.getCurrentUserRole().toUpperCase() === 'COURIER' ? COURIER_MOTIFS : CLIENT_MOTIFS;
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate([homeForRole(this.auth.getCurrentUserRole())]);
      return;
    }
    // Vérifie le statut avant la saisie (le serveur reste la source de vérité)
    this.http.get<{ status: string }>(`/api/courses/${this.courseId}`).subscribe({
      next: (course) => this.blockedReason.set(this.reasonFor(course.status)),
      error: () => this.blockedReason.set('Impossible de charger la course. Réessayez plus tard.'),
    });
  }

  private reasonFor(status: string): string | null {
    switch (status) {
      case 'IN_PROGRESS':
      case 'OVERDUE':
      case 'PROOFS_SUBMITTED': return null;
      case 'DISPUTED':         return 'Un litige est déjà ouvert pour cette course.';
      case 'PUBLISHED':
      case 'ASSIGNED':         return "La course n'est pas encore payée : discutez avec le coursier ou annulez la course.";
      default:                 return "Cette course est clôturée : un litige n'est plus possible.";
    }
  }

  isFormValid(): boolean {
    return !!this.motifCode && this.description.trim().length >= 20;
  }

  backLink(): string {
    const role = this.auth.getCurrentUserRole().toUpperCase();
    return role === 'COURIER'
      ? `/courier/dashboard`
      : `/client/course-detail/${this.courseId}`;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.isFormValid() || this.isSubmitting() || this.blockedReason()) return;
    this.isSubmitting.set(true);

    const body = { motifCode: this.motifCode, description: this.description };

    this.http.post(`/api/disputes?courseId=${this.courseId}`, body).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Litige ouvert. L\'admin va examiner votre dossier.');
        setTimeout(() => this.router.navigate([homeForRole(this.auth.getCurrentUserRole())]), 1800);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'ouverture du litige.');
      }
    });
  }
}
