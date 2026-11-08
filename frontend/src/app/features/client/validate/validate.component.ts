import { warnLoadFailed } from '../../../shared/state/load-error';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import { ToastService } from '../../../core/services/toast.service';
import { CourseService } from '../../../core/services/course.service';
import {
  LucideCamera, LucideCheckCircle, LucideClock, LucideFileText, LucideLockKeyhole, LucideMapPin,
  LucidePlay, LucideReceipt, LucideScale, LucideVideo,
} from '@lucide/angular';

interface ProofItem {
  id: number;
  proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT';
  presignedUrl: string;
  fileSize: number;
  mimeType: string;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  uploadedAt: string;
  videoDurationMs: number | null;
}

/**
 * Validation des preuves par le client (base maquette-v2/client/validate.html, Impeccable, mode Operate).
 * Moment critique : valider verse l'argent au coursier, définitivement. L'écran montre donc les preuves
 * de façon examinable (aperçu réel, heure, position, durée), rappelle l'échéance de validation automatique
 * et demande une confirmation explicite avant le versement. Le litige reste l'alternative visible.
 */
@Component({
  selector: 'app-validate',
  standalone: true,
  imports: [
    RouterLink, DatePipe, MediaViewerComponent,
    LucideCamera, LucideCheckCircle, LucideClock, LucideFileText, LucideLockKeyhole, LucideMapPin,
    LucidePlay, LucideReceipt, LucideScale, LucideVideo,
  ],
  styles: [`
    :host { display: block; --vm: #56635c; }
    :host-context([data-theme="dark"]) { --vm: #B0C0B7; }
    .v { max-width: 1040px; margin: 0 auto; }
    .v-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .v-head p { margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: var(--vm); max-width: 62ch; }
    .auto { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; padding: 14px 16px; border-radius: 14px;
      background: var(--cc-warning-bg); border: 1px solid color-mix(in oklab, var(--cc-warning) 40%, transparent); color: var(--cc-ink); }
    .auto svg { flex: none; margin-top: 2px; color: var(--cc-warning); }
    .auto b { display: block; font-size: 14.5px; }
    .auto span { font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); opacity: .85; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 20px; margin-bottom: 16px;
      animation: v-in .45s cubic-bezier(.16,1,.3,1) both; }
    .box h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 16px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .box h2 svg { color: var(--primary); }
    .box h2 .n { margin-left: auto; font-size: 12.5px; font-weight: 650; color: var(--vm); }
    .box > p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--vm); }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
    .tile { display: block; width: 100%; padding: 0; border: 1px solid var(--cc-line); border-radius: 13px; overflow: hidden; background: var(--cc-white);
      text-align: left; font: inherit; color: inherit; cursor: zoom-in; transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s, border-color .18s; }
    .tile:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--primary) 40%, var(--cc-line)); box-shadow: 0 10px 24px rgba(18,59,50,.1); }
    .thumb { position: relative; aspect-ratio: 4 / 3; background: #0f1a15; display: grid; place-items: center; overflow: hidden; }
    .thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .play { position: absolute; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
      background: rgba(255,255,255,.92); color: #123b32; box-shadow: 0 6px 18px rgba(0,0,0,.3); }
    .dur { position: absolute; right: 8px; bottom: 8px; padding: 2px 8px; border-radius: 6px; background: rgba(0,0,0,.65); color: #fff; font-size: 12px; font-weight: 700; }
    .doc { color: #9fb2a6; display: grid; justify-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; }
    .cap { padding: 10px 12px 12px; display: grid; gap: 3px; }
    .cap b { font-size: 13.5px; color: var(--cc-ink); }
    .cap span { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--vm); }
    .cap .geo { color: var(--cc-success); font-weight: 650; }
    .receipt-note { display: flex; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: var(--cc-paper-2); font-size: 13px; line-height: 1.45; color: var(--cc-ink); }
    .receipt-note svg { flex: none; margin-top: 1px; color: var(--primary); }
    /* Décision */
    .decide { position: sticky; top: 84px; padding: 22px; box-shadow: 0 14px 34px rgba(18,59,50,.08); }
    .decide h3 { margin: 0 0 8px; font-size: 18px; letter-spacing: -.02em; font-weight: 800; color: var(--cc-ink); }
    .decide > p { margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: var(--vm); }
    .amount { display: flex; justify-content: space-between; align-items: baseline; padding: 12px; border-radius: 12px; background: var(--cc-paper-2); margin-bottom: 14px; }
    .amount span { font-size: 13.5px; color: var(--vm); }
    .amount b { font-size: 20px; letter-spacing: -.02em; color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .full { width: 100%; min-height: 50px; justify-content: center; font-size: 15px; }
    .confirm { margin-top: 4px; padding: 14px; border-radius: 12px; border: 1.5px solid var(--primary); animation: v-in .3s cubic-bezier(.16,1,.3,1); }
    .confirm p { margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: var(--cc-ink); }
    .confirm .row { display: flex; gap: 8px; }
    .confirm .row > * { flex: 1; min-height: 48px; justify-content: center; font-size: 15px; }
    .btn-plain { min-height: 48px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink);
      font: inherit; font-weight: 700; cursor: pointer; }
    .or { display: flex; align-items: center; gap: 10px; margin: 16px 0 12px; font-size: 12.5px; color: var(--vm); }
    .or::before, .or::after { content: ''; flex: 1; height: 1px; background: var(--cc-line); }
    .dispute { width: 100%; min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 10px;
      border: 1px solid color-mix(in oklab, var(--cc-danger) 45%, transparent); background: var(--cc-danger-bg); color: var(--cc-danger);
      font-weight: 750; text-decoration: none; transition: background .15s, color .15s; }
    .dispute:hover { background: var(--cc-danger); color: #fff; }
    .safe { display: flex; gap: 8px; margin: 14px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--vm); }
    .safe svg { flex: none; margin-top: 1px; color: var(--primary); }
    .state { max-width: 560px; margin: 10px auto; text-align: center; padding: 30px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); }
    .state h2 { margin: 0 0 8px; font-size: 19px; font-weight: 750; color: var(--cc-ink); }
    .state p { margin: 0 0 16px; color: var(--vm); line-height: 1.55; }
    .sk { height: 160px; border-radius: 16px; margin-bottom: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2));
      background-size: 200% 100%; animation: v-sk 1.2s linear infinite; }
    .actbar { display: none; }
    @keyframes v-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes v-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .v-head h1, :host-context([data-theme="dark"]) .box h2, :host-context([data-theme="dark"]) .decide h3,
    :host-context([data-theme="dark"]) .cap b, :host-context([data-theme="dark"]) .amount b, :host-context([data-theme="dark"]) .state h2 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .box h2 svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .auto, :host-context([data-theme="dark"]) .auto span, :host-context([data-theme="dark"]) .confirm p,
    :host-context([data-theme="dark"]) .receipt-note { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .amount, :host-context([data-theme="dark"]) .receipt-note { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .confirm { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .confirm .primary-action { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .dispute { color: #F0A39C; }
    :host-context([data-theme="dark"]) .cap .geo { color: #5FBF8F; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .decide { position: static; }
    }
    @media (max-width: 767.98px) {
      .v.has-bar { padding-bottom: 84px; }
      .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .box { padding: 18px 16px; }
      .actbar { display: flex; gap: 10px; position: fixed; left: 0; right: 0; z-index: 30; bottom: calc(56px + env(safe-area-inset-bottom));
        padding: 10px 16px; background: var(--cc-white); border-top: 1px solid var(--cc-line); box-shadow: 0 -8px 24px rgba(18,59,50,.08); }
      .actbar .primary-action { flex: 1; min-height: 48px; justify-content: center; }
      .actbar .dispute { width: auto; flex: none; padding: 0 14px; }
    }
    @media (prefers-reduced-motion: reduce) { .box, .confirm, .sk { animation: none; } .tile:hover { transform: none; } }
  `],
  template: `
    <div class="v" [class.has-bar]="ready()">
      <section class="v-head">
        <h1>Vérifiez les preuves</h1>
        <p>
          @if (course()?.courierName) { {{ course()?.courierName }} a terminé la course. }
          Si tout est conforme, validez : le coursier sera payé. Sinon, ouvrez un litige.
        </p>
      </section>

      @if (isLoading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else if (course() && course()!.status !== 'PROOFS_SUBMITTED') {
        <div class="state" role="status">
          @if (course()!.status === 'COMPLETED') {
            <h2>Course déjà validée</h2>
            <p>Le coursier a été payé.{{ course()!.reviewDue ? ' Il ne vous reste plus qu’à le noter.' : '' }}</p>
            <a class="primary-action" [routerLink]="course()!.reviewDue ? ['/client/rate', courseId] : ['/client/course-detail', courseId]">
              {{ course()!.reviewDue ? 'Noter le coursier' : 'Voir la course' }}</a>
          } @else {
            <h2>Rien à valider pour l’instant</h2>
            <p>Les preuves ne sont pas (ou plus) en attente de votre validation.</p>
            <a class="primary-action" [routerLink]="['/client/course-detail', courseId]">Suivre la course</a>
          }
        </div>
      } @else {
        @if (course()?.autoValidateAt) {
          <div class="auto" role="note">
            <svg lucideClock size="18"></svg>
            <div>
              <b>Validation automatique le {{ course()!.autoValidateAt | date:'d MMMM à HH:mm' }} · {{ countdown() }}</b>
              <span>Sans action de votre part d’ici là, la course sera validée et le coursier payé.</span>
            </div>
          </div>
        }

        <div class="grid">
          <div>
            @for (g of groups(); track g.type) {
              <section class="box" [attr.aria-labelledby]="'g-' + g.type">
                <h2 [id]="'g-' + g.type">
                  @switch (g.type) {
                    @case ('VIDEO') { <svg lucideVideo size="17"></svg> }
                    @case ('PHOTO') { <svg lucideCamera size="17"></svg> }
                    @default { <svg lucideReceipt size="17"></svg> }
                  }
                  {{ g.title }} <span class="n">{{ g.items.length }}</span>
                </h2>
                <p>{{ g.hint }}</p>
                <div class="tiles">
                  @for (p of g.items; track p.id) {
                    <button type="button" class="tile" (click)="open(p)" [attr.aria-label]="'Agrandir : ' + label(p.proofType)">
                      <div class="thumb">
                        @if (p.proofType === 'VIDEO') {
                          <video [src]="p.presignedUrl + '#t=0.5'" preload="metadata" muted playsinline></video>
                          <span class="play"><svg lucidePlay size="22"></svg></span>
                          @if (p.videoDurationMs) { <span class="dur">{{ seconds(p.videoDurationMs) }} s</span> }
                        } @else if (isImage(p.mimeType)) {
                          <img [src]="p.presignedUrl" [alt]="label(p.proofType)" loading="lazy">
                        } @else {
                          <span class="doc"><svg lucideFileText size="34"></svg> PDF</span>
                        }
                      </div>
                      <div class="cap">
                        <b>{{ label(p.proofType) }}</b>
                        <span><svg lucideClock size="12"></svg> {{ (p.capturedAt || p.uploadedAt) | date:'d MMM, HH:mm' }}</span>
                        @if (p.latitude != null && p.longitude != null) { <span class="geo"><svg lucideMapPin size="12"></svg> Position enregistrée</span> }
                      </div>
                    </button>
                  }
                </div>
                @if (g.type === 'RECEIPT' && course()?.realCosts > 0) {
                  <div class="receipt-note"><svg lucideReceipt size="15"></svg>
                    <span>Vérifiez que le reçu correspond aux achats que vous avez remboursés : <strong>{{ xaf(course()!.realCosts) }}</strong>.</span></div>
                }
              </section>
            } @empty {
              <div class="box"><p>Aucune preuve n’a pu être chargée. Réessayez dans un instant.</p></div>
            }
          </div>

          <aside id="decide" class="box decide" aria-labelledby="v-decide">
            <h3 id="v-decide">La course s’est bien passée ?</h3>
            <p>Valider verse le paiement au coursier. C’est définitif.</p>
            @if (course()?.totalAmount) {
              <div class="amount"><span>Montant bloqué</span><b>{{ xaf(course()!.totalAmount) }}</b></div>
            }

            @if (!confirming()) {
              <button type="button" class="primary-action full" (click)="askConfirm()"><svg lucideCheckCircle size="17"></svg> Valider la course</button>
            } @else {
              <div class="confirm" role="alertdialog" aria-labelledby="v-confirm">
                <p id="v-confirm">Vous confirmez que la course est conforme ? {{ course()?.courierName || 'Le coursier' }} sera payé et vous ne pourrez plus ouvrir de litige.</p>
                <div class="row">
                  <button type="button" class="btn-plain" (click)="confirming.set(false)" [disabled]="isValidating()">Annuler</button>
                  <button type="button" class="primary-action" (click)="validateCourse()" [disabled]="isValidating()">
                    @if (isValidating()) { Validation… } @else { Oui, valider }
                  </button>
                </div>
              </div>
            }

            <div class="or">ou</div>
            <a class="dispute" [routerLink]="['/client/dispute-form', courseId]"><svg lucideScale size="16"></svg> Ouvrir un litige</a>
            <p class="safe"><svg lucideLockKeyhole size="14"></svg><span>En cas de litige, l’argent reste bloqué jusqu’à la décision d’un administrateur.</span></p>
          </aside>
        </div>

        <!-- Mobile : la décision reste à portée de pouce -->
        @if (!confirming()) {
          <div class="actbar">
            <a class="dispute" [routerLink]="['/client/dispute-form', courseId]" aria-label="Ouvrir un litige"><svg lucideScale size="16"></svg></a>
            <button type="button" class="primary-action" (click)="askConfirm(true)"><svg lucideCheckCircle size="17"></svg> Valider la course</button>
          </div>
        }
      }
    </div>

    <app-media-viewer [items]="viewerItems()" [activeIndex]="viewerIndex()" [open]="viewerOpen()" (close)="viewerOpen.set(false)" />
  `,
})
export class ValidateComponent implements OnInit {
  courseId!: number;

