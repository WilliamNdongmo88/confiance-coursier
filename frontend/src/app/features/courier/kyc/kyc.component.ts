import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LucideArrowLeft, LucideArrowRight, LucideCamera, LucideCheck, LucideClock, LucideIdCard, LucideLockKeyhole,
  LucidePencil, LucideRefreshCw, LucideScanFace, LucideSend, LucideShieldCheck, LucideXCircle,
} from '@lucide/angular';
import { ComboFieldComponent } from '../../../shared/components/combo-field/combo-field.component';

interface KycStatus {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  documentType?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

type StepKey = 'identity' | 'document' | 'selfie' | 'payout' | 'recap';
type Slot = 'front' | 'back' | 'selfie';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'identity', label: 'Identité' },
  { key: 'document', label: 'Pièce' },
  { key: 'selfie', label: 'Selfie' },
  { key: 'payout', label: 'Paiement' },
  { key: 'recap', label: 'Envoi' },
];

const MAX_FILE = 10 * 1024 * 1024;
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Vérification d'identité du coursier (KYC), Impeccable.
 * En étapes : identité → pièce (recto/verso avec aperçu) → selfie → reversement → vérification et envoi.
 * Les coordonnées de reversement sont enregistrées sur le compte (payoutMethod / payoutNumber).
 */
