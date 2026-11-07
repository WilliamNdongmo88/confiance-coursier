import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { CourseService } from '../../../core/services/course.service';
import {
  LucideAlertTriangle, LucideCamera, LucideCheck, LucideCircleCheckBig, LucideClock, LucideFileText, LucideFilm, LucideImagePlus,
  LucideLockKeyhole, LucideMapPin, LucidePlay, LucideReceipt, LucideRotateCcw, LucideSend, LucideVideo, LucideX,
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
  /** Aperçu : URL locale (fichier choisi) ou URL présignée (déjà reçu). */
  url?: string | null;
  mime?: string;
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
    RouterLink, DatePipe, DecimalPipe,
    LucideAlertTriangle, LucideCamera, LucideCheck, LucideCircleCheckBig, LucideClock, LucideFileText, LucideFilm, LucideImagePlus,
    LucideLockKeyhole, LucideMapPin, LucidePlay, LucideReceipt, LucideRotateCcw, LucideSend, LucideVideo, LucideX,
  ],
  styles: [`
    :host { display: block; --pm: #56635c; }
    :host-context([data-theme="dark"]) { --pm: #B0C0B7; }
    .pf { max-width: 760px; margin: 0 auto; }
    .pf-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .pf-head p { margin: 0 0 14px; font-size: 15px; line-height: 1.5; color: var(--pm); }
    .ctx { padding: 14px 16px; margin-bottom: 14px; border-radius: 14px; background: var(--cc-white); border: 1px solid var(--cc-line); }
    .ctx b { display: block; font-size: 14.5px; line-height: 1.4; color: var(--cc-ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .ctx-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; font-size: 13px; color: var(--pm); }
    .ctx-meta span { display: inline-flex; align-items: center; gap: 5px; }
    .due { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 12px 14px; border-radius: 12px; background: var(--cc-paper-2); font-size: 14px; font-weight: 650; color: var(--cc-ink); }
    .due.late { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .due svg { flex: none; }
    .check { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 18px; padding: 0; list-style: none; }
    .check li { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--cc-line); background: var(--cc-white);
      font-size: 13px; font-weight: 650; color: var(--pm); transition: border-color .2s, background .2s, color .2s; }
    .check li.ok { border-color: var(--cc-success); background: color-mix(in oklab, var(--cc-success) 8%, var(--cc-white)); color: var(--cc-ink); }
    .check li.off { opacity: .55; }
    .tick { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--cc-line); }
    .ok .tick { border-color: var(--cc-success); background: var(--cc-success); color: #fff; animation: pf-pop .35s cubic-bezier(.16,1,.3,1); }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 20px; margin-bottom: 14px; animation: pf-in .45s cubic-bezier(.16,1,.3,1) both; }
    .box:nth-of-type(2) { animation-delay: .05s; } .box:nth-of-type(3) { animation-delay: .1s; }
    .box-h { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .box-h h2 { margin: 0; flex: 1; font-size: 16.5px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .num { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--primary); color: #fff; font-size: 12.5px; font-weight: 800; }
    .num.done { background: var(--cc-success); }
    .pill { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: var(--cc-paper-2); color: var(--pm); }
    .box > p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--pm); }
    .btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .btns > button { flex: 1 1 150px; min-height: 48px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      font: inherit; font-size: 14.5px; font-weight: 750; cursor: pointer; transition: background .15s, border-color .15s; }
    .b-main { background: var(--primary); color: #fff; border: 0; }
    .b-sec { background: var(--cc-white); color: var(--cc-ink); border: 1px solid var(--cc-line); }
    .btns > button:disabled { opacity: .5; cursor: not-allowed; }
    .hint { margin: 8px 0 0; font-size: 12.5px; color: var(--pm); }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 14px; }
    .tile { position: relative; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--cc-line); background: #0f1a15; aspect-ratio: 4 / 3; animation: pf-pop .35s cubic-bezier(.16,1,.3,1); }
    .tile.wide { grid-column: 1 / -1; aspect-ratio: 16 / 9; max-width: 460px; }
    .tile.done { border-color: var(--cc-success); }
    .tile.err { border-color: var(--cc-danger); }
    .tile img, .tile video { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tile-doc { width: 100%; height: 100%; display: grid; place-items: center; align-content: center; gap: 6px; color: #cfdcd4; font-size: 12.5px; font-weight: 700; padding: 8px; text-align: center; }
    .tile-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.9); color: #123b32; pointer-events: none; }
    .tile-state { position: absolute; left: 6px; bottom: 6px; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 11.5px; font-weight: 750; color: #fff; background: rgba(0,0,0,.65); }
    .tile.done .tile-state { background: #1f7a52; }
    .tile.err .tile-state { background: #b54843; }
    .tile-x { position: absolute; right: 6px; top: 6px; width: 34px; height: 34px; border-radius: 10px; border: 0; display: grid; place-items: center; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; }
    .tile-x:disabled { opacity: .4; }
    .tile-err { margin: 6px 0 0; font-size: 12.5px; color: var(--cc-danger); }
    .video-refused { display: grid; gap: 4px; margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: .86rem; line-height: 1.45;
      background: var(--cc-danger-bg); border: 1px solid color-mix(in oklab, var(--cc-danger) 45%, transparent); color: var(--cc-ink); animation: pf-in .3s cubic-bezier(.16,1,.3,1); }
    .video-refused strong { color: var(--cc-danger); }
    .file-error { margin: 0 0 12px; font-size: 13px; color: var(--cc-danger); }
    .send-zone { position: sticky; bottom: 12px; z-index: 5; padding: 14px; border-radius: 16px; background: var(--cc-white); border: 1px solid var(--cc-line); box-shadow: 0 -6px 24px rgba(18,59,50,.08); }
    .send { width: 100%; min-height: 52px; border: 0; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--primary); color: #fff; font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; }
    .send.inactive { opacity: .45; }
    .missing { margin: 8px 0 0; text-align: center; font-size: 13px; font-weight: 600; color: var(--cc-ink); }
    .bar { height: 6px; border-radius: 6px; background: var(--cc-line); overflow: hidden; margin: 10px 0 0; }
    .bar i { display: block; height: 100%; background: var(--primary); transition: width .2s; }
    .bar-t { margin: 0 0 4px; font-size: 13px; color: var(--pm); }
    .safe { display: flex; gap: 8px; margin: 10px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--pm); }
    .safe svg { flex: none; margin-top: 1px; color: var(--primary); }
    .hidden-input { display: none; }
    .state { text-align: center; padding: 32px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); animation: pf-in .45s cubic-bezier(.16,1,.3,1) both; }
    .state .ic { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; background: var(--cc-success); color: #fff; animation: pf-pop .5s cubic-bezier(.16,1,.3,1); }
    .state .ic.info { border-radius: 18px; background: var(--cc-paper-2); color: var(--primary); }
    .state h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--cc-ink); }
    .state p { margin: 0 auto 16px; max-width: 46ch; color: var(--pm); line-height: 1.55; }
    @keyframes pf-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes pf-pop { 0% { transform: scale(.85); opacity: .4; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
    :host-context([data-theme="dark"]) .pf-head h1, :host-context([data-theme="dark"]) .box-h h2, :host-context([data-theme="dark"]) .ctx b,
    :host-context([data-theme="dark"]) .state h2, :host-context([data-theme="dark"]) .due:not(.late), :host-context([data-theme="dark"]) .missing,
    :host-context([data-theme="dark"]) .check li.ok, :host-context([data-theme="dark"]) .video-refused { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .due:not(.late), :host-context([data-theme="dark"]) .pill, :host-context([data-theme="dark"]) .state .ic.info { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .num:not(.done), :host-context([data-theme="dark"]) .b-main, :host-context([data-theme="dark"]) .send { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .due.late, :host-context([data-theme="dark"]) .video-refused strong, :host-context([data-theme="dark"]) .tile-err,
    :host-context([data-theme="dark"]) .file-error { color: #F0A39C !important; }
    :host-context([data-theme="dark"]) .safe svg, :host-context([data-theme="dark"]) .state .ic.info { color: var(--cc-lime); }
    @media (max-width: 767.98px) {
      .check li { padding: 9px 8px; gap: 6px; font-size: 12.5px; }
      .box { padding: 18px 16px; }
      .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .send-zone { bottom: calc(64px + env(safe-area-inset-bottom)); }
    }
    @media (prefers-reduced-motion: reduce) { .box, .tile, .state, .state .ic, .ok .tick, .video-refused { animation: none; } }
  `],
  template: `
  <div class="pf">
    <section class="pf-head">
      <h1>Envoyer les preuves</h1>
      <p>Prouvez que la course est faite : le client vérifie, puis vous êtes payé.</p>
    </section>

    @if (loading()) {
      <div class="state"><p>Chargement…</p></div>
    } @else if (done()) {
      <div class="state" role="status">
        <span class="ic"><svg lucideCheck size="30"></svg></span>
        <h2>Preuves envoyées</h2>
        <p>Le client les vérifie@if (autoValidateHours()) { : sans réponse de sa part, la course est validée automatiquement {{ autoValidateHours() }} h après l’envoi}. Vous êtes payé dès la validation.</p>
        <a class="primary-action" routerLink="/courier/dashboard">Retour au tableau de bord</a>
      </div>
    } @else if (blockedReason()) {
      <div class="state" role="status">
        <span class="ic info"><svg lucideCircleCheckBig size="28"></svg></span>
        <h2>Envoi impossible</h2>
        <p>{{ blockedReason() }}</p>
        <a class="primary-action" routerLink="/courier/dashboard">Retour au tableau de bord</a>
      </div>
    } @else {
      @if (course(); as c) {
        <div class="ctx">
          <b>{{ c.description }}</b>
          <div class="ctx-meta">
            @if (c.zone) { <span><svg lucideMapPin size="13"></svg> {{ zone(c.zone) }}</span> }
            @if (c.contactName) { <span>Contact : {{ c.contactName }}</span> }
          </div>
        </div>
        @if (c.status === 'OVERDUE') {
          <div class="due late" role="alert"><svg lucideAlertTriangle size="17"></svg> Échéance dépassée : envoyez vos preuves au plus vite.</div>
        } @else if (c.proofDeadline) {
          <div class="due"><svg lucideClock size="17"></svg> À envoyer avant le {{ c.proofDeadline | date:'d MMMM à HH:mm' }}</div>
        }
      }

      <ul class="check" aria-label="Preuves obligatoires">
        <li [class.ok]="hasVideo()"><span class="tick">@if (hasVideo()) { <svg lucideCheck size="13"></svg> }</span> Vidéo</li>
        <li [class.ok]="hasPhoto()"><span class="tick">@if (hasPhoto()) { <svg lucideCheck size="13"></svg> }</span> Photo</li>
        <li [class.ok]="hasReceipt()" [class.off]="!receiptsRequired()"><span class="tick">@if (hasReceipt()) { <svg lucideCheck size="13"></svg> }</span> Reçu{{ receiptsRequired() ? '' : ' (facultatif)' }}</li>
      </ul>

      <!-- 1. Vidéo -->
      <section class="box" aria-labelledby="pf-v">
        <div class="box-h"><span class="num" [class.done]="hasVideo()">1</span><h2 id="pf-v">Vidéo sur place</h2><span class="pill">{{ MAX_VIDEO_SECONDS }} s max</span></div>
        <p>Filmez l’essentiel : le lieu, ce qui a été acheté, livré ou retiré.</p>
        <input #videoCam type="file" class="hidden-input" accept="video/*" capture="environment" (change)="onVideoSelected($event)">
        <input #videoLib type="file" class="hidden-input" accept="video/*" (change)="onVideoSelected($event)">
        @if (!videoItem()) {
          <div class="btns">
            <button type="button" class="b-main" (click)="videoCam.click()" [disabled]="busy()"><svg lucideFilm size="18"></svg> Filmer</button>
            <button type="button" class="b-sec" (click)="videoLib.click()" [disabled]="busy()"><svg lucideImagePlus size="18"></svg> Galerie</button>
          </div>
          <p class="hint">MP4, MOV, WebM · {{ MAX_VIDEO_MB }} Mo maximum</p>
        } @else {
          <div class="tiles">
            @for (it of itemsOf('VIDEO'); track it.key) {
              <div class="tile wide" [class.done]="it.state === 'done'" [class.err]="it.state === 'error'">
                @if (it.url) { <video [src]="it.url + '#t=0.3'" preload="metadata" muted playsinline></video><span class="tile-play"><svg lucidePlay size="20"></svg></span> }
                @else { <span class="tile-doc"><svg lucideVideo size="30"></svg>{{ it.name }}</span> }
                <span class="tile-state">{{ stateLabel(it) }}@if (it.durationMs) { · {{ (it.durationMs / 1000) | number:'1.0-1' }} s }</span>
                <button type="button" class="tile-x" [disabled]="busy()" (click)="remove(it)" aria-label="Retirer la vidéo"><svg lucideX size="16"></svg></button>
              </div>
            }
          </div>
          @for (it of itemsOf('VIDEO'); track it.key) { @if (it.state === 'error') { <p class="tile-err">{{ it.error }}</p> } }
        }
        @if (videoError()) {
          <div class="video-refused" role="alert">
            <strong>Vidéo refusée</strong>
            <span>{{ videoError() }}</span>
            <span>Filmez un clip plus court avec « Filmer », ou raccourcissez la vidéo dans votre galerie.</span>
          </div>
        }
      </section>

      <!-- 2. Photos -->
      <section class="box" aria-labelledby="pf-p">
        <div class="box-h"><span class="num" [class.done]="hasPhoto()">2</span><h2 id="pf-p">Photos</h2><span class="pill">{{ itemsOf('PHOTO').length }} ajoutée{{ itemsOf('PHOTO').length > 1 ? 's' : '' }}</span></div>
        <p>Au moins une photo nette de ce qui a été fait.</p>
        <input #photoCam type="file" class="hidden-input" accept="image/*" capture="environment" (change)="onFilesSelected($event, 'PHOTO')">
        <input #photoLib type="file" class="hidden-input" accept="image/*" multiple (change)="onFilesSelected($event, 'PHOTO')">
        <div class="btns">
          <button type="button" class="b-main" (click)="photoCam.click()" [disabled]="busy() || full()"><svg lucideCamera size="18"></svg> Photographier</button>
          <button type="button" class="b-sec" (click)="photoLib.click()" [disabled]="busy() || full()"><svg lucideImagePlus size="18"></svg> Galerie</button>
        </div>
        @if (itemsOf('PHOTO').length) {
          <div class="tiles">
            @for (it of itemsOf('PHOTO'); track it.key) {
              <div class="tile" [class.done]="it.state === 'done'" [class.err]="it.state === 'error'">
                @if (it.url) { <img [src]="it.url" alt="Photo de la course"> } @else { <span class="tile-doc"><svg lucideCamera size="26"></svg>{{ it.name }}</span> }
                <span class="tile-state">{{ stateLabel(it) }}</span>
                <button type="button" class="tile-x" [disabled]="busy()" (click)="remove(it)" aria-label="Retirer la photo"><svg lucideX size="16"></svg></button>
              </div>
            }
          </div>
        } @else { <p class="hint">JPG, PNG, WebP, HEIC · {{ MAX_IMAGE_MB }} Mo maximum par photo</p> }
      </section>

      <!-- 3. Reçus -->
      <section class="box" aria-labelledby="pf-r">
        <div class="box-h"><span class="num" [class.done]="hasReceipt()">3</span><h2 id="pf-r">Reçus d’achat</h2>
          <span class="pill">{{ receiptsRequired() ? 'Obligatoire' : 'Facultatif' }}</span></div>
        <p>@if (receiptsRequired()) { Le client vous rembourse <strong>{{ xaf(realCosts()) }}</strong> d’achats : joignez le ou les reçus correspondants. } @else { Seulement si vous avez fait des achats pour cette course. }</p>
        <input #receiptCam type="file" class="hidden-input" accept="image/*" capture="environment" (change)="onFilesSelected($event, 'RECEIPT')">
        <input #receiptLib type="file" class="hidden-input" accept="image/*,application/pdf" multiple (change)="onFilesSelected($event, 'RECEIPT')">
        <div class="btns">
          <button type="button" [class]="receiptsRequired() ? 'b-main' : 'b-sec'" (click)="receiptCam.click()" [disabled]="busy() || full()"><svg lucideCamera size="18"></svg> Photographier</button>
          <button type="button" class="b-sec" (click)="receiptLib.click()" [disabled]="busy() || full()"><svg lucideFileText size="18"></svg> Fichier ou PDF</button>
        </div>
        @if (itemsOf('RECEIPT').length) {
          <div class="tiles">
            @for (it of itemsOf('RECEIPT'); track it.key) {
              <div class="tile" [class.done]="it.state === 'done'" [class.err]="it.state === 'error'">
                @if (it.url && it.mime?.startsWith('image/')) { <img [src]="it.url" alt="Reçu d’achat"> }
                @else { <span class="tile-doc"><svg lucideReceipt size="26"></svg>{{ it.mime === 'application/pdf' ? 'PDF' : it.name }}</span> }
                <span class="tile-state">{{ stateLabel(it) }}</span>
                <button type="button" class="tile-x" [disabled]="busy()" (click)="remove(it)" aria-label="Retirer le reçu"><svg lucideX size="16"></svg></button>
              </div>
            }
          </div>
        } @else { <p class="hint">JPG, PNG, PDF · {{ MAX_IMAGE_MB }} Mo maximum par fichier</p> }
      </section>

      @if (selectionError()) { <p class="file-error" role="alert">{{ selectionError() }}</p> }

      <div class="send-zone">
        @if (busy()) {
          <p class="bar-t" aria-live="polite">{{ phase() === 'submitting' ? 'Fichiers reçus, transmission au client…' : progress() > 0 ? 'Envoi des fichiers… ' + progress() + ' %' : 'Envoi des fichiers…' }}</p>
          <div class="bar" role="progressbar" aria-label="Envoi des preuves" [attr.aria-valuenow]="progress()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="progress()"></i></div>
        } @else {
          <button type="button" class="send" [class.inactive]="!isComplete()" [attr.aria-disabled]="!isComplete()" (click)="trySend()">
            @if (hasFailures()) { <svg lucideRotateCcw size="17"></svg> Réessayer l’envoi } @else { <svg lucideSend size="17"></svg> Envoyer les preuves au client }
          </button>
          @if (!isComplete()) { <p class="missing" role="status">Il manque : {{ missing().join(', ') }}.</p> }
          @else { <p class="safe"><svg lucideLockKeyhole size="14"></svg><span>Une coupure réseau ? Seuls les fichiers non reçus seront renvoyés.</span></p> }
        }
      </div>
    }
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
  readonly course = signal<any>(null);
  readonly done = signal(false);
  readonly autoValidateHours = signal<number | null>(null);

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

  private http = inject(HttpClient);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toast: ToastService,
  ) {
    inject(DestroyRef).onDestroy(() => this.localUrls.forEach((u) => URL.revokeObjectURL(u)));
  }

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate(['/courier/dashboard']);
      return;
    }
    // Contrôle du statut au chargement + reprise des brouillons déjà reçus par le serveur
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (s) => this.autoValidateHours.set(s?.autoValidateHours ?? null),
      error: () => { /* délai non affiché */ },
    });
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: any) => {
        this.course.set(course);
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
          url: p.presignedUrl ?? null,
          mime: p.mimeType,
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
        this.done.set(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const previewable = file.type.startsWith('image/') || file.type.startsWith('video/');
    const url = previewable ? URL.createObjectURL(file) : null;
    if (url) this.localUrls.push(url);
    return { key: crypto.randomUUID(), proofType, name: file.name, size: file.size, state: 'pending', file, durationMs, url, mime: file.type };
  }

  private readonly localUrls: string[] = [];

  stateLabel(it: ProofItem): string {
    switch (it.state) {
      case 'done': return 'Reçu ✓';
      case 'uploading': return 'Envoi…';
      case 'error': return 'Échec';
      default: return 'À envoyer';
    }
  }

  zone(z?: string): string { return String(z ?? '').replace(' - ', ' · '); }

  xaf(n: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} XAF`; }

  /** Bouton jamais muet : rappelle ce qui manque. */
  trySend(): void {
    if (!this.isComplete()) { this.toast.error(`Il manque : ${this.missing().join(', ')}.`); return; }
    this.send();
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
