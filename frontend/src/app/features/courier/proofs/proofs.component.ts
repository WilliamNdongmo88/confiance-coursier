import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { CourseService } from '../../../core/services/course.service';
import {
  LucideVideo,
  LucideCamera,
  LucideReceipt,
  LucideImagePlus,
  LucideFileText,
  LucideImage,
  LucideX,
  LucideSend,
  LucideArrowLeft,
  LucideInfo,
  LucideFilm,
} from '@lucide/angular';

type ProofType = 'PHOTO' | 'VIDEO' | 'RECEIPT';

/**
 * Une preuve affichée : soit déjà reçue par le serveur (brouillon enregistré),
 * soit un fichier local en attente / en cours / en échec d'envoi.
 */
interface ProofItem {
  key: string;
  proofType: ProofType;
  name: string;
  size: number;
  state: 'pending' | 'uploading' | 'done' | 'error';
  serverId?: number;   // id côté serveur une fois reçu
  file?: File;         // fichier local tant qu'il n'est pas reçu
  error?: string;
  durationMs?: number | null;
}

// Mêmes limites que le serveur (ProofService) — TICK-064
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 60;
/** Doit rester égal à ProofService.MAX_VIDEO_SECONDS côté serveur. */
const MAX_VIDEO_SECONDS = 30;
const MAX_PROOFS = 10;