@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [
    ComboFieldComponent,
    RouterLink, FormsModule, DatePipe,
    LucideArrowLeft, LucideArrowRight, LucideCamera, LucideCheck, LucideClock, LucideIdCard, LucideLockKeyhole,
    LucidePencil, LucideRefreshCw, LucideScanFace, LucideSend, LucideShieldCheck, LucideXCircle,
  ],
  styles: [`
    :host { display: block; --km: #56635c; }
    :host-context([data-theme="dark"]) { --km: #B0C0B7; }
    .k { max-width: 680px; margin: 0 auto; }
    .k-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .k-head p { margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: var(--km); }
    .safe { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 18px; padding: 12px 14px; border-radius: 12px; background: var(--cc-paper-2); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .safe svg { flex: none; margin-top: 1px; color: var(--primary); }
    .prog { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 8px; }
    .prog span { height: 5px; border-radius: 5px; background: var(--cc-line); position: relative; overflow: hidden; }
    .prog span::after { content: ''; position: absolute; inset: 0; background: var(--primary); transform: scaleX(0); transform-origin: left; transition: transform .45s cubic-bezier(.16,1,.3,1); }
    .prog span.done::after { transform: scaleX(1); }
    .count { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 13px; color: var(--km); }
    .count strong { color: var(--cc-ink); }
    .card { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 26px; box-shadow: 0 10px 30px rgba(18,59,50,.06); overflow: hidden; }
    .step { animation: k-in .42s cubic-bezier(.16,1,.3,1) both; }
    .step.back { animation-name: k-back; }
    @keyframes k-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
    @keyframes k-back { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
    .q { margin: 0 0 6px; font-size: 21px; line-height: 1.2; letter-spacing: -.03em; font-weight: 750; color: var(--cc-ink); }
    .sub { margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: var(--km); }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .ch { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border: 1.5px solid var(--cc-line); border-radius: 13px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; text-align: left; cursor: pointer; transition: border-color .18s, background .18s; }
    .ch.on { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 8%, var(--cc-white)); }
    .ch-ic { flex: none; width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); font-weight: 900; font-size: 12px; }
    .ch.on .ch-ic { background: var(--primary); color: #fff; }
    .ch-ic.mtn { background: #ffcc00 !important; color: #1a1a1a !important; }
    .ch-ic.om { background: #ff7900 !important; color: #fff !important; }
    .ch b { display: block; font-size: 14.5px; }
    .ch small { display: block; font-size: 12.5px; color: var(--km); }
    .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .slot { position: relative; display: grid; place-items: center; aspect-ratio: 16 / 10; padding: 0; border: 1.5px dashed var(--cc-line); border-radius: 14px;
      background: var(--cc-paper-2); color: var(--cc-ink); font: inherit; cursor: pointer; overflow: hidden; transition: border-color .18s; }
    .slot:hover { border-color: var(--primary); }
    .slot.filled { border-style: solid; border-color: var(--cc-success); }
    .slot.selfie { aspect-ratio: 1 / 1; max-width: 260px; margin: 0 auto; width: 100%; }
    .slot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .slot-empty { display: grid; justify-items: center; gap: 6px; padding: 10px; text-align: center; font-size: 13.5px; font-weight: 650; }
    .slot-empty svg { color: var(--primary); }
    .slot-empty small { font-weight: 500; font-size: 12px; color: var(--km); }
    .slot-tag { position: absolute; left: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px;
      background: rgba(0,0,0,.65); color: #fff; font-size: 12px; font-weight: 700; }
    .slot-redo { position: absolute; right: 8px; top: 8px; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(0,0,0,.6); color: #fff; }
    .pdf { display: grid; justify-items: center; gap: 4px; font-weight: 700; color: var(--cc-ink); }
    .err { margin: 8px 0 0; font-size: 13px; color: var(--cc-danger); }
    .tips { margin: 14px 0 0; padding-left: 20px; list-style: disc; font-size: 13px; line-height: 1.6; color: var(--km); }
    .recap { list-style: none; margin: 0 0 18px; padding: 0; border: 1px solid var(--cc-line); border-radius: 13px; overflow: hidden; }
    .recap li { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 13px 14px; }
    .recap li + li { border-top: 1px solid var(--cc-line); }
    .recap small { display: block; font-size: 12px; color: var(--km); }
    .recap p { margin: 2px 0 0; font-size: 14.5px; color: var(--cc-ink); }
    .recap button { min-height: 36px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--primary); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .bar { height: 6px; border-radius: 6px; background: var(--cc-line); overflow: hidden; margin-top: 12px; }
    .bar i { display: block; height: 100%; background: var(--primary); transition: width .2s; }
    .bar.indet i { animation: k-indet 1.2s ease-in-out infinite; }
    @keyframes k-indet { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
    .actions { display: flex; gap: 10px; margin-top: 22px; }
    .actions .next { flex: 1 1 0; min-width: 0; min-height: 50px; justify-content: center; white-space: normal; text-align: center; }
    .actions .next.inactive { opacity: .45; box-shadow: none; }
    .prev { flex: none; min-height: 50px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink);
      font: inherit; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .state { text-align: center; padding: 32px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); animation: k-in .4s cubic-bezier(.16,1,.3,1) both; }
    .state .ic { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 18px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); }
    .state .ic.ok { background: var(--cc-success); color: #fff; }
    .state .ic.ko { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .state h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--cc-ink); }
    .state p { margin: 0 auto 16px; max-width: 46ch; color: var(--km); line-height: 1.55; }
    .state .why { max-width: 46ch; margin: 0 auto 16px; padding: 12px 14px; border-radius: 12px; background: var(--cc-danger-bg); color: var(--cc-ink); font-size: 14px; text-align: left; }
    :host-context([data-theme="dark"]) .k-head h1, :host-context([data-theme="dark"]) .q, :host-context([data-theme="dark"]) .state h2,
    :host-context([data-theme="dark"]) .recap p, :host-context([data-theme="dark"]) .safe, :host-context([data-theme="dark"]) .state .why { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .sub, :host-context([data-theme="dark"]) .k-head p { color: #B0C0B7 !important; }
    :host-context([data-theme="dark"]) .safe, :host-context([data-theme="dark"]) .slot, :host-context([data-theme="dark"]) .ch-ic,
    :host-context([data-theme="dark"]) .state .ic:not(.ok):not(.ko) { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .safe svg, :host-context([data-theme="dark"]) .slot-empty svg, :host-context([data-theme="dark"]) .ch-ic,
    :host-context([data-theme="dark"]) .state .ic:not(.ok):not(.ko) { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .ch.on { border-color: var(--cc-lime); background: rgba(215,237,154,.08); }
    :host-context([data-theme="dark"]) .ch.on .ch-ic { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .slot:hover { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .pdf { color: #F3F7F5; }
    @media (max-width: 640px) {
      .card { padding: 20px 16px; }
      .grid2, .choices { grid-template-columns: 1fr; }
      .prev .prev-txt { display: none; }
      .prev { width: 50px; padding: 0; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) { .step, .step.back, .state { animation: none; } .prog span::after { transition: none; } }
  `],
  template: `
    <div class="k">
      <section class="k-head">
        <h1>Vérification d’identité</h1>
        <p>Obligatoire avant de proposer vos services : elle protège les clients et vous rend visible comme coursier vérifié.</p>
      </section>

      @if (!kycStatus()) {
        <div class="state"><p>Chargement…</p></div>
      } @else if (sent() || kycStatus()!.status === 'PENDING') {
        <div class="state" role="status">
          <span class="ic"><svg lucideClock size="28"></svg></span>
          <h2>Dossier en cours d’examen</h2>
          <p>Notre équipe vérifie vos documents, généralement en moins de 24 heures. Vous recevrez un email dès la décision.</p>
          <a class="primary-action" routerLink="/courier/dashboard">Retour au tableau de bord</a>
        </div>
      } @else if (kycStatus()!.status === 'APPROVED') {
        <div class="state" role="status">
          <span class="ic ok"><svg lucideShieldCheck size="28"></svg></span>
          <h2>Identité vérifiée</h2>
          <p>Vous pouvez discuter avec les clients et proposer votre tarif. Le badge « Vérifié » apparaît sur votre profil.</p>
          <a class="primary-action" routerLink="/courier/dashboard">Voir les demandes</a>
        </div>
      } @else if (kycStatus()!.status === 'REJECTED' && !retrying()) {
        <div class="state" role="alert">
          <span class="ic ko"><svg lucideXCircle size="28"></svg></span>
          <h2>Dossier refusé</h2>
          <div class="why"><strong>Motif :</strong> {{ kycStatus()!.rejectionReason || 'documents illisibles ou non conformes.' }}</div>
          <p>Corrigez ce point et envoyez un nouveau dossier.</p>
          <button type="button" class="primary-action" (click)="retrying.set(true)"><svg lucideRefreshCw size="15"></svg> Envoyer un nouveau dossier</button>
        </div>
      } @else {
        <div class="safe"><svg lucideLockKeyhole size="16"></svg>
          <span>Vos documents sont chiffrés, vus seulement par l’équipe de vérification et jamais partagés avec les clients.</span></div>

        <div class="prog" aria-hidden="true">@for (s of steps; track s.key; let i = $index) { <span [class.done]="i <= index()"></span> }</div>
        <div class="count"><span>Étape <strong>{{ index() + 1 }}</strong> sur {{ steps.length }}</span><span>{{ steps[index()].label }}</span></div>

        <form class="card" (ngSubmit)="next()" novalidate>
          @for (k of [step()]; track k) {
            <div class="step" [class.back]="goingBack()">
              @switch (k) {
                @case ('identity') {
                  <h2 class="q">Qui êtes-vous ?</h2>
                  <p class="sub">Exactement comme sur votre pièce d’identité.</p>
                  <div class="grid2">
                    <div class="form-group"><label class="form-label" for="k-first">Prénom</label>
                      <input id="k-first" class="form-input" name="first" [(ngModel)]="firstName" data-autofocus autocomplete="given-name"></div>
                    <div class="form-group"><label class="form-label" for="k-last">Nom de famille</label>
                      <input id="k-last" class="form-input" name="last" [(ngModel)]="lastName" autocomplete="family-name"></div>
                    <div class="form-group"><label class="form-label" for="k-dob">Date de naissance</label>
                      <input id="k-dob" type="date" class="form-input" name="dob" [(ngModel)]="dob" [max]="maxDob"></div>
                    <div class="form-group"><label class="form-label" for="k-nat">Nationalité</label>
                      <app-combo-field inputId="k-nat" name="nat" [freeText]="true" [options]="nationalities" [value]="nationality"
                                       (valueChange)="nationality = $event" ariaLabel="Nationalités" /></div>
                  </div>
                  @if (dob && !adult()) { <p class="err" role="alert">Vous devez avoir au moins 18 ans.</p> }
                }
                @case ('document') {
                  <h2 class="q">Votre pièce d’identité</h2>
                  <p class="sub">Photographiez les deux faces en entier, bien éclairées et sans reflet.</p>
                  <div class="choices" role="radiogroup" aria-label="Type de pièce">
                    <button type="button" class="ch" role="radio" [attr.aria-checked]="documentType === 'CNI'" [class.on]="documentType === 'CNI'" (click)="documentType = 'CNI'">
                      <span class="ch-ic"><svg lucideIdCard size="20"></svg></span><span><b>Carte nationale d’identité</b><small>Recto et verso</small></span></button>
                    <button type="button" class="ch" role="radio" [attr.aria-checked]="documentType === 'PASSPORT'" [class.on]="documentType === 'PASSPORT'" (click)="documentType = 'PASSPORT'">
                      <span class="ch-ic"><svg lucideIdCard size="20"></svg></span><span><b>Passeport</b><small>Page photo et page suivante</small></span></button>
                  </div>
                  <div class="slots">
                    @for (sl of ['front', 'back']; track sl) {
                      <button type="button" class="slot" [class.filled]="!!file(sl)" (click)="pick(sl)" [attr.aria-label]="(sl === 'front' ? 'Recto' : 'Verso') + (file(sl) ? ' : remplacer' : ' : ajouter')">
                        @if (preview(sl); as url) { <img [src]="url" alt=""> }
                        @else if (file(sl)) { <span class="pdf"><svg lucideIdCard size="30"></svg> PDF</span> }
                        @else { <span class="slot-empty"><svg lucideCamera size="26"></svg>{{ sl === 'front' ? 'Recto' : 'Verso' }}<small>Photo ou PDF · 10 Mo max</small></span> }
                        @if (file(sl)) { <span class="slot-tag"><svg lucideCheck size="13"></svg> {{ sl === 'front' ? 'Recto' : 'Verso' }}</span><span class="slot-redo"><svg lucideRefreshCw size="15"></svg></span> }
                      </button>
                    }
                  </div>
                  @if (errors().front || errors().back) { <p class="err" role="alert">{{ errors().front || errors().back }}</p> }
                }
                @case ('selfie') {
                  <h2 class="q">Un selfie avec votre pièce</h2>
                  <p class="sub">Tenez votre pièce à côté de votre visage : les deux doivent être nets.</p>
                  <button type="button" class="slot selfie" [class.filled]="!!file('selfie')" (click)="pick('selfie')" [attr.aria-label]="file('selfie') ? 'Selfie : reprendre' : 'Prendre le selfie'">
                    @if (preview('selfie'); as url) { <img [src]="url" alt=""> }
                    @else { <span class="slot-empty"><svg lucideScanFace size="34"></svg>Prendre le selfie<small>Photo · 10 Mo max</small></span> }
                    @if (file('selfie')) { <span class="slot-tag"><svg lucideCheck size="13"></svg> Selfie</span><span class="slot-redo"><svg lucideRefreshCw size="15"></svg></span> }
                  </button>
                  @if (errors().selfie) { <p class="err" role="alert">{{ errors().selfie }}</p> }
                  <ul class="tips"><li>Sans lunettes de soleil ni casquette.</li><li>Dans un endroit bien éclairé.</li></ul>
                }
                @case ('payout') {
                  <h2 class="q">Où recevoir vos gains ?</h2>
                  <p class="sub">Vos gains vous sont reversés sur ce compte Mobile Money après validation des courses.</p>
                  <div class="choices" role="radiogroup" aria-label="Moyen de reversement">
                    <button type="button" class="ch" role="radio" [attr.aria-checked]="payoutMethod === 'MTN'" [class.on]="payoutMethod === 'MTN'" (click)="payoutMethod = 'MTN'">
                      <span class="ch-ic mtn">MTN</span><span><b>MTN Mobile Money</b><small>Numéro MTN</small></span></button>
                    <button type="button" class="ch" role="radio" [attr.aria-checked]="payoutMethod === 'ORANGE'" [class.on]="payoutMethod === 'ORANGE'" (click)="payoutMethod = 'ORANGE'">
                      <span class="ch-ic om">OM</span><span><b>Orange Money</b><small>Numéro Orange</small></span></button>
                  </div>
                  <label class="form-label" for="k-num">Numéro Mobile Money</label>
                  <input id="k-num" type="tel" inputmode="tel" class="form-input" name="num" [(ngModel)]="payoutNumber" data-autofocus placeholder="+237 6XX XXX XXX" autocomplete="tel">
                  @if (payoutNumber.trim() && !phoneOk()) { <p class="err" role="alert">Numéro invalide : chiffres, espaces et « + » uniquement.</p> }
                }
                @case ('recap') {
                  <h2 class="q">Vérifiez avant d’envoyer</h2>
                  <p class="sub">Vous pouvez encore corriger chaque élément.</p>
                  <ul class="recap">
                    <li><div><small>Identité</small><p>{{ firstName }} {{ lastName }} · {{ dob | date:'d MMMM yyyy' }}</p></div><button type="button" (click)="goTo('identity')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                    <li><div><small>Pièce</small><p>{{ documentType === 'CNI' ? 'Carte nationale d’identité' : 'Passeport' }} · recto et verso</p></div><button type="button" (click)="goTo('document')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                    <li><div><small>Selfie</small><p>Ajouté</p></div><button type="button" (click)="goTo('selfie')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                    <li><div><small>Reversement</small><p>{{ payoutMethod === 'MTN' ? 'MTN Mobile Money' : 'Orange Money' }} · {{ payoutNumber }}</p></div><button type="button" (click)="goTo('payout')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                  </ul>
                  @if (isLoading()) {
                    <p class="sub" aria-live="polite">{{ uploadProgress() >= 100 ? 'Documents reçus, enregistrement du dossier…' : uploadProgress() > 0 ? 'Envoi des documents… ' + uploadProgress() + ' %' : 'Envoi des documents…' }}</p>
                    <div class="bar" [class.indet]="uploadProgress() === 0" role="progressbar" aria-label="Envoi des documents"
                         [attr.aria-valuenow]="uploadProgress()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="uploadProgress() || 35"></i></div>
                  }
                }
              }
            </div>
          }

          <div class="actions">
            @if (index() > 0) { <button type="button" class="prev" (click)="prev()" [disabled]="isLoading()"><svg lucideArrowLeft size="16"></svg><span class="prev-txt"> Retour</span></button> }
            <button type="submit" class="primary-action next" [class.inactive]="!canNext()" [attr.aria-disabled]="!canNext()" [disabled]="isLoading()">
              @if (step() === 'recap') { @if (isLoading()) { Envoi… } @else { <svg lucideSend size="16"></svg> Envoyer mon dossier } }
              @else { Continuer <svg lucideArrowRight size="16"></svg> }
            </button>
          </div>
        </form>
      }

      <input #fileInput type="file" hidden [accept]="accept()" (change)="onFile($event)" [attr.capture]="slot() === 'selfie' ? 'user' : 'environment'">
    </div>
  `,
})
export class KycComponent implements OnInit {
  readonly steps = STEPS;
  readonly step = signal<StepKey>('identity');
  readonly goingBack = signal(false);
  readonly index = computed(() => STEPS.findIndex((s) => s.key === this.step()));
  readonly maxDob = new Date().toISOString().slice(0, 10);

