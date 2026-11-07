import { warnLoadFailed } from '../../../shared/state/load-error';
import { Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideArrowLeft, LucideArrowRight, LucideCalendarDays, LucideCamera, LucideCheck, LucideFileText,
  LucideLockKeyhole, LucideMapPin, LucideMoreHorizontal, LucidePackage, LucidePencil, LucideShoppingBag,
  LucideGlobe, LucideSmartphone, LucideStar, LucideTruck, LucideUserRound,
} from '@lucide/angular';

type TypeKey = 'ACHAT' | 'LIVRAISON' | 'RETRAIT' | 'AUTRE';
type StepKey = 'type' | 'need' | 'place' | 'contact' | 'when' | 'payer' | 'recap';

interface CourseType {
  value: TypeKey;
  label: string;
  hint: string;
  question: string;
  placeholder: string;
  tip: string;
}

const TYPES: CourseType[] = [
  { value: 'ACHAT', label: 'Achat', hint: 'Faire des courses, acheter un article',
    question: 'Que faut-il acheter ?',
    placeholder: 'Ex : 2 kg de riz, 1 L d’huile et des épices au marché Mokolo, puis les déposer chez ma mère.',
    tip: 'Précisez les articles, les quantités, la marque si besoin, et où déposer les achats.' },
  { value: 'LIVRAISON', label: 'Livraison', hint: 'Apporter quelque chose à quelqu’un',
    question: 'Que faut-il livrer, et à qui ?',
    placeholder: 'Ex : récupérer un sac de vêtements chez moi et le livrer à mon frère Paul.',
    tip: 'Indiquez ce qu’il faut transporter, où le récupérer et la personne qui le reçoit.' },
  { value: 'RETRAIT', label: 'Retrait', hint: 'Récupérer un colis, un document',
    question: 'Que faut-il retirer, et où ?',
    placeholder: 'Ex : retirer un colis au nom de Marie Ndongmo à l’agence de transport, référence 4521.',
    tip: 'Donnez le lieu de retrait, le nom ou la référence à présenter, et où remettre l’objet.' },
  { value: 'AUTRE', label: 'Autre', hint: 'Démarche, file d’attente, autre besoin',
    question: 'Décrivez la course',
    placeholder: 'Ex : déposer un dossier à la mairie et attendre le récépissé.',
    tip: 'Expliquez ce qu’il faut faire, étape par étape, et le résultat attendu.' },
];

/** Grandes villes proposées en suggestion ; toute ville du Cameroun peut être saisie. */
const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua',
  'Ebolowa', 'Buea', 'Limbe', 'Kribi', 'Kumba', 'Dschang', 'Nkongsamba', 'Edéa'];

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'type', label: 'Type' },
  { key: 'need', label: 'Besoin' },
  { key: 'place', label: 'Lieu' },
  { key: 'contact', label: 'Contact' },
  { key: 'when', label: 'Date' },
  { key: 'payer', label: 'Paiement' },
  { key: 'recap', label: 'Vérification' },
];

/**
 * Création / modification d'une course en étapes successives : type → besoin → lieu → date → vérification.
 * Une seule question à l'écran ; chaque étape s'anime dans le sens de la navigation.
 * Le serveur ne connaît que description, zone et scheduledAt : le type est donc placé en tête de la
 * description (« Achat — … ») pour que le coursier le voie, et relu en modification.
 */
