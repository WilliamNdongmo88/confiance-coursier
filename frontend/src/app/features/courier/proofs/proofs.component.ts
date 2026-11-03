import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import { CourseService } from '../../../core/services/course.service';
import {
  LucideVideo,
  LucideCamera,
  LucideReceipt,
  LucideMessageCircle,
  LucideImagePlus,
  LucideFileText,
  LucideImage,
  LucideX,
  LucideSend,
  LucideArrowLeft,
  LucideInfo,
  LucideFilm,
} from '@lucide/angular';

/** Représente un fichier sélectionné en attente d'envoi. */
interface ProofFile {
  id: string;
  file: File;
  proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT';
  uploaded: boolean;
  error?: string;
}

const MAX_FILE_SIZE_MB  = 10;
const MAX_VIDEO_SIZE_MB = 50;
const ALLOWED_IMAGE_TYPES   = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES   = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ALLOWED_RECEIPT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

@Component({
  selector: 'app-proofs',
  standalone: true,
  imports: [
    RouterLink,
    NgFor,
    NgIf,
    DecimalPipe,
    FormsModule,
    AppShellComponent,
    LucideVideo,
    LucideCamera,
    LucideReceipt,
    LucideMessageCircle,
    LucideImagePlus,
    LucideFileText,
    LucideImage,
    LucideX,
    LucideSend,
    LucideArrowLeft,
    LucideInfo,
    LucideFilm,
  ],
  styles: [`
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: var(--radius-md);
      padding: 28px 16px;
      text-align: center;
      cursor: pointer;
      background: var(--bg);
      transition: border-color .15s, background .15s;
    }
    .upload-zone:hover {
      border-color: var(--primary);
      background: var(--primary-light, #f0fdf4);
    }
    .upload-zone.has-error { border-color: #dc2626; }

    .proof-items { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .proof-item-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--bg);
      border: 1px solid var(--border); border-radius: var(--radius-md);
    }
    .proof-item-row.uploaded  { border-color: #16a34a; background: #f0fdf4; }
    .proof-item-row.has-error { border-color: #dc2626; background: #fef2f2; }
    .proof-item-info { flex: 1; min-width: 0; }
    .proof-item-info strong {
      font-size: .88rem; color: var(--text); display: block;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .proof-item-info span { font-size: .76rem; color: var(--text-muted); }
    .proof-item-remove {
      border: none; background: none; color: #dc2626;
      cursor: pointer; padding: 4px; border-radius: 6px; flex-shrink: 0;
    }
    .proof-item-remove:disabled { opacity: .4; cursor: not-allowed; }

    .section-label {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: .95rem; color: var(--text); margin-bottom: 14px;
    }
    .section-label .badge { margin-left: auto; }

    .progress-bar-outer {
      height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; margin-top: 12px;
    }
    .progress-bar-inner {
      height: 100%; background: var(--primary, #123b32); border-radius: 99px; transition: width .2s;
    }
    .upload-hint  { font-size: .74rem; color: var(--text-muted); margin-top: 6px; }
    .file-error   { font-size: .78rem; color: #dc2626; margin-top: 4px; }

    @keyframes spin { to { transform: rotate(360deg); } }

    [data-theme="dark"] .proof-item-row.uploaded  { background: rgba(22,163,74,.12); }
    [data-theme="dark"] .proof-item-row.has-error { background: rgba(220,38,38,.1); }
    [data-theme="dark"] .upload-zone:hover        { background: rgba(18,59,50,.2); }
  `],
  template: `
<app-shell pageTitle="Preuves de la course">
  <div class="app-main-inner">

    <!-- En-tête -->
    <div class="page-head">
      <div>
        <h1>Envoyer les preuves</h1>
        <p class="text-muted" *ngIf="courseId">Course #{{ courseId }}</p>
      </div>
      <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
        <svg lucideArrowLeft size="15"></svg> Retour
      </a>
    </div>

    <!-- Notice -->
    <div class="app-notice" style="margin-bottom:20px">
      <svg lucideInfo></svg>
      <div>
        <strong>Preuves requises par le client</strong>
        <span>Au moins 1 photo obligatoire. Vidéo (≤ {{ MAX_VIDEO_MB }} Mo) et reçus si applicable.</span>
      </div>
    </div>

    <form (submit)="onSubmit($event)">

      <!-- ── Vidéo ── -->
      <div class="card" style="margin-bottom:18px">
        <div class="section-label">
          <svg lucideVideo size="17" style="color:var(--primary)"></svg>
          Vidéo de la course
          <span class="badge badge-gray" style="font-size:.7rem">Optionnel</span>
        </div>

        <div *ngIf="!videoFile()">
          <input #videoInput type="file"
                 accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                 style="display:none" (change)="onVideoSelected($event)">
          <div class="upload-zone" [class.has-error]="videoError()" (click)="videoInput.click()">
            <svg lucideFilm size="32" style="color:var(--text-muted)"></svg>
            <p class="text-sm text-muted" style="margin:6px 0 0">Importez une vidéo de la course</p>
            <p class="text-sm" style="color:var(--primary);margin-top:4px;font-weight:600">Cliquez pour ajouter</p>
          </div>
          <p class="upload-hint">MP4, MOV, WebM · max {{ MAX_VIDEO_MB }} Mo</p>
          <p class="file-error" *ngIf="videoError()">{{ videoError() }}</p>
        </div>

        <div *ngIf="videoFile()">
          <div class="proof-items">
            <div class="proof-item-row"
                 [class.uploaded]="videoUploaded()"
                 [class.has-error]="videoUploadError()">
              <svg lucideVideo size="18" style="color:var(--primary)"></svg>
              <div class="proof-item-info">
                <strong>{{ videoFile()!.name }}</strong>
                <span>{{ (videoFile()!.size / 1024 / 1024 | number:'1.1-1') }} Mo
                  <span *ngIf="videoUploaded()" style="color:#16a34a"> · Envoyé ✓</span>
                  <span *ngIf="videoUploadError()" style="color:#dc2626"> · Échec</span>
                </span>
              </div>
              <button class="proof-item-remove" type="button"
                      [disabled]="isSubmitting()" (click)="removeVideo()">
                <svg lucideX size="15"></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Photos ── -->
      <div class="card" style="margin-bottom:18px">
        <div class="section-label">
          <svg lucideCamera size="17" style="color:var(--primary)"></svg>
          Photos *
          <span class="badge badge-warning" style="font-size:.7rem">Min. 1 photo</span>
        </div>

        <input #photoInput type="file" accept="image/jpeg,image/png,image/webp"
               style="display:none" multiple (change)="onPhotosSelected($event)">
        <div class="upload-zone" [class.has-error]="photoError()" (click)="photoInput.click()">
          <svg lucideImagePlus size="32" style="color:var(--text-muted)"></svg>
          <p class="text-sm text-muted" style="margin:6px 0 0">Ajoutez des photos de la course</p>
          <p class="text-sm" style="color:var(--primary);margin-top:4px;font-weight:600">
            Cliquez pour ajouter ({{ photos().length }}/10)
          </p>
        </div>
        <p class="upload-hint">JPG, PNG, WebP · max {{ MAX_FILE_MB }} Mo par fichier</p>
        <p class="file-error" *ngIf="photoError()">{{ photoError() }}</p>

        <div class="proof-items" *ngIf="photos().length > 0">
          <div *ngFor="let p of photos()"
               class="proof-item-row"
               [class.uploaded]="p.uploaded"
               [class.has-error]="!!p.error">
            <svg lucideImage size="18" style="color:var(--primary)"></svg>
            <div class="proof-item-info">
              <strong>{{ p.file.name }}</strong>
              <span>{{ (p.file.size / 1024 / 1024 | number:'1.1-1') }} Mo
                <span *ngIf="p.uploaded" style="color:#16a34a"> · Envoyé ✓</span>
                <span *ngIf="p.error" style="color:#dc2626"> · {{ p.error }}</span>
              </span>
            </div>
            <button class="proof-item-remove" type="button"
                    [disabled]="isSubmitting()" (click)="removePhoto(p.id)">
              <svg lucideX size="15"></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Reçus ── -->
      <div class="card" style="margin-bottom:18px">
        <div class="section-label">
          <svg lucideReceipt size="17" style="color:var(--primary)"></svg>
          Reçus d'achat
          <span class="badge badge-gray" style="font-size:.7rem">Si applicable</span>
        </div>

        <input #receiptInput type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
               style="display:none" multiple (change)="onReceiptsSelected($event)">
        <div class="upload-zone" [class.has-error]="receiptError()" (click)="receiptInput.click()">
          <svg lucideFileText size="32" style="color:var(--text-muted)"></svg>
          <p class="text-sm text-muted" style="margin:6px 0 0">Photo ou scan des reçus de caisse</p>
          <p class="text-sm" style="color:var(--primary);margin-top:4px;font-weight:600">
            Cliquez pour ajouter ({{ receipts().length }})
          </p>
        </div>
        <p class="upload-hint">JPG, PNG, PDF · max {{ MAX_FILE_MB }} Mo par fichier</p>
        <p class="file-error" *ngIf="receiptError()">{{ receiptError() }}</p>

        <div class="proof-items" *ngIf="receipts().length > 0">
          <div *ngFor="let r of receipts()"
               class="proof-item-row"
               [class.uploaded]="r.uploaded"
               [class.has-error]="!!r.error">
            <svg lucideFileText size="18" style="color:var(--primary)"></svg>
            <div class="proof-item-info">
              <strong>{{ r.file.name }}</strong>
              <span>{{ (r.file.size / 1024 / 1024 | number:'1.1-1') }} Mo
                <span *ngIf="r.uploaded" style="color:#16a34a"> · Envoyé ✓</span>
                <span *ngIf="r.error" style="color:#dc2626"> · {{ r.error }}</span>
              </span>
            </div>
            <button class="proof-item-remove" type="button"
                    [disabled]="isSubmitting()" (click)="removeReceipt(r.id)">
              <svg lucideX size="15"></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Message au client ── -->
      <div class="card" style="margin-bottom:22px">
        <div class="section-label">
          <svg lucideMessageCircle size="17" style="color:var(--primary)"></svg>
          Message au client (optionnel)
        </div>
        <textarea class="form-textarea" rows="3"
          placeholder="Ex: J'ai bien effectué tous les achats. Les médicaments sont conditionnés dans un sachet scellé."
          [(ngModel)]="noteClient" name="noteClient"></textarea>
        <p class="upload-hint">Ce message est visible par le client avec vos preuves.</p>
      </div>

      <!-- ── Barre de progression ── -->
      <div *ngIf="isSubmitting()" style="margin-bottom:18px">
        <p class="text-sm text-muted" style="margin-bottom:6px">Envoi en cours… {{ uploadProgress() }}%</p>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" [style.width.%]="uploadProgress()"></div>
        </div>
      </div>

      <!-- ── Bouton submit ── -->
      <button type="submit" class="btn btn-primary btn-lg"
              style="width:100%"
              [disabled]="!isFormValid() || isSubmitting()">
        <ng-container *ngIf="!isSubmitting()">
          <svg lucideSend size="17"></svg>
          Envoyer les preuves au client
        </ng-container>
        <ng-container *ngIf="isSubmitting()">
          <span style="display:inline-block;width:16px;height:16px;margin-right:8px;
            border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;
            animation:spin .7s linear infinite"></span>
          Envoi en cours…
        </ng-container>
      </button>

    </form>
  </div>
</app-shell>
  `
})
export class ProofsComponent implements OnInit {