  firstName = '';
  lastName = '';
  dob = '';
  nationality = 'Camerounaise';
  readonly nationalities = ['Camerounaise', 'Gabonaise', 'Tchadienne', 'Centrafricaine', 'Nigériane', 'Congolaise', 'Équato-guinéenne'];
  documentType = 'CNI';
  payoutMethod: 'MTN' | 'ORANGE' = 'MTN';
  payoutNumber = '';

  private readonly files = signal<Record<Slot, File | null>>({ front: null, back: null, selfie: null });
  private readonly previews = signal<Record<Slot, string | null>>({ front: null, back: null, selfie: null });
  readonly errors = signal<Record<Slot, string | null>>({ front: null, back: null, selfie: null });
  readonly slot = signal<Slot>('front');

  readonly kycStatus = signal<KycStatus | null>(null);
  readonly retrying = signal(false);
  readonly sent = signal(false);
  readonly isLoading = signal(false);
  readonly uploadProgress = signal(0);

  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  constructor() {
    inject(DestroyRef).onDestroy(() => Object.values(this.previews()).forEach((u) => u && URL.revokeObjectURL(u)));
  }

  ngOnInit(): void {
    this.http.get<KycStatus>('/api/kyc/my-status').subscribe({
      next: (s) => this.kycStatus.set(s),
      error: () => this.kycStatus.set({ status: 'NONE' }),
    });
    const parts = this.auth.getCurrentUserFullName().trim().split(/\s+/).filter(Boolean);
    this.firstName = parts[0] ?? '';
    this.lastName = parts.slice(1).join(' ');
    this.http.get<any>('/api/users/me').subscribe({
      next: (p) => { if (!this.payoutNumber && p?.phone) this.payoutNumber = p.phone; },
      error: () => { /* pré-remplissage facultatif */ },
    });
  }