  readonly proofs = signal<ProofItem[]>([]);
  readonly course = signal<any>(null);
  readonly isLoading = signal(true);
  readonly isValidating = signal(false);
  readonly confirming = signal(false);
  readonly now = signal(Date.now());

  readonly viewerOpen = signal(false);
  readonly viewerItems = signal<MediaItem[]>([]);
  readonly viewerIndex = signal(0);

  readonly ready = computed(() => !this.isLoading() && this.course()?.status === 'PROOFS_SUBMITTED');

  /** Preuves regroupées : vidéo, photos, reçus (ordre d'examen). */
  readonly groups = computed(() => {
    const by = (t: ProofItem['proofType']) => this.proofs().filter((p) => p.proofType === t);
    return [
      { type: 'VIDEO', title: 'Vidéo', hint: 'Regardez la vidéo filmée sur place depuis l’application.', items: by('VIDEO') },
      { type: 'PHOTO', title: 'Photos', hint: 'Vérifiez ce qui a été acheté, livré ou retiré.', items: by('PHOTO') },
      { type: 'RECEIPT', title: 'Reçus d’achat', hint: 'Les justificatifs des achats avancés par le coursier.', items: by('RECEIPT') },
    ].filter((g) => g.items.length > 0);
  });

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private courseService = inject(CourseService);
  private toast = inject(ToastService);

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate(['/client/dashboard']);
      return;
    }
    let pending = 2;
    const done = () => { if (--pending === 0) this.isLoading.set(false); };
    this.courseService.getProofs(this.courseId).subscribe({
      next: (data) => { this.proofs.set(data as ProofItem[]); done(); },
      error: () => { this.toast.error('Impossible de charger les preuves.'); done(); },
    });
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (c: any) => { this.course.set(c); done(); },
      error: (e) => { warnLoadFailed('course (validation)', 'affichage minimal')(e); done(); },
    });
  }

  countdown(): string {
    const at = this.course()?.autoValidateAt;
    if (!at) return '';
    const ms = new Date(at).getTime() - this.now();
    if (ms <= 0) return 'imminente';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h >= 48 ? `dans ${Math.floor(h / 24)} jours` : h > 0 ? `dans ${h} h ${m} min` : `dans ${m} min`;
  }

  /** Ouvre la confirmation (depuis la barre mobile : fait défiler jusqu'au bloc de décision). */
  askConfirm(scroll = false): void {
    this.confirming.set(true);
    if (scroll) setTimeout(() => document.getElementById('decide')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  validateCourse(): void {
    if (this.isValidating()) return;
    this.isValidating.set(true);
    this.http.post(`/api/courses/${this.courseId}/validate`, {}, { responseType: 'text' }).subscribe({
      next: () => {
        this.isValidating.set(false);
        this.toast.success('Course validée : le coursier a été payé.');
        // Notation obligatoire ensuite (TICK-033)
        setTimeout(() => this.router.navigate(['/client/rate', this.courseId]), 1200);
      },
      error: (err) => {
        this.isValidating.set(false);
        this.confirming.set(false);
        this.toast.error(err?.error?.message ?? 'La validation n’a pas abouti. Réessayez.');
      },
    });
  }

  open(proof: ProofItem): void {
    const list = this.groups().flatMap((g) => g.items);
    this.viewerItems.set(list.map((p) => ({
      url: p.presignedUrl,
      type: p.proofType === 'VIDEO' ? 'video' : this.isImage(p.mimeType) ? 'image' : 'pdf',
      label: this.label(p.proofType),
    })));
    this.viewerIndex.set(Math.max(0, list.findIndex((p) => p.id === proof.id)));
    this.viewerOpen.set(true);
  }

  label(type: string): string {
    return type === 'VIDEO' ? 'Vidéo de la course' : type === 'RECEIPT' ? 'Reçu d’achat' : 'Photo de la course';
  }

  isImage(mime: string): boolean { return !!mime && mime.startsWith('image/'); }

  seconds(ms: number): string { return String(Math.round(ms / 100) / 10).replace('.', ','); }

  xaf(n: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))} XAF`; }
}
