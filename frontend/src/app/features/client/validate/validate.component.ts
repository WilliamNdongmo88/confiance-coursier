import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import { ToastService } from '../../../core/services/toast.service';
import { CourseService } from '../../../core/services/course.service';
import {
  LucideCamera, LucideCheckCircle, LucideAlertTriangle, LucideArrowLeft,
  LucideVideo, LucideFileText, LucidePlayCircle, LucideClock, LucideInfo,
} from '@lucide/angular';

interface ProofItem {
  id: number;
  proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT';
  presignedUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-validate',
  standalone: true,
  imports: [
    RouterLink,
    NgFor, NgIf, DatePipe,
    AppShellComponent,
    MediaViewerComponent,
    LucideCamera, LucideCheckCircle, LucideAlertTriangle, LucideArrowLeft,
    LucideVideo, LucideFileText, LucidePlayCircle, LucideClock, LucideInfo,
  ],
  styles: [`
    .proof-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }
    .proof-item {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow .15s;
    }
    .proof-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,.12); }
    .proof-media {
      width: 100%; height: 155px;
      background: #111;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); position: relative; overflow: hidden;
    }
    .proof-media img  { width: 100%; height: 100%; object-fit: cover; }
    .proof-media .play-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.45); color: white;
    }
    .proof-type-icon { opacity: .5; }
    .proof-info { padding: 10px; font-size: .8rem; }
    .proof-info .title  { font-weight: 600; color: var(--text); margin-bottom: 3px; }
    .proof-info .meta   { color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

    .action-box {
      background: var(--bg-card);
      border: 1px solid var(--primary);
      border-radius: var(--radius-lg);
      padding: 30px; text-align: center;
    }
    .action-box h3 { font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 8px; }
    .action-box p  { font-size: .9rem; color: var(--text-muted); margin-bottom: 22px; }
    .action-buttons {
      display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;
    }
    .action-buttons .btn { min-width: 180px; }

    /* Countdown 72h */
    .countdown-box {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: .88rem; color: var(--text-muted);
    }
    .countdown-box strong { color: var(--text); }

    .section-label {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: .95rem; color: var(--text); margin-bottom: 16px;
    }

    @media (max-width: 640px) {
      .action-buttons { flex-direction: column; }
      .action-buttons .btn { width: 100%; min-width: unset; }
    }
  `],
  template: `
<app-shell pageTitle="Validation de la course">
  <div class="app-main-inner">

    <!-- En-tête -->
    <div class="page-head">
      <div>
        <h1>Validation de la course</h1>
        <p>Vérifiez les preuves fournies par le coursier avant de valider.</p>
      </div>
      <a [routerLink]="['/client/course-detail', courseId]" class="btn btn-secondary btn-sm">
        <svg lucideArrowLeft size="15"></svg> Retour
      </a>
    </div>

    <!-- Chargement -->
    <div *ngIf="isLoading()" style="text-align:center;padding:40px">
      <span style="display:inline-block;width:28px;height:28px;border:3px solid var(--border);
        border-top-color:var(--primary);border-radius:50%;animation:spin .7s linear infinite"></span>
      <p class="text-muted" style="margin-top:12px">Chargement des preuves…</p>
    </div>

    <ng-container *ngIf="!isLoading()">

      <!-- Countdown auto-validation -->
      <div class="countdown-box" *ngIf="autoValidateAt()">
        <svg lucideClock size="16"></svg>
        <span>Validation automatique dans <strong>{{ countdown() }}</strong>
          si vous n'agissez pas.</span>
      </div>

      <!-- Preuves -->
      <div class="card" style="margin-bottom:22px">
        <div class="section-label">
          <svg lucideCamera size="17" style="color:var(--primary)"></svg>
          Preuves soumises par le coursier
        </div>

        <!-- Aucune preuve -->
        <div *ngIf="proofs().length === 0"
             style="text-align:center;padding:28px;color:var(--text-muted)">
          <svg lucideInfo size="32"></svg>
          <p style="margin-top:8px">Aucune preuve disponible pour l'instant.</p>
        </div>

        <!-- Grille de preuves -->
        <div class="proof-grid" *ngIf="proofs().length > 0">
          <div class="proof-item" *ngFor="let p of proofs()" (click)="openProof(p)">
            <div class="proof-media">
              <!-- Image -->
              <ng-container *ngIf="p.proofType === 'PHOTO'">
                <img [src]="p.presignedUrl" [alt]="proofLabel(p.proofType)" loading="lazy">
              </ng-container>
              <!-- Vidéo -->
              <ng-container *ngIf="p.proofType === 'VIDEO'">
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text-muted)">
                  <svg lucideVideo size="40" class="proof-type-icon"></svg>
                  <span style="font-size:.75rem">Cliquez pour ouvrir</span>
                </div>
                <div class="play-overlay">
                  <svg lucidePlayCircle size="44"></svg>
                </div>
              </ng-container>
              <!-- Reçu (PDF ou image) -->
              <ng-container *ngIf="p.proofType === 'RECEIPT'">
                <ng-container *ngIf="isImage(p.mimeType)">
                  <img [src]="p.presignedUrl" [alt]="proofLabel(p.proofType)" loading="lazy">
                </ng-container>
                <ng-container *ngIf="!isImage(p.mimeType)">
                  <svg lucideFileText size="40" class="proof-type-icon"></svg>
                </ng-container>
              </ng-container>
            </div>
            <div class="proof-info">
              <div class="title">{{ proofLabel(p.proofType) }}</div>
              <div class="meta">
                <svg lucideClock size="11"></svg>
                {{ p.uploadedAt | date:'HH:mm · dd/MM/yyyy' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action de validation -->
      <div class="action-box">
        <h3>La course est-elle correctement terminée ?</h3>
        <p>En validant, vous libérez définitivement les fonds au coursier (Escrow).
           Cette action est <strong>irréversible</strong>.</p>
        <div class="action-buttons">
          <button class="btn btn-primary btn-lg"
                  [disabled]="isValidating()"
                  (click)="validateCourse()">
            <ng-container *ngIf="!isValidating()">
              <svg lucideCheckCircle size="18"></svg>
              Oui, valider la course
            </ng-container>
            <ng-container *ngIf="isValidating()">
              <span style="display:inline-block;width:16px;height:16px;margin-right:8px;
                border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;
                animation:spin .7s linear infinite"></span>
              Validation…
            </ng-container>
          </button>
          <a [routerLink]="['/client/dispute-form', courseId]"
             class="btn btn-danger">
            <svg lucideAlertTriangle size="18"></svg>
            Signaler un problème
          </a>
        </div>
      </div>

    </ng-container>

    <!-- Modal prévisualisation preuves -->
    <app-media-viewer
      [items]="viewerItems()"
      [activeIndex]="viewerIndex()"
      [open]="viewerOpen()"
      (close)="viewerOpen.set(false)">
    </app-media-viewer>

  </div>
</app-shell>
  `
})
export class ValidateComponent implements OnInit {