  // ── Fichiers ──────────────────────────────────────────────────────────────
  file(s: string): File | null { return this.files()[s as Slot]; }
  preview(s: string): string | null { return this.previews()[s as Slot]; }
  accept(): string { return (this.slot() === 'selfie' ? PHOTO_TYPES : DOC_TYPES).join(','); }

  pick(s: string): void {
    this.slot.set(s as Slot);
    setTimeout(() => (document.querySelector('input[type=file][hidden]') as HTMLInputElement | null)?.click(), 0);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    input.value = '';
    if (!f) return;
    const s = this.slot();
    const allowed = s === 'selfie' ? PHOTO_TYPES : DOC_TYPES;
    const err = f.size > MAX_FILE ? `Fichier trop lourd (${(f.size / 1048576).toFixed(1)} Mo) : 10 Mo maximum.`
      : !allowed.includes(f.type) ? (s === 'selfie' ? 'Choisissez une photo (JPG, PNG ou WebP).' : 'Formats acceptés : JPG, PNG, WebP ou PDF.') : null;
    this.errors.update((e) => ({ ...e, [s]: err }));
    if (err) { this.toast.error(err); return; }
    const old = this.previews()[s];
    if (old) URL.revokeObjectURL(old);
    this.files.update((m) => ({ ...m, [s]: f }));
    this.previews.update((m) => ({ ...m, [s]: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }));
  }