@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [
    FormsModule, RouterLink,
    LucideArrowLeft, LucideArrowRight, LucideCalendarDays, LucideCamera, LucideCheck, LucideFileText,
    LucideLockKeyhole, LucideMapPin, LucideMoreHorizontal, LucidePackage, LucidePencil, LucideShoppingBag,
    LucideGlobe, LucideSmartphone, LucideStar, LucideTruck, LucideUserRound,
  ],
  styles: [`
    :host { display: block; --cc-muted-2: #56635c; }
    :host-context([data-theme="dark"]) { --cc-muted-2: #B0C0B7; }
    .wz { max-width: 680px; margin: 0 auto; }
    .wz-head h1 { margin: 0 0 4px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .wz-head p { margin: 0 0 20px; font-size: 15px; color: var(--cc-muted-2); }
    .wz-progress { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 8px; }
    .wz-progress span { height: 5px; border-radius: 5px; background: var(--cc-line); position: relative; overflow: hidden; }
    .wz-progress span::after { content: ''; position: absolute; inset: 0; background: var(--primary); transform: scaleX(0);
      transform-origin: left; transition: transform .45s cubic-bezier(.16,1,.3,1); }
    .wz-progress span.done::after { transform: scaleX(1); }
    .wz-count { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 13px; color: var(--cc-muted-2); }
    .wz-count strong { color: var(--cc-ink); }
    .wz-card { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 26px; box-shadow: 0 10px 30px rgba(18,59,50,.06); overflow: hidden; }
    .wz-step { animation: wz-in .42s cubic-bezier(.16,1,.3,1) both; }
    .wz-step.back { animation-name: wz-in-back; }
    @keyframes wz-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
    @keyframes wz-in-back { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
    .wz-q { margin: 0 0 6px; font-size: 21px; line-height: 1.2; letter-spacing: -.03em; font-weight: 750; color: var(--cc-ink); }
    .wz-sub { margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: var(--cc-muted-2); }
    .types { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .type { display: flex; align-items: center; gap: 12px; padding: 14px; text-align: left; border: 1.5px solid var(--cc-line);
      border-radius: 13px; background: var(--cc-white); color: var(--cc-ink); font: inherit; cursor: pointer;
      transition: border-color .18s, background .18s, transform .12s, box-shadow .18s; }
    .type:hover { border-color: color-mix(in oklab, var(--primary) 50%, var(--cc-line)); }
    .type:active { transform: scale(.98); }
    .type.on { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 8%, var(--cc-white));
      box-shadow: 0 6px 18px color-mix(in oklab, var(--primary) 15%, transparent); }
    .type-ic { flex: none; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); transition: background .18s, color .18s; }
    .type.on .type-ic { background: var(--primary); color: #fff; }
    .type b { display: block; font-size: 15px; }
    .type small { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.35; color: var(--cc-muted-2); }
    textarea.form-input { min-height: 150px; resize: vertical; line-height: 1.55; }
    .count { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: 12.5px; color: var(--cc-muted-2); }
    .count .ok { color: var(--cc-success); font-weight: 650; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .chip { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--cc-line); background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; transition: border-color .15s, background .15s; }
    .chip.on { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 9%, var(--cc-white)); color: var(--primary); }
    .opt { font-weight: 500; color: var(--cc-muted-2); }
    .err { margin: 8px 0 0; font-size: 13px; color: var(--cc-danger); }
    .recap { list-style: none; margin: 0 0 18px; padding: 0; border: 1px solid var(--cc-line); border-radius: 13px; overflow: hidden; }
    .recap li { display: grid; grid-template-columns: 36px 1fr auto; gap: 12px; align-items: start; padding: 14px; }
    .recap li + li { border-top: 1px solid var(--cc-line); }
    .recap-ic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); }
    .recap small { display: block; font-size: 12px; color: var(--cc-muted-2); }
    .recap p { margin: 2px 0 0; font-size: 14.5px; line-height: 1.45; color: var(--cc-ink); white-space: pre-line; word-break: break-word; }
    .recap button { min-height: 36px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--primary); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .recap button:hover { background: var(--cc-paper-2); }
    .assure { display: grid; gap: 10px; padding: 14px 16px; border-radius: 13px; background: var(--cc-paper-2); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .assure div { display: flex; gap: 10px; align-items: flex-start; }
    .assure svg { flex: none; margin-top: 1px; color: var(--primary); }
    .wz-actions { display: flex; gap: 10px; align-items: center; margin-top: 22px; }
    .wz-actions .btn-next { flex: 1 1 0; min-width: 0; min-height: 50px; justify-content: center; white-space: normal; text-align: center; line-height: 1.25; }
    .btn-prev { flex: none; }
    .wz-actions .btn-next:disabled { opacity: .45; box-shadow: none; cursor: not-allowed; }
    .btn-prev { min-height: 50px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .pending { margin-bottom: 18px; padding: 16px 18px; border-radius: 13px; border: 1px solid var(--cc-warning); background: var(--cc-warning-bg); }
    .pending p { margin: 0 0 12px; font-weight: 600; color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .wz-q, :host-context([data-theme="dark"]) .recap p { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .wz-sub, :host-context([data-theme="dark"]) .wz-head p { color: #B0C0B7 !important; }
    :host-context([data-theme="dark"]) .type.on .type-ic { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .chip.on { color: var(--cc-lime); border-color: var(--cc-lime); background: rgba(215,237,154,.1); }
    :host-context([data-theme="dark"]) .recap-ic, :host-context([data-theme="dark"]) .type-ic { background: rgba(255,255,255,.06); }
    :host-context([data-theme="dark"]) .wz-head h1 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .assure, :host-context([data-theme="dark"]) .assure div { color: #E4ECE7 !important; }
    @media (max-width: 640px) {
      .wz-card { padding: 20px 16px; border-radius: 14px; }
      .types { grid-template-columns: 1fr; }
      .grid2 { grid-template-columns: 1fr; }
      .recap li { grid-template-columns: 1fr auto; }
      .prev-txt { display: none; }
      .btn-prev { width: 50px; padding: 0; justify-content: center; }
      .recap-ic { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { .wz-step, .wz-step.back { animation: none; } .wz-progress span::after { transition: none; } }
  `],
  template: `
    <div class="wz">
      <section class="wz-head">
        <h1>{{ isEditMode ? 'Modifier la course' : 'Nouvelle course' }}</h1>
        <p>Une question à la fois : il ne vous faut que quelques minutes.</p>
      </section>

      @if (pendingReview) {
        <!-- TICK-073 : notation obligatoire avant une nouvelle course -->
        <div class="pending" role="alert">
          <p>Avant de créer une nouvelle course, notez votre course terminée « {{ pendingReview.description }} ».</p>
          <a [routerLink]="['/client/rate', pendingReview.courseId]" class="primary-action"><svg lucideStar size="15"></svg> Noter maintenant</a>
        </div>
      }

      <div class="wz-progress" aria-hidden="true">
        @for (s of steps; track s.key; let i = $index) { <span [class.done]="i <= index()"></span> }
      </div>
      <div class="wz-count">
        <span>Étape <strong>{{ index() + 1 }}</strong> sur {{ steps.length }}</span>
        <span>{{ steps[index()].label }}</span>
      </div>

      <form class="wz-card" (ngSubmit)="next()" novalidate>
        @for (k of [step()]; track k) {
          <div class="wz-step" [class.back]="goingBack()">
            @switch (k) {
              @case ('type') {
                <h2 class="wz-q">Quel type de course ?</h2>
                <p class="wz-sub">Choisissez ce qui correspond le mieux : vous préciserez ensuite.</p>
                <div class="types" role="radiogroup" aria-label="Type de course">
                  @for (t of types; track t.value) {
                    <button type="button" class="type" role="radio" [attr.aria-checked]="type() === t.value" [class.on]="type() === t.value"
                            (click)="chooseType(t.value)">
                      <span class="type-ic">
                        @switch (t.value) {
                          @case ('ACHAT') { <svg lucideShoppingBag size="21"></svg> }
                          @case ('LIVRAISON') { <svg lucideTruck size="21"></svg> }
                          @case ('RETRAIT') { <svg lucidePackage size="21"></svg> }
                          @default { <svg lucideMoreHorizontal size="21"></svg> }
                        }
                      </span>
                      <span><b>{{ t.label }}</b><small>{{ t.hint }}</small></span>
                    </button>
                  }
                </div>
              }
              @case ('need') {
                <h2 class="wz-q">{{ current().question }}</h2>
                <p class="wz-sub">{{ current().tip }}</p>
                <label class="form-label" for="cc-desc">Description</label>
                <textarea id="cc-desc" class="form-input" name="description" [(ngModel)]="description" data-autofocus
                          [placeholder]="current().placeholder" maxlength="1000"></textarea>
                <div class="count">
                  @if (description.trim().length < MIN_DESC) { <span>Encore {{ MIN_DESC - description.trim().length }} caractères au minimum</span> }
                  @else { <span class="ok">Description suffisante</span> }
                  <span>{{ description.length }}/1000</span>
                </div>
              }
              @case ('place') {
                <h2 class="wz-q">Où se passe la course ?</h2>
                <p class="wz-sub">Partout au Cameroun. Le quartier aide les coursiers proches à vous répondre.</p>
                <div class="grid2">
                  <div class="form-group">
                    <label class="form-label" for="cc-city">Ville</label>
                    <input id="cc-city" class="form-input" name="city" [(ngModel)]="city" list="cc-cities" data-autofocus
                           placeholder="Ex : Douala" autocomplete="address-level2">
                    <datalist id="cc-cities">@for (c of cities; track c) { <option [value]="c"></option> }</datalist>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cc-area">Quartier</label>
                    <input id="cc-area" class="form-input" name="neighborhood" [(ngModel)]="neighborhood" placeholder="Ex : Akwa, Bastos…">
                  </div>
                </div>
              }
              @case ('contact') {
                <h2 class="wz-q">Une personne à contacter sur place ?</h2>
                <p class="wz-sub">Facultatif. Utile si quelqu’un reçoit la course pour vous : seul le coursier que vous retiendrez verra ces informations.</p>
                <div class="grid2">
                  <div class="form-group">
                    <label class="form-label" for="cc-cname">Nom <span class="opt">(facultatif)</span></label>
                    <input id="cc-cname" class="form-input" name="contactName" [(ngModel)]="contactName" data-autofocus
                           placeholder="Ex : Paul Ndongmo" maxlength="120" autocomplete="off">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cc-cphone">Téléphone <span class="opt">(facultatif)</span></label>
                    <input id="cc-cphone" type="tel" inputmode="tel" class="form-input" name="contactPhone" [(ngModel)]="contactPhone"
                           placeholder="+237 6XX XXX XXX" maxlength="20" autocomplete="off">
                  </div>
                </div>
                @if (contactPhone.trim() && !phoneValid()) { <p class="err" role="alert">Numéro invalide : chiffres, espaces et « + » uniquement.</p> }
              }
              @case ('when') {
                <h2 class="wz-q">Pour quand ?</h2>
                <p class="wz-sub">Le jour et l’heure souhaités. Vous pourrez en discuter avec le coursier.</p>
                <div class="chips" role="group" aria-label="Jour">
                  <button type="button" class="chip" [class.on]="dateVal === today" (click)="dateVal = today">Aujourd’hui</button>
                  <button type="button" class="chip" [class.on]="dateVal === tomorrow" (click)="dateVal = tomorrow">Demain</button>
                </div>
                <div class="grid2">
                  <div class="form-group">
                    <label class="form-label" for="cc-date">Date</label>
                    <input id="cc-date" type="date" class="form-input" name="date" [(ngModel)]="dateVal" [min]="today" data-autofocus>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cc-time">Heure</label>
                    <input id="cc-time" type="time" class="form-input" name="time" [(ngModel)]="timeVal">
                  </div>
                </div>
                @if (dateVal && timeVal && !isFuture()) { <p class="err" role="alert">Choisissez un moment à venir.</p> }
              }
              @case ('payer') {
                <h2 class="wz-q">D’où allez-vous payer ?</h2>
                <p class="wz-sub">Cela détermine le moyen de paiement proposé. Votre argent restera bloqué jusqu’à votre validation des preuves.</p>
                <div class="types" role="radiogroup" aria-label="Lieu de paiement">
                  <button type="button" class="type" role="radio" [attr.aria-checked]="clientLocation() === 'CAMEROON'" [class.on]="clientLocation() === 'CAMEROON'" (click)="chooseLocation('CAMEROON')">
                    <span class="type-ic"><svg lucideSmartphone size="21"></svg></span>
                    <span><b>Depuis le Cameroun</b><small>MTN Mobile Money ou Orange Money</small></span>
                  </button>
                  <button type="button" class="type" role="radio" [attr.aria-checked]="clientLocation() === 'ABROAD'" [class.on]="clientLocation() === 'ABROAD'" (click)="chooseLocation('ABROAD')">
                    <span class="type-ic"><svg lucideGlobe size="21"></svg></span>
                    <span><b>Depuis l’étranger</b><small>Carte bancaire (Visa, Mastercard)</small></span>
                  </button>
                </div>
              }
              @case ('recap') {
                <h2 class="wz-q">Vérifiez votre course</h2>
                <p class="wz-sub">Corrigez si besoin avant de {{ isEditMode ? 'l’enregistrer' : 'la publier' }}.</p>
                <ul class="recap">
                  <li><span class="recap-ic"><svg lucideFileText size="17"></svg></span>
                    <div><small>{{ current().label }}</small><p>{{ description.trim() }}</p></div>
                    <button type="button" (click)="goTo('need')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                  <li><span class="recap-ic"><svg lucideMapPin size="17"></svg></span>
                    <div><small>Lieu</small><p>{{ city.trim() }} · {{ neighborhood.trim() }}</p></div>
                    <button type="button" (click)="goTo('place')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                  <li><span class="recap-ic"><svg lucideUserRound size="17"></svg></span>
                    <div><small>Contact sur place</small>
                      <p>@if (contactName.trim() || contactPhone.trim()) { {{ contactName.trim() }}{{ contactName.trim() && contactPhone.trim() ? ' · ' : '' }}{{ contactPhone.trim() }} } @else { Aucun }</p></div>
                    <button type="button" (click)="goTo('contact')"><svg lucidePencil size="13"></svg> {{ contactName.trim() || contactPhone.trim() ? 'Modifier' : 'Ajouter' }}</button></li>
                  <li><span class="recap-ic"><svg lucideCalendarDays size="17"></svg></span>
                    <div><small>Date souhaitée</small><p>{{ whenLabel() }}</p></div>
                    <button type="button" (click)="goTo('when')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                  <li><span class="recap-ic">@if (clientLocation() === 'ABROAD') { <svg lucideGlobe size="17"></svg> } @else { <svg lucideSmartphone size="17"></svg> }</span>
                    <div><small>Paiement</small><p>{{ clientLocation() === 'ABROAD' ? 'Depuis l’étranger · carte bancaire' : 'Depuis le Cameroun · Mobile Money' }}</p></div>
                    <button type="button" (click)="goTo('payer')"><svg lucidePencil size="13"></svg> Modifier</button></li>
                </ul>
                <div class="assure">
                  <div><svg lucideCamera size="16"></svg><span>Le coursier devra prouver la course : courte vidéo horodatée et géolocalisée, photos et, s’il y a un achat, le reçu.</span></div>
                  <div><svg lucideLockKeyhole size="16"></svg><span>Votre paiement restera bloqué jusqu’à ce que vous validiez ces preuves.</span></div>
                </div>
              }
            }
          </div>
        }

        <div class="wz-actions">
          @if (index() > 0) {
            <button type="button" class="btn-prev" (click)="prev()" aria-label="Étape précédente"><svg lucideArrowLeft size="16"></svg><span class="prev-txt"> Retour</span></button>
          }
          @if (step() !== 'type') {
            <button type="submit" class="primary-action btn-next" [disabled]="!canNext() || isLoading">
              @if (step() === 'recap') {
                @if (isLoading) { Envoi… } @else if (isEditMode) { <svg lucideCheck size="16"></svg> Enregistrer } @else { Publier et choisir un coursier <svg lucideArrowRight size="16"></svg> }
              } @else if (step() === 'contact' && !contactName.trim() && !contactPhone.trim()) { Passer cette étape <svg lucideArrowRight size="16"></svg>
              } @else { Continuer <svg lucideArrowRight size="16"></svg> }
            </button>
          }
        </div>
      </form>
    </div>
  `,
})
export class CreateCourseComponent implements OnInit {
  readonly MIN_DESC = 15;
  readonly types = TYPES;
  readonly steps = STEPS;
  readonly cities = CITIES;