  courseId!: number;

  proofs         = signal<ProofItem[]>([]);
  isLoading      = signal(true);
  isValidating   = signal(false);
  autoValidateAt = signal<string | null>(null);
  countdown      = signal<string>('—');

  // ─── Media viewer ─────────────────────────────────────────────────────────
  viewerOpen  = signal(false);
  viewerItems = signal<MediaItem[]>([]);
  viewerIndex = signal(0);

  private countdownInterval?: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private courseService: CourseService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate(['/client/dashboard']);
      return;
    }
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  private loadData(): void {
    // Charge les preuves
    this.courseService.getProofs(this.courseId).subscribe({
      next: (data) => {
        this.proofs.set(data as ProofItem[]);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Impossible de charger les preuves.');
        this.isLoading.set(false);
      }
    });

    // Charge les infos de la course pour récupérer autoValidateAt
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: any) => {
        if (course.autoValidateAt) {
          this.autoValidateAt.set(course.autoValidateAt);
          this.startCountdown(new Date(course.autoValidateAt));
        }
      },
      error: () => {} // silencieux
    });
  }

  validateCourse(): void {
    if (this.isValidating()) return;
    this.isValidating.set(true);

    this.http.post(`/api/courses/${this.courseId}/validate`, {}, { responseType: 'text' }).subscribe({
      next: () => {
        this.isValidating.set(false);
        this.toast.success('Course validée ! Les fonds ont été libérés au coursier.');
        // Redirige vers la notation (TICK-033)
        setTimeout(() => this.router.navigate(['/client/rate', this.courseId]), 1800);
      },
      error: (err) => {
        this.isValidating.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de la validation.';
        this.toast.error(msg);
      }
    });
  }

  openProof(proof: ProofItem): void {
    // Détermine le type media
    let type: 'image' | 'video' | 'pdf' = 'image';
    if (proof.proofType === 'VIDEO') type = 'video';
    else if (proof.mimeType === 'application/pdf') type = 'pdf';

    // Construit la liste de tous les médias (pour navigation avec flèches)
    const items: MediaItem[] = this.proofs().map(p => ({
      url: p.presignedUrl,
      type: p.proofType === 'VIDEO'
        ? 'video'
        : p.mimeType === 'application/pdf' ? 'pdf' : 'image',
      label: this.proofLabel(p.proofType),
    }));

    const idx = this.proofs().findIndex(p => p.id === proof.id);
    this.viewerItems.set(items);
    this.viewerIndex.set(idx >= 0 ? idx : 0);
    this.viewerOpen.set(true);
  }

  proofLabel(type: string): string {
    switch (type) {
      case 'PHOTO':   return 'Photo de la course';
      case 'VIDEO':   return 'Vidéo de la course';
      case 'RECEIPT': return 'Reçu d\'achat';
      default:        return 'Preuve';
    }
  }

  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') ?? false;
  }

  private startCountdown(targetDate: Date): void {
    const update = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        this.countdown.set('Validation automatique imminente');
        clearInterval(this.countdownInterval);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      this.countdown.set(`${h}h ${m}min`);
    };
    update();
    this.countdownInterval = setInterval(update, 60000);
  }
}