  // ── Étapes ────────────────────────────────────────────────────────────────
  adult(): boolean {
    if (!this.dob) return false;
    const d = new Date(this.dob);
    const limit = new Date(); limit.setFullYear(limit.getFullYear() - 18);
    return d <= limit;
  }

  phoneOk(): boolean { return /^\+?[0-9 ]{8,20}$/.test(this.payoutNumber.trim()); }

  canNext(): boolean {
    switch (this.step()) {
      case 'identity': return !!this.firstName.trim() && !!this.lastName.trim() && this.adult();
      case 'document': return !!this.file('front') && !!this.file('back');
      case 'selfie': return !!this.file('selfie');
      case 'payout': return this.phoneOk();
      case 'recap': return true;
    }
  }

  /** Ce qui manque à l'étape courante (notification quand on appuie sur le bouton grisé). */
  private missing(): string {
    switch (this.step()) {
      case 'identity': return !this.firstName.trim() || !this.lastName.trim() ? 'Indiquez votre prénom et votre nom.' : !this.dob ? 'Indiquez votre date de naissance.' : 'Vous devez avoir au moins 18 ans.';
      case 'document': return !this.file('front') ? 'Ajoutez le recto de votre pièce.' : 'Ajoutez le verso de votre pièce.';
      case 'selfie': return 'Ajoutez votre selfie avec la pièce.';
      case 'payout': return 'Indiquez un numéro Mobile Money valide.';
      default: return '';
    }
  }