@Component({
  selector: 'app-proofs',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    NgTemplateOutlet,
    LucideVideo,
    LucideCamera,
    LucideReceipt,
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
    .upload-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .upload-actions .btn { flex: 1 1 140px; min-height: 48px; justify-content: center; }

    .proof-items { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .proof-item-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--bg);
      border: 1px solid var(--border); border-radius: var(--radius-md);
    }
    .proof-item-row.done      { border-color: var(--success); }
    .proof-item-row.has-error { border-color: var(--danger); }
    .proof-item-info { flex: 1; min-width: 0; }
    .proof-item-info strong {
      font-size: .88rem; color: var(--text); display: block;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .proof-item-info span { font-size: .76rem; color: var(--text-muted); }
    .state-done  { color: var(--success); }
    .state-error { color: var(--danger); }
    .proof-item-remove {
      border: none; background: none; color: var(--danger);
      cursor: pointer; border-radius: 6px; flex-shrink: 0;
      min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
    }
    .proof-item-remove:disabled { opacity: .4; cursor: not-allowed; }

    .section-label {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: .95rem; color: var(--text); margin-bottom: 14px;
    }
    .section-label .badge { margin-left: auto; }

    .progress-bar-outer { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; margin-top: 8px; }
    .progress-bar-inner { height: 100%; background: var(--primary); border-radius: 99px; transition: width .2s; }
    .upload-hint { font-size: .74rem; color: var(--text-muted); margin-top: 6px; }
    .file-error  { font-size: .78rem; color: var(--danger); margin-top: 6px; }
    .video-refused { display: grid; gap: 4px; margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: .86rem; line-height: 1.45;
      background: var(--cc-danger-bg); border: 1px solid color-mix(in oklab, var(--cc-danger) 45%, transparent); color: var(--cc-ink);
      animation: vr-in .3s cubic-bezier(.16,1,.3,1); }
    .video-refused strong { color: var(--cc-danger); }
    .video-tip { color: var(--cc-ink); opacity: .85; }
    .checklist li.ko { color: var(--cc-danger); font-weight: 650; }
    .missing { margin: 10px 0 0; text-align: center; font-size: .86rem; font-weight: 600; color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .video-refused strong, :host-context([data-theme="dark"]) .checklist li.ko { color: #F0A39C !important; }
    :host-context([data-theme="dark"]) .video-refused, :host-context([data-theme="dark"]) .missing, :host-context([data-theme="dark"]) .video-tip { color: #F3F7F5 !important; }
    @keyframes vr-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .video-refused { animation: none; } }
    .checklist { list-style: none; padding: 0; margin: 8px 0 0; font-size: .85rem; }
    .checklist li { padding: 2px 0; }
    .hidden-input { display: none; }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-mb-20px { margin-bottom: 20px; }
    .st-mb-18px { margin-bottom: 18px; }
    .st-fs-7rem { font-size: .7rem; }
    .st-mb-12px { margin-bottom: 12px; }
    .st-ta-center { text-align: center; }
  `],
  template: `
  <div class="app-main-inner">

    <div class="page-head">
      <div>
        <h1>Envoyer les preuves</h1>
        @if (courseId) { <p class="text-muted">Course #{{ courseId }}</p> }
      </div>
      <a routerLink="/courier/dashboard" class="btn btn-secondary btn-sm">
        <svg lucideArrowLeft size="15"></svg> Retour
      </a>
    </div>

    @if (loading()) {
      <div class="card"><p class="text-muted">Chargement…</p></div>
    } @else if (blockedReason()) {
      <div class="app-notice">
        <svg lucideInfo></svg>
        <div><strong>Envoi impossible</strong><span>{{ blockedReason() }}</span></div>
      </div>
    } @else {

      <div class="app-notice st-mb-20px">
        <svg lucideInfo></svg>
        <div>
          <strong>Preuves obligatoires</strong>
          <ul class="checklist">
            <li [class.ko]="!hasVideo() && videoError()">{{ hasVideo() ? '✓' : (videoError() ? '✗' : '○') }} 1 vidéo de {{ MAX_VIDEO_SECONDS }} s maximum{{ !hasVideo() && videoError() ? ' — vidéo refusée' : '' }}</li>
            <li>{{ hasPhoto() ? '✓' : '○' }} Au moins 1 photo</li>
            @if (receiptsRequired()) {
              <li>{{ hasReceipt() ? '✓' : '○' }} Au moins 1 reçu d'achat ({{ realCosts() | number:'1.0-0' }} XAF d'achats payés)</li>
            }
          </ul>
        </div>
      </div>

      <!-- ── 1. Vidéo ── -->
      <div class="card st-mb-18px">
        <div class="section-label">
          <svg lucideVideo size="17"></svg> 1. Vidéo *
          <span class="badge badge-warning st-fs-7rem">≤ {{ MAX_VIDEO_SECONDS }} s</span>
        </div>
        <input #videoCam type="file" class="hidden-input" accept="video/*" capture="environment" (change)="onVideoSelected($event)">
        <input #videoLib type="file" class="hidden-input" accept="video/*" (change)="onVideoSelected($event)">
        @if (!videoItem()) {
          <div class="upload-actions">
            <button type="button" class="btn btn-primary" (click)="videoCam.click()" [disabled]="busy()">
              <svg lucideFilm size="18"></svg> Filmer
            </button>
            <button type="button" class="btn btn-secondary" (click)="videoLib.click()" [disabled]="busy()">
              <svg lucideImagePlus size="18"></svg> Galerie
            </button>
          </div>
          <p class="upload-hint">MP4, MOV, WebM · {{ MAX_VIDEO_MB }} Mo maximum</p>
        } @else {
          <div class="proof-items">
            <ng-container *ngTemplateOutlet="row; context: { $implicit: videoItem() }"></ng-container>
          </div>
        }
        @if (videoError()) {
          <div class="video-refused" role="alert">
            <strong>Vidéo refusée</strong>
            <span>{{ videoError() }}</span>
            <span class="video-tip">Filmez un nouveau clip court avec « Filmer » (arrêtez avant {{ MAX_VIDEO_SECONDS }} s), ou raccourcissez la vidéo dans votre galerie avant de la choisir.</span>
          </div>
        }
      </div>

      <!-- ── 2. Photos ── -->
      <div class="card st-mb-18px">
        <div class="section-label">
          <svg lucideCamera size="17"></svg> 2. Photos *
          <span class="badge badge-gray st-fs-7rem">{{ items().length }}/{{ MAX_PROOFS }} fichiers</span>
        </div>
        <input #photoCam type="file" class="hidden-input" accept="image/*" capture="environment" (change)="onFilesSelected($event, 'PHOTO')">
        <input #photoLib type="file" class="hidden-input" accept="image/*" multiple (change)="onFilesSelected($event, 'PHOTO')">
        <div class="upload-actions">
          <button type="button" class="btn btn-primary" (click)="photoCam.click()" [disabled]="busy() || full()">
            <svg lucideCamera size="18"></svg> Photographier
          </button>
          <button type="button" class="btn btn-secondary" (click)="photoLib.click()" [disabled]="busy() || full()">
            <svg lucideImagePlus size="18"></svg> Galerie
          </button>
        </div>
        <p class="upload-hint">JPG, PNG, WebP, HEIC · {{ MAX_IMAGE_MB }} Mo maximum par photo</p>
        @if (itemsOf('PHOTO').length > 0) {
          <div class="proof-items">
            @for (it of itemsOf('PHOTO'); track it.key) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: it }"></ng-container>
            }
          </div>
        }
      </div>

      <!-- ── 3. Reçus ── -->
      <div class="card st-mb-18px">
        <div class="section-label">
          <svg lucideReceipt size="17"></svg> 3. Reçus d'achat{{ receiptsRequired() ? ' *' : '' }}
          <span class="badge badge-gray st-fs-7rem">{{ receiptsRequired() ? 'Obligatoire' : 'Si applicable' }}</span>
        </div>
        <input #receiptCam type="file" class="hidden-input" accept="image/*" capture="environment" (change)="onFilesSelected($event, 'RECEIPT')">
        <input #receiptLib type="file" class="hidden-input" accept="image/*,application/pdf" multiple (change)="onFilesSelected($event, 'RECEIPT')">
        <div class="upload-actions">
          <button type="button" class="btn btn-secondary" (click)="receiptCam.click()" [disabled]="busy() || full()">
            <svg lucideCamera size="18"></svg> Photographier
          </button>
          <button type="button" class="btn btn-secondary" (click)="receiptLib.click()" [disabled]="busy() || full()">
            <svg lucideFileText size="18"></svg> Fichier / PDF
          </button>
        </div>
        <p class="upload-hint">JPG, PNG, PDF · {{ MAX_IMAGE_MB }} Mo maximum par fichier</p>
        @if (itemsOf('RECEIPT').length > 0) {
          <div class="proof-items">
            @for (it of itemsOf('RECEIPT'); track it.key) {
              <ng-container *ngTemplateOutlet="row; context: { $implicit: it }"></ng-container>
            }
          </div>
        }
      </div>

      @if (selectionError()) { <p class="file-error st-mb-12px">{{ selectionError() }}</p> }

      <!-- ── Progression (en octets) ── -->
      @if (busy()) {
        <div class="st-mb-18px">
          <p class="text-sm text-muted">
            {{ phase() === 'submitting' ? 'Validation des preuves…' : 'Envoi… ' + progress() + '%' }}
          </p>
          <div class="progress-bar-outer"><div class="progress-bar-inner" [style.width.%]="progress()"></div></div>
        </div>
      }

      <button type="button" class="btn btn-primary btn-lg btn-block" (click)="send()"
              [disabled]="!isComplete() || busy()">
        <svg lucideSend size="17"></svg>
        {{ hasFailures() ? "Réessayer l'envoi" : 'Envoyer les preuves au client' }}
      </button>
      @if (!isComplete()) {
        <p class="missing" role="status">Il manque : {{ missing().join(', ') }}.</p>
      }
    }

    <!-- Ligne de fichier réutilisable -->
    <ng-template #row let-it>
      <div class="proof-item-row" [class.done]="it.state === 'done'" [class.has-error]="it.state === 'error'">
        @switch (it.proofType) {
          @case ('VIDEO')   { <svg lucideVideo size="18"></svg> }
          @case ('RECEIPT') { <svg lucideFileText size="18"></svg> }
          @default          { <svg lucideImage size="18"></svg> }
        }
        <div class="proof-item-info">
          <strong>{{ it.name }}</strong>
          <span>
            {{ (it.size / 1024 / 1024) | number:'1.1-1' }} Mo
            @if (it.durationMs) { · {{ (it.durationMs / 1000) | number:'1.0-1' }} s }
            @switch (it.state) {
              @case ('done')      { <span class="state-done"> · Reçu ✓</span> }
              @case ('uploading') { <span> · Envoi…</span> }
              @case ('error')     { <span class="state-error"> · {{ it.error }}</span> }
              @default            { <span> · À envoyer</span> }
            }
          </span>
        </div>
        <button class="proof-item-remove" type="button" [disabled]="busy()" (click)="remove(it)"
                [attr.aria-label]="'Retirer ' + it.name">
          <svg lucideX size="16"></svg>
        </button>
      </div>
    </ng-template>

  </div>
  `
})
export class ProofsComponent implements OnInit {

  readonly MAX_IMAGE_MB = MAX_IMAGE_MB;
  readonly MAX_VIDEO_MB = MAX_VIDEO_MB;
  readonly MAX_VIDEO_SECONDS = MAX_VIDEO_SECONDS;
  readonly MAX_PROOFS = MAX_PROOFS;

  courseId!: number;

  readonly loading = signal(true);
  readonly blockedReason = signal<string | null>(null);
  readonly realCosts = signal(0);

  readonly items = signal<ProofItem[]>([]);
  readonly videoError = signal('');
  readonly selectionError = signal('');

  readonly phase = signal<'idle' | 'uploading' | 'submitting'>('idle');
  readonly progress = signal(0);

  readonly busy = computed(() => this.phase() !== 'idle');
  readonly full = computed(() => this.items().length >= MAX_PROOFS);
  readonly videoItem = computed(() => this.items().find(i => i.proofType === 'VIDEO') ?? null);
  readonly receiptsRequired = computed(() => this.realCosts() > 0);
  readonly hasVideo = computed(() => this.countUsable('VIDEO') > 0);
  readonly hasPhoto = computed(() => this.countUsable('PHOTO') > 0);
  readonly hasReceipt = computed(() => this.countUsable('RECEIPT') > 0);
  readonly hasFailures = computed(() => this.items().some(i => i.state === 'error'));
  /** Ce qui empêche l'envoi, en clair (affiché sous le bouton grisé). */
  readonly missing = computed(() => {
    const m: string[] = [];
    if (!this.hasVideo()) m.push(`une vidéo de ${MAX_VIDEO_SECONDS} s maximum`);
    if (!this.hasPhoto()) m.push('au moins une photo');
    if (this.receiptsRequired() && !this.hasReceipt()) m.push('au moins un reçu d’achat');
    return m;
  });
  readonly isComplete = computed(() =>
    this.hasVideo() && this.hasPhoto() && (!this.receiptsRequired() || this.hasReceipt()));

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
      return;
    }
    // Contrôle du statut au chargement + reprise des brouillons déjà reçus par le serveur
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: any) => {
        this.realCosts.set(Number(course.realCosts ?? 0));
        if (course.status === 'IN_PROGRESS' || course.status === 'OVERDUE') {
          this.loadDrafts();
        } else {
          this.blockedReason.set(course.status === 'PROOFS_SUBMITTED'
            ? 'Les preuves ont déjà été envoyées : le client les examine.'
            : 'Les preuves ne peuvent être envoyées que pour une course payée en cours.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.blockedReason.set('Impossible de charger la course. Réessayez plus tard.');
        this.loading.set(false);
      },
    });
  }

  private loadDrafts(): void {
    this.courseService.getProofs(this.courseId).subscribe({
      next: (proofs) => {
        this.items.set(proofs.map(p => ({
          key: 'srv-' + p.id,
          proofType: p.proofType,
          name: this.serverName(p),
          size: p.fileSize ?? 0,
          state: 'done' as const,
          serverId: p.id,
          durationMs: p.videoDurationMs,
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  itemsOf(type: ProofType): ProofItem[] {
    return this.items().filter(i => i.proofType === type);
  }

  private countUsable(type: ProofType): number {
    return this.items().filter(i => i.proofType === type && i.state !== 'error').length;
  }

  // ── Sélection ──────────────────────────────────────────────────────────────

  async onVideoSelected(event: Event): Promise<void> {
    await this.pickVideo(event);
    if (this.videoError()) this.toast.error(this.videoError()); // visible même si la section est hors écran
  }

  private async pickVideo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.videoError.set('');
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || (!file.type && /\.(mp4|mov|3gp|webm|m4v)$/i.test(file.name));
    if (!isVideo) { this.videoError.set('Ce fichier n’est pas une vidéo (formats acceptés : MP4, MOV, 3GP, WebM).'); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      this.videoError.set(`Vidéo trop lourde (${this.mb(file.size)} Mo, maximum ${MAX_VIDEO_MB} Mo).`);
      return;
    }
    const seconds = await this.videoDuration(file);
    if (seconds !== null && seconds > MAX_VIDEO_SECONDS + 0.5) {
      this.videoError.set(`La vidéo dure ${Math.round(seconds)} s : ${MAX_VIDEO_SECONDS} secondes maximum.`);
      return;
    }
    if (this.full()) { this.selectionError.set(`Maximum ${MAX_PROOFS} fichiers.`); return; }
    this.items.update(list => [...list, this.localItem(file, 'VIDEO', seconds === null ? null : Math.round(seconds * 1000))]);
  }

  onFilesSelected(event: Event, type: 'PHOTO' | 'RECEIPT'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.selectionError.set('');

    for (const file of files) {
      if (this.full()) { this.selectionError.set(`Maximum ${MAX_PROOFS} fichiers par course.`); break; }
      const okType = file.type.startsWith('image/') || (type === 'RECEIPT' && file.type === 'application/pdf');
      if (!okType) { this.selectionError.set(`« ${file.name} » : format non accepté.`); continue; }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        this.selectionError.set(`« ${file.name} » : ${this.mb(file.size)} Mo, maximum ${MAX_IMAGE_MB} Mo.`);
        continue;
      }
      this.items.update(list => [...list, this.localItem(file, type, null)]);
    }
  }

  remove(item: ProofItem): void {
    if (item.serverId) {
      // Brouillon déjà reçu par le serveur : suppression côté serveur
      this.courseService.deleteProof(this.courseId, item.serverId).subscribe({
        next: () => this.items.update(list => list.filter(i => i.key !== item.key)),
        error: (err) => this.toast.error(err?.error?.message ?? 'Impossible de retirer ce fichier.'),
      });
    } else {
      this.items.update(list => list.filter(i => i.key !== item.key));
    }
    if (item.proofType === 'VIDEO') this.videoError.set('');
  }

  // ── Envoi : seuls les fichiers non reçus, puis soumission finale ──────────

  async send(): Promise<void> {
    if (!this.isComplete() || this.busy()) return;

    const toUpload = this.items().filter(i => i.state === 'pending' || i.state === 'error');
    const totalBytes = toUpload.reduce((s, i) => s + i.size, 0) || 1;
    let sentBytes = 0;

    this.phase.set('uploading');
    this.progress.set(0);

    for (const item of toUpload) {
      this.patch(item.key, { state: 'uploading', error: undefined });
      try {
        const res = await this.uploadOne(item, loaded =>
          this.progress.set(Math.min(99, Math.round(((sentBytes + loaded) / totalBytes) * 100))));
        // Un fichier déjà reçu (reprise) renvoie la même preuve : pas d'erreur de doublon
        this.patch(item.key, { state: 'done', serverId: res.id, file: undefined, durationMs: res.videoDurationMs ?? item.durationMs });
      } catch (err: any) {
        this.patch(item.key, { state: 'error', error: err?.error?.message ?? 'Échec réseau' });
      }
      sentBytes += item.size;
    }

    if (this.hasFailures()) {
      this.phase.set('idle');
      this.toast.error('Certains fichiers n\'ont pas pu être envoyés. Corrigez-les ou réessayez : seuls ceux-là seront renvoyés.');
      return;
    }

    this.progress.set(100);
    this.phase.set('submitting');
    this.courseService.submitProofs(this.courseId).subscribe({
      next: () => {
        this.phase.set('idle');
        this.toast.success('Preuves envoyées ! Le client a 72 h pour les vérifier.');
        setTimeout(() => this.router.navigate(['/courier/dashboard']), 1500);
      },
      error: (err) => {
        this.phase.set('idle');
        this.toast.error(err?.error?.message ?? 'La soumission a échoué. Réessayez.');
      },
    });
  }

  private uploadOne(item: ProofItem, onProgress: (loaded: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      this.courseService.submitProof(this.courseId, item.file!, item.proofType).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) onProgress(event.loaded ?? 0);
          if (event.type === HttpEventType.Response) resolve(event.body);
        },
        error: (err) => reject(err),
      });
    });
  }

  // ── Utilitaires ────────────────────────────────────────────────────────────

  private localItem(file: File, proofType: ProofType, durationMs: number | null): ProofItem {
    return { key: crypto.randomUUID(), proofType, name: file.name, size: file.size, state: 'pending', file, durationMs };
  }

  private patch(key: string, changes: Partial<ProofItem>): void {
    this.items.update(list => list.map(i => i.key === key ? { ...i, ...changes } : i));
  }

  /** Durée lue par le navigateur (null si illisible : le serveur vérifiera quand il le peut). */
  private videoDuration(file: File): Promise<number | null> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      let settled = false;
      const done = (value: number | null) => { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(value); };
      video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
      video.onerror = () => done(null);
      setTimeout(() => done(null), 5000); // métadonnées illisibles : le serveur vérifiera
      video.src = url;
    });
  }

  private serverName(p: any): string {
    const label = p.proofType === 'VIDEO' ? 'Vidéo' : p.proofType === 'RECEIPT' ? 'Reçu' : 'Photo';
    return `${label} #${p.id}`;
  }

  private mb(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
  }
}