  readonly step = signal<StepKey>('type');
  readonly goingBack = signal(false);
  readonly index = computed(() => STEPS.findIndex((s) => s.key === this.step()));
  readonly type = signal<TypeKey>('ACHAT');
  /** Mémorisé pour la prochaine course (la plupart des clients paient toujours du même endroit). */
  readonly clientLocation = signal<'CAMEROON' | 'ABROAD' | null>(this.lastLocation());
  readonly current = computed(() => TYPES.find((t) => t.value === this.type())!);

  description = '';
  city = '';
  neighborhood = '';
  dateVal = '';
  contactName = '';
  contactPhone = '';
  timeVal = '';
  readonly today = this.isoDate(0);
  readonly tomorrow = this.isoDate(1);

  isLoading = false;
  isEditMode = false;
  courseId: number | null = null;
  /** TICK-073 : première course terminée à noter (bloque la création). */
  pendingReview: { courseId: number; description: string } | null = null;

  private courseService = inject(CourseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);
  private http = inject(HttpClient);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.courseId = Number(id);
      this.loadCourseData(this.courseId);
    } else {
      this.prefillFromProfile();
      this.courseService.getPendingReviews().subscribe({
        next: (list) => (this.pendingReview = list[0] ?? null),
        error: warnLoadFailed('avis en attente du client', 'création non bloquée côté écran (le serveur revérifie)'),
      });
    }
  }

  // ── Navigation entre étapes ────────────────────────────────────────────────
  chooseType(t: TypeKey): void {
    this.type.set(t);
    setTimeout(() => this.goTo('need'), 160); // laisse voir la sélection avant d'avancer
  }

  canNext(): boolean {
    switch (this.step()) {
      case 'type': return true;
      case 'need': return this.description.trim().length >= this.MIN_DESC;
      case 'place': return !!this.city.trim() && !!this.neighborhood.trim();
      case 'contact': return !this.contactPhone.trim() || this.phoneValid();
      case 'when': return !!this.dateVal && !!this.timeVal && this.isFuture();
      case 'payer': return !!this.clientLocation();
      case 'recap': return true;
    }
  }

  next(): void {
    if (!this.canNext() || this.isLoading) return;
    if (this.step() === 'recap') { this.submit(); return; }
    this.goTo(STEPS[this.index() + 1].key);
  }

  prev(): void { if (this.index() > 0) this.goTo(STEPS[this.index() - 1].key); }

  goTo(key: StepKey): void {
    this.goingBack.set(STEPS.findIndex((s) => s.key === key) < this.index());
    this.step.set(key);
    setTimeout(() => {
      (this.host.nativeElement.querySelector('[data-autofocus]') as HTMLElement | null)?.focus({ preventScroll: true });
      this.host.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    }, 0);
  }

  /** Pré-remplit la ville (profil) et, à défaut de choix mémorisé, le lieu de paiement (pays du profil). */
  private prefillFromProfile(): void {
    this.http.get<any>('/api/users/me').subscribe({
      next: (p) => {
        const city = String(p?.city ?? '').trim();
        if (!this.city && city && city !== 'Autre') this.city = city;
        const country = String(p?.country ?? '').trim();
        if (!this.clientLocation() && country) this.clientLocation.set(country === 'Cameroun' ? 'CAMEROON' : 'ABROAD');
      },
      error: () => { /* pré-remplissage facultatif */ },
    });
  }

  chooseLocation(loc: 'CAMEROON' | 'ABROAD'): void {
    this.clientLocation.set(loc);
    try { localStorage.setItem('cc_client_location', loc); } catch { /* stockage indisponible */ }
    setTimeout(() => this.goTo('recap'), 160);
  }

  private lastLocation(): 'CAMEROON' | 'ABROAD' | null {
    try {
      const v = localStorage.getItem('cc_client_location');
      return v === 'CAMEROON' || v === 'ABROAD' ? v : null;
    } catch { return null; }
  }

  // ── Valeurs ────────────────────────────────────────────────────────────────
  phoneValid(): boolean { return /^\+?[0-9 ]{6,20}$/.test(this.contactPhone.trim()); }

  isFuture(): boolean {
    if (!this.dateVal || !this.timeVal) return false;
    return new Date(`${this.dateVal}T${this.timeVal}:00`).getTime() > Date.now();
  }

  whenLabel(): string {
    if (!this.dateVal) return '';
    const d = new Date(`${this.dateVal}T${this.timeVal || '00:00'}:00`);
    const day = this.dateVal === this.today ? 'Aujourd’hui' : this.dateVal === this.tomorrow ? 'Demain'
      : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${this.timeVal.replace(':', ' h ')}`;
  }

  private isoDate(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Type placé en tête de la description (le serveur n'a pas de champ « type »). */
  private buildDescription(): string {
    const text = this.description.trim();
    return this.type() === 'AUTRE' ? text : `${this.current().label} — ${text}`;
  }

  // ── Chargement / envoi ─────────────────────────────────────────────────────
  loadCourseData(id: number): void {
    this.isLoading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course: any) => {
        this.isLoading = false;
        const raw: string = course.description ?? '';
        const m = raw.match(/^(Achat|Livraison|Retrait) — ([\s\S]*)$/);
        if (m) {
          this.type.set(TYPES.find((t) => t.label === m[1])!.value);
          this.description = m[2];
        } else {
          this.type.set('AUTRE');
          this.description = raw;
        }
        if (course.zone) {
          const parts = (course.zone as string).split(' - ');
          this.city = parts[0]?.trim() ?? '';
          this.neighborhood = parts.slice(1).join(' - ').trim();
        }
        this.contactName = course.contactName ?? '';
        this.contactPhone = course.contactPhone ?? '';
        if (course.clientLocation === 'CAMEROON' || course.clientLocation === 'ABROAD') this.clientLocation.set(course.clientLocation);
        if (course.scheduledAt) {
          const [d, t] = (course.scheduledAt as string).substring(0, 16).split('T');
          this.dateVal = d ?? '';
          this.timeVal = t ?? '';
        }
        this.step.set('recap');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Impossible de charger la course.');
        this.router.navigate(['/client/dashboard']);
      },
    });
  }

  private submit(): void {
    this.isLoading = true;
    const data = {
      description: this.buildDescription(),
      zone: `${this.city.trim()} - ${this.neighborhood.trim()}`,
      scheduledAt: `${this.dateVal}T${this.timeVal}:00`,
      contactName: this.contactName.trim() || null,
      contactPhone: this.contactPhone.trim() || null,
      clientLocation: this.clientLocation(),
    };
    const request$ = this.isEditMode && this.courseId
      ? this.courseService.updateCourse(this.courseId, data)
      : this.courseService.createCourse(data);

    request$.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (this.isEditMode) {
          this.toast.success('Course mise à jour.');
          this.router.navigate(['/client/dashboard']);
          return;
        }
        const newId: number = response?.id ?? response?.courseId;
        this.toast.success('Course publiée : choisissez maintenant votre coursier.');
        this.router.navigate(newId ? ['/client/select-courier', newId] : ['/client/dashboard']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Une erreur est survenue. Réessayez.');
      },
    });
  }
}