  next(): void {
    if (this.isLoading()) return;
    if (!this.canNext()) { this.toast.error(this.missing()); return; }
    if (this.step() === 'recap') { this.submit(); return; }
    this.goTo(STEPS[this.index() + 1].key);
  }

  prev(): void { if (this.index() > 0) this.goTo(STEPS[this.index() - 1].key); }

  goTo(key: StepKey): void {
    this.goingBack.set(STEPS.findIndex((s) => s.key === key) < this.index());
    this.step.set(key);
    setTimeout(() => (document.querySelector('.k [data-autofocus]') as HTMLElement | null)?.focus({ preventScroll: true }), 0);
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────
  private submit(): void {
    this.isLoading.set(true);
    this.uploadProgress.set(0);
    const form = new FormData();
    form.append('firstName', this.firstName.trim());
    form.append('lastName', this.lastName.trim());
    form.append('birthDate', this.dob);
    form.append('nationality', this.nationality.trim());
    form.append('documentType', this.documentType);
    form.append('payoutMethod', this.payoutMethod);
    form.append('payoutNumber', this.payoutNumber.trim());
    form.append('frontFile', this.file('front')!);
    form.append('backFile', this.file('back')!);
    form.append('selfieFile', this.file('selfie')!);

    this.http.post('/api/kyc/submit', form, { reportProgress: true, observe: 'events' }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.min(99, Math.round((100 * event.loaded) / event.total))); // 100 % = réponse reçue
        } else if (event.type === HttpEventType.Response) {
          this.isLoading.set(false);
          this.uploadProgress.set(100);
          this.sent.set(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uploadProgress.set(0);
        this.toast.error(err?.error?.message ?? 'L’envoi a échoué. Vérifiez votre connexion et réessayez.');
      },
    });
  }
}
