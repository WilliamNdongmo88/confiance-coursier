import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideStar,
  LucideSend,
  LucideArrowLeft,
  LucideInfo,
} from '@lucide/angular';

const STAR_LABELS: Record<number, string> = {
  1: 'Très mauvais',
  2: 'Mauvais',
  3: 'Correct',
  4: 'Bien',
  5: 'Excellent !',
};

@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [
    RouterLink,
    NgFor,
    NgIf,
    FormsModule,
    LucideStar,
    LucideSend,
    LucideArrowLeft,
    LucideInfo,
  ],
  styles: [`
    .rate-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 36px 32px;
      text-align: center;
    }
    .rate-avatar {
      width: 76px; height: 76px; border-radius: 50%;
      background: var(--primary-light, #d7ed9a); color: var(--primary, #123b32);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.8rem; margin: 0 auto 14px;
    }
    .rate-title    { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .rate-subtitle { color: var(--text-muted); font-size: .93rem; margin-bottom: 28px; }

    /* Étoiles interactives */
    .star-rating {
      display: flex; justify-content: center; gap: 10px; margin-bottom: 12px;
    }
    .star-btn {
      background: none; border: none; padding: 4px; cursor: pointer;
      color: var(--gray-300, #d1d5db);
      transition: transform .15s, color .15s;
    }
    .star-btn:hover   { transform: scale(1.2); }
    .star-btn.active  { color: #F59E0B; }
    .star-btn svg     { display: block; }

    .rating-label {
      font-size: .9rem; font-weight: 600; min-height: 1.4em;
      margin-bottom: 24px; transition: color .15s;
    }
    .rating-label.good { color: var(--success, #16a34a); }
    .rating-label.bad  { color: var(--danger, #dc2626); }
    .rating-label.muted { color: var(--text-muted); }

    .notice-box {
      background: var(--warning-light, #fffbeb);
      padding: 12px 14px; border-radius: var(--radius-md);
      font-size: .83rem; margin-bottom: 22px;
      text-align: left; display: flex; gap: 8px;
      color: var(--text-muted);
    }
    .notice-box svg { flex-shrink: 0; color: #D97706; margin-top: 1px; }

    @media (max-width: 640px) {
      .rate-card { padding: 26px 18px; }
    }
  `],
  template: `
  <div class="app-main-inner">

    <!-- En-tête -->
    <div class="page-head">
      <div>
        <h1>{{ role() === 'CLIENT' ? 'Notez votre coursier' : 'Notez votre client' }}</h1>
        <p>Votre avis aide à maintenir la qualité des échanges.</p>
      </div>
      <a [routerLink]="backLink()" class="btn btn-secondary btn-sm">
        <svg lucideArrowLeft size="15"></svg> Retour
      </a>
    </div>

    <!-- Carte de notation -->
    <div class="rate-card">
      <!-- Avatar initiales -->
      <div class="rate-avatar">{{ targetInitials() }}</div>

      <h2 class="rate-title">Notez votre expérience</h2>
      <p class="rate-subtitle">
        Comment s'est passée votre course avec
        <strong>{{ targetName() }}</strong> ?
      </p>

      <form (submit)="onSubmit($event)">

        <!-- Étoiles -->
        <div class="star-rating" (mouseleave)="hoveredStar.set(0)">
          <button *ngFor="let n of [1,2,3,4,5]"
                  type="button"
                  class="star-btn"
                  [class.active]="n <= (hoveredStar() || selectedStar())"
                  (mouseenter)="hoveredStar.set(n)"
                  (click)="selectStar(n)"
                  [attr.aria-label]="'Note ' + n + ' étoile' + (n > 1 ? 's' : '')">
            <svg lucideStar size="42"></svg>
          </button>
        </div>

        <!-- Label contextuel -->
        <p class="rating-label"
           [class.good]="(hoveredStar() || selectedStar()) >= 3"
           [class.bad]="(hoveredStar() || selectedStar()) > 0 && (hoveredStar() || selectedStar()) < 3"
           [class.muted]="!(hoveredStar() || selectedStar())">
          {{ starLabel() }}
        </p>

        <!-- Commentaire -->
        <div class="form-group" style="text-align:left;margin-bottom:20px">
          <label class="form-label" for="comment">Commentaire (optionnel)</label>
          <textarea id="comment" class="form-textarea" rows="3"
            [placeholder]="role() === 'CLIENT'
              ? 'Ex: Coursier très réactif, preuves claires, merci !'
              : 'Ex: Client clair dans sa demande, communication fluide.'"
            [(ngModel)]="comment" name="comment"></textarea>
        </div>

        <!-- Notice info -->
        <div class="notice-box" *ngIf="role() === 'CLIENT'">
          <svg lucideInfo size="16"></svg>
          <span>La note aide à maintenir la qualité de la plateforme et met à jour le profil de confiance du coursier.</span>
        </div>

        <!-- Bouton submit -->
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%"
                [disabled]="!selectedStar() || isSubmitting()">
          <ng-container *ngIf="!isSubmitting()">
            Envoyer la note
            <svg lucideSend size="17" style="margin-left:5px"></svg>
          </ng-container>
          <ng-container *ngIf="isSubmitting()">
            <span style="display:inline-block;width:16px;height:16px;margin-right:8px;
              border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;
              animation:spin .7s linear infinite"></span>
            Envoi…
          </ng-container>
        </button>

      </form>
    </div>

  </div>
  `
})
export class RateComponent implements OnInit {