  readonly MAX_FILE_MB  = MAX_FILE_SIZE_MB;
  readonly MAX_VIDEO_MB = MAX_VIDEO_SIZE_MB;

  courseId!: number;

  videoFile        = signal<File | null>(null);
  videoError       = signal<string>('');
  videoUploaded    = signal(false);
  videoUploadError = signal(false);

  photos     = signal<ProofFile[]>([]);
  photoError = signal<string>('');

  receipts     = signal<ProofFile[]>([]);
  receiptError = signal<string>('');

  isSubmitting   = signal(false);
  uploadProgress = signal(0);

  noteClient = '';

  isFormValid = computed(() =>
    this.photos().length > 0 &&
    this.photos().every(p => !p.error) &&
    this.receipts().every(r => !r.error) &&
    !this.photoError() &&
    !this.videoError()
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate(['/courier/dashboard']);
    }
  }

  // ── Vidéo ─────────────────────────────────────────────────────────────────
  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const err = this.validateFile(file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE_MB);
    if (err) { this.videoError.set(err); return; }
    this.videoError.set('');
    this.videoFile.set(file);
    this.videoUploaded.set(false);
    this.videoUploadError.set(false);
  }

  removeVideo(): void {
    this.videoFile.set(null);
    this.videoError.set('');
    this.videoUploaded.set(false);
    this.videoUploadError.set(false);
  }

  // ── Photos ────────────────────────────────────────────────────────────────
  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.photoError.set('');

    for (const file of files) {
      if (this.photos().length >= 10) {
        this.photoError.set('Maximum 10 photos atteint.');
        break;
      }
      const err = this.validateFile(file, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_MB);
      this.photos.update(list => [...list, {
        id: crypto.randomUUID(),
        file,
        proofType: 'PHOTO',
        uploaded: false,
        error: err || undefined,
      }]);
    }
  }

  removePhoto(id: string): void {
    this.photos.update(list => list.filter(p => p.id !== id));
    this.photoError.set('');
  }

  // ── Reçus ─────────────────────────────────────────────────────────────────
  onReceiptsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.receiptError.set('');

    for (const file of files) {
      const err = this.validateFile(file, ALLOWED_RECEIPT_TYPES, MAX_FILE_SIZE_MB);
      this.receipts.update(list => [...list, {
        id: crypto.randomUUID(),
        file,
        proofType: 'RECEIPT',
        uploaded: false,
        error: err || undefined,
      }]);
    }
  }

  removeReceipt(id: string): void {
    this.receipts.update(list => list.filter(r => r.id !== id));
    this.receiptError.set('');
  }

  // ── Soumission séquentielle ────────────────────────────────────────────────
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.isFormValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.uploadProgress.set(0);

    const toUpload: Array<{ file: File; proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT'; id?: string }> = [];
    if (this.videoFile()) toUpload.push({ file: this.videoFile()!, proofType: 'VIDEO' });
    for (const p of this.photos())   toUpload.push({ file: p.file, proofType: 'PHOTO',   id: p.id });
    for (const r of this.receipts()) toUpload.push({ file: r.file, proofType: 'RECEIPT', id: r.id });

    let successCount = 0;
    let failCount    = 0;

    for (let i = 0; i < toUpload.length; i++) {
      const item = toUpload[i];
      try {
        await this.uploadOne(item.file, item.proofType);
        successCount++;
        if (item.proofType === 'VIDEO') this.videoUploaded.set(true);
        if (item.proofType === 'PHOTO' && item.id) {
          this.photos.update(list => list.map(p => p.id === item.id ? { ...p, uploaded: true } : p));
        }
        if (item.proofType === 'RECEIPT' && item.id) {
          this.receipts.update(list => list.map(r => r.id === item.id ? { ...r, uploaded: true } : r));
        }
      } catch (err: any) {
        failCount++;
        const msg: string = err?.error?.message ?? 'Échec';
        if (item.proofType === 'VIDEO') this.videoUploadError.set(true);
        if (item.proofType === 'PHOTO' && item.id) {
          this.photos.update(list => list.map(p => p.id === item.id ? { ...p, error: msg } : p));
        }
        if (item.proofType === 'RECEIPT' && item.id) {
          this.receipts.update(list => list.map(r => r.id === item.id ? { ...r, error: msg } : r));
        }
      }
      this.uploadProgress.set(Math.round(((i + 1) / toUpload.length) * 100));
    }

    this.isSubmitting.set(false);

    if (failCount === 0) {
      this.toast.success('Preuves envoyées ! Le client va les examiner.');
      setTimeout(() => this.router.navigate(['/courier/dashboard']), 1800);
    } else if (successCount > 0) {
      this.toast.error(`${failCount} fichier(s) n'ont pas pu être envoyés. Réessayez.`);
    } else {
      this.toast.error('Aucune preuve n\'a pu être envoyée. Vérifiez votre connexion.');
    }
  }

  private uploadOne(file: File, proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.courseService.submitProof(this.courseId, file, proofType).subscribe({
        next: (event) => { if (event.type === HttpEventType.Response) resolve(); },
        error: (err) => reject(err),
      });
    });
  }

  private validateFile(file: File, allowedTypes: string[], maxMb: number): string {
    if (file.size > maxMb * 1024 * 1024) {
      return `Fichier trop volumineux (max ${maxMb} Mo). Taille : ${(file.size / 1024 / 1024).toFixed(1)} Mo.`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `Type de fichier non accepté (${file.type || 'inconnu'}).`;
    }
    return '';
  }
}