  courseId!: number;
  role     = signal<'CLIENT' | 'COURIER'>('CLIENT');

  // Données de la course (chargées depuis le backend)
  targetName_     = signal<string>('...');
  targetInitials_ = signal<string>('?');

  hoveredStar  = signal(0);
  selectedStar = signal(0);
  comment      = '';
  isSubmitting = signal(false);

  targetName     = this.targetName_;
  targetInitials = this.targetInitials_;

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private http:    HttpClient,
    private auth:    AuthService,
    private toast:   ToastService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    const userRole = (this.auth.getCurrentUserRole() ?? 'CLIENT').toUpperCase();
    this.role.set(userRole === 'COURIER' ? 'COURIER' : 'CLIENT');

    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate([this.role() === 'CLIENT' ? '/client/dashboard' : '/courier/dashboard']);
      return;
    }

    this.loadCourse();
  }

  private loadCourse(): void {
    this.http.get<any>(`/api/courses/${this.courseId}`).subscribe({
      next: (course) => {
        // TICK-073 : vrais noms (fournis par l'API depuis TICK-070)
        const name: string = this.role() === 'CLIENT'
          ? (course.courierName || 'votre coursier')
          : (course.clientName || 'votre client');
        this.targetName_.set(name);
        this.targetInitials_.set(name.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('') || '?');
        if (course.status === 'COMPLETED' && course.reviewDue === false) {
          this.toast.info('Vous avez déjà noté cette course.');
          this.router.navigate([this.role() === 'CLIENT' ? '/client/dashboard' : '/courier/dashboard']);
        }
      },
      error: () => {
        // Silencieux — les noms sont cosmétiques
      }
    });
  }

  selectStar(n: number): void {
    this.selectedStar.set(n);
  }

  starLabel(): string {
    const active = this.hoveredStar() || this.selectedStar();
    return active ? STAR_LABELS[active] : 'Sélectionnez une note';
  }

  backLink(): string {
    return this.role() === 'CLIENT'
      ? `/client/course-detail/${this.courseId}`
      : `/courier/dashboard`;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.selectedStar() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const body = { stars: this.selectedStar(), comment: this.comment || null };

    this.http.post(`/api/courses/${this.courseId}/review`, body).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Note envoyée. Merci pour votre retour !');
        const dest = this.role() === 'CLIENT' ? '/client/dashboard' : '/courier/dashboard';
        setTimeout(() => this.router.navigate([dest]), 1800);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de l\'envoi de la note.';
        this.toast.error(msg);
      }
    });
  }
}
