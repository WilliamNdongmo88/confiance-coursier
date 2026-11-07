import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { homeForRole } from '../../../core/auth/session';
import { LucideCheck, LucideLockKeyhole, LucideMessageCircle, LucideScale, LucideShieldCheck } from '@lucide/angular';

interface MotifOption { code: string; title: string; hint: string; }

/** Codes attendus par le serveur (TICK-062) : L-C* pour le client, L-F* pour le coursier. */
const CLIENT_MOTIFS: MotifOption[] = [
  { code: 'L-C1', title: 'La course n’a pas été faite', hint: 'Rien n’a été acheté, livré ou retiré.' },
  { code: 'L-C2', title: 'La course est incomplète', hint: 'Une partie seulement a été réalisée.' },
  { code: 'L-C3', title: 'Les preuves ne sont pas conformes', hint: 'Vidéo, photos ou reçu absents, flous ou trompeurs.' },
  { code: 'L-C6', title: 'Retard important', hint: 'Délai largement dépassé sans explication.' },
  { code: 'L-C5', title: 'Comportement irrespectueux', hint: 'Propos ou attitude inacceptables du coursier.' },
  { code: 'L-C4', title: 'Argent détourné', hint: 'Les achats n’ont pas été faits avec l’argent remboursé.' },
];
const COURIER_MOTIFS: MotifOption[] = [
  { code: 'L-F1', title: 'Le client ne valide pas', hint: 'La course est faite et les preuves envoyées.' },
  { code: 'L-F2', title: 'Supplément légitime refusé', hint: 'Un coût réel et justifié n’est pas pris en compte.' },
  { code: 'L-F3', title: 'Client injurieux ou menaçant', hint: 'Propos ou attitude inacceptables.' },
  { code: 'L-F4', title: 'Fausse accusation', hint: 'Le client affirme à tort que la course n’est pas faite.' },
];

const MIN = 20;
const MAX = 2000;

/**
 * Ouverture d'un litige (client ou coursier), base maquette-v2/client/dispute-form.html, Impeccable.
 * Décision lourde : on explique d'abord ce qui va se passer, on fait choisir un motif lisible (cartes, pas une liste
 * de codes), on guide la description, puis on confirme avec un écran de suivi plutôt qu'une redirection muette.
 */
@Component({
  selector: 'app-dispute-form',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideCheck, LucideLockKeyhole, LucideMessageCircle, LucideScale, LucideShieldCheck],
  styles: [`
    :host { display: block; --dm: #56635c; }
    :host-context([data-theme="dark"]) { --dm: #B0C0B7; }
    .d { max-width: 760px; margin: 0 auto; }
    .d-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .d-head p { margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: var(--dm); max-width: 62ch; }
    .how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 18px; padding: 0; list-style: none; }
    .how li { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 12px; background: var(--cc-paper-2); font-size: 13px; line-height: 1.45; color: var(--cc-ink); }
    .how svg { flex: none; margin-top: 1px; color: var(--primary); }
    .chat-first { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 18px; padding: 12px 14px;
      border-radius: 12px; border: 1px dashed var(--cc-line); font-size: 13.5px; color: var(--cc-ink); }
    .chat-first a { color: var(--primary); font-weight: 750; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 22px; margin-bottom: 16px; animation: d-in .45s cubic-bezier(.16,1,.3,1) both; }
    .box h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 4px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .num { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; }
    .box > p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--dm); }
    .motifs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mo { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; text-align: left; border: 1.5px solid var(--cc-line); border-radius: 13px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; cursor: pointer; transition: border-color .18s, background .18s, box-shadow .18s; }
    .mo:hover { border-color: color-mix(in oklab, var(--cc-danger) 40%, var(--cc-line)); }
    .mo.on { border-color: var(--cc-danger); background: color-mix(in oklab, var(--cc-danger) 6%, var(--cc-white)); box-shadow: 0 6px 16px color-mix(in oklab, var(--cc-danger) 12%, transparent); }
    .radio { flex: none; margin-top: 2px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid color-mix(in oklab, var(--cc-ink) 30%, transparent); display: grid; place-items: center; }
    .mo.on .radio { border-color: var(--cc-danger); }
    .mo.on .radio::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--cc-danger); animation: d-pop .25s cubic-bezier(.16,1,.3,1); }
    .mo b { display: block; font-size: 14.5px; }
    .mo small { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.4; color: var(--dm); }
    textarea.form-input { min-height: 150px; resize: vertical; line-height: 1.55; }
    .tips { list-style: disc; margin: 0 0 10px; padding-left: 20px; font-size: 13px; line-height: 1.55; color: var(--dm); }
    .count { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: 12.5px; color: var(--dm); }
    .count .ok { color: var(--cc-success); font-weight: 650; }
    .submit-zone { display: grid; gap: 10px; }
    .confirm-line { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); cursor: pointer; }
    .confirm-line input { flex: none; width: 20px; height: 20px; margin: 1px 0 0; accent-color: var(--cc-danger); }
    .go { width: 100%; min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; border: 0;
      background: var(--cc-danger); color: #fff; font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; transition: background .15s, opacity .15s; }
    .go:hover { background: #9c3a35; }
    .go.inactive { opacity: .45; }
    .cancel { justify-self: center; min-height: 44px; display: inline-flex; align-items: center; color: var(--dm); font-weight: 700; text-decoration: none; }
    .state { text-align: center; padding: 30px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); animation: d-in .45s cubic-bezier(.16,1,.3,1) both; }
    .state h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--cc-ink); }
    .state p { margin: 0 auto 16px; max-width: 46ch; color: var(--dm); line-height: 1.55; }
    .state .ic { width: 62px; height: 62px; margin: 0 auto 14px; border-radius: 18px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); animation: d-pop .5s cubic-bezier(.16,1,.3,1); }
    .state ol { list-style: decimal; max-width: 420px; margin: 0 auto 18px; padding-left: 22px; text-align: left; font-size: 14px; line-height: 1.6; color: var(--cc-ink); }
    @keyframes d-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes d-pop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
    :host-context([data-theme="dark"]) .d-head h1, :host-context([data-theme="dark"]) .box h2, :host-context([data-theme="dark"]) .mo b,
    :host-context([data-theme="dark"]) .state h2, :host-context([data-theme="dark"]) .how li, :host-context([data-theme="dark"]) .chat-first,
    :host-context([data-theme="dark"]) .confirm-line, :host-context([data-theme="dark"]) .state ol { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .how li, :host-context([data-theme="dark"]) .state .ic { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .how svg, :host-context([data-theme="dark"]) .chat-first a, :host-context([data-theme="dark"]) .state .ic { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .num { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .mo.on .radio { border-color: #E2776F; }
    :host-context([data-theme="dark"]) .mo.on .radio::after { background: #E2776F; }
    :host-context([data-theme="dark"]) .mo.on { border-color: #E2776F; }
    @media (max-width: 640px) {
      .how { grid-template-columns: 1fr; }
      .motifs { grid-template-columns: 1fr; }
      .box { padding: 18px 16px; }
    }
    @media (prefers-reduced-motion: reduce) { .box, .state, .state .ic, .mo.on .radio::after { animation: none; } }
  `],
  template: `
    <div class="d">
      <section class="d-head">
        <h1>Ouvrir un litige</h1>
        <p>Un administrateur examinera la course, les preuves et la discussion, puis tranchera.</p>
      </section>

      @if (sent()) {
        <div class="state" role="status">
          <span class="ic"><svg lucideScale size="28"></svg></span>
          <h2>Litige ouvert</h2>
          <p>Votre demande a bien été transmise. Voici la suite :</p>
          <ol>
            <li>L’argent reste bloqué : rien n’est versé ni remboursé pour l’instant.</li>
            <li>Un administrateur examine les preuves et la discussion, et peut vous contacter.</li>
            <li>Vous recevez sa décision par email : versement, remboursement ou partage.</li>
          </ol>
          <a class="primary-action" [routerLink]="followLink()">Suivre la course</a>
        </div>
      } @else if (blockedReason()) {
        <div class="state" role="status">
          <span class="ic"><svg lucideShieldCheck size="28"></svg></span>
          <h2>Litige impossible pour l’instant</h2>
          <p>{{ blockedReason() }}</p>
          <a class="primary-action" [routerLink]="followLink()">Retour à la course</a>
        </div>
      } @else {
        <ul class="how" aria-label="Ce qui va se passer">
          <li><svg lucideLockKeyhole size="16"></svg><span>L’argent reste <strong>bloqué</strong> jusqu’à la décision.</span></li>
          <li><svg lucideShieldCheck size="16"></svg><span>Un administrateur lit les <strong>preuves et le chat</strong>.</span></li>
          <li><svg lucideScale size="16"></svg><span>Décision : <strong>versement, remboursement ou partage</strong>.</span></li>
        </ul>

        @if (chatRoomId()) {
          <div class="chat-first">
            <span>Un simple malentendu ? Essayez d’abord d’en parler.</span>
            <a [routerLink]="['/chat', chatRoomId()]"><svg lucideMessageCircle size="16"></svg> Ouvrir la discussion</a>
          </div>
        }

        <form (submit)="onSubmit($event)" novalidate>
          <section class="box" aria-labelledby="d-motif">
            <h2 id="d-motif"><span class="num">1</span> Quel est le problème ?</h2>
            <p>Choisissez ce qui décrit le mieux la situation.</p>
            <div class="motifs" role="radiogroup" aria-labelledby="d-motif">
              @for (m of motifs; track m.code) {
                <button type="button" class="mo" role="radio" [attr.aria-checked]="motifCode() === m.code" [class.on]="motifCode() === m.code"
                        (click)="motifCode.set(m.code)">
                  <span class="radio" aria-hidden="true"></span>
                  <span><b>{{ m.title }}</b><small>{{ m.hint }}</small></span>
                </button>
              }
            </div>
          </section>

          <section class="box" aria-labelledby="d-desc">
            <h2 id="d-desc"><span class="num">2</span> Que s’est-il passé ?</h2>
            <ul class="tips">
              <li>Les faits, dans l’ordre, avec les heures si possible.</li>
              <li>Ce qui était prévu et ce qui a été fait.</li>
              <li>Ce que vous attendez : remboursement total, partiel, ou paiement.</li>
            </ul>
            <label class="form-label" for="d-text">Description</label>
            <textarea id="d-text" class="form-input" name="description" [ngModel]="description()" (ngModelChange)="description.set($event)"
                      [attr.maxlength]="MAX" placeholder="Ex : le coursier a envoyé une photo d’un autre produit que celui demandé…"></textarea>
            <div class="count">
              @if (descLen() < MIN) { <span>Encore {{ MIN - descLen() }} caractères au minimum</span> } @else { <span class="ok">Description suffisante</span> }
              <span>{{ descLen() }}/{{ MAX }}</span>
            </div>
          </section>

          <section class="box submit-zone" aria-label="Confirmation">
            <label class="confirm-line">
              <input type="checkbox" [ngModel]="understood()" (ngModelChange)="understood.set($event)" name="understood">
              <span>Je comprends que l’argent reste bloqué jusqu’à la décision de l’administrateur, et que ma description doit être exacte.</span>
            </label>
            <button type="submit" class="go" [class.inactive]="!isFormValid()" [attr.aria-disabled]="!isFormValid()" [disabled]="isSubmitting()">
              <svg lucideScale size="17"></svg> {{ isSubmitting() ? 'Envoi…' : 'Ouvrir le litige' }}
            </button>
            <a class="cancel" [routerLink]="followLink()">Annuler</a>
          </section>
        </form>
      }
    </div>
  `,
})
export class DisputeFormComponent implements OnInit {
  readonly MIN = MIN;
  readonly MAX = MAX;
  courseId!: number;
  motifs: MotifOption[] = CLIENT_MOTIFS;

  readonly motifCode = signal('');
  readonly description = signal('');
  readonly understood = signal(false);
  readonly isSubmitting = signal(false);
  readonly sent = signal(false);
  readonly blockedReason = signal<string | null>(null);
  readonly chatRoomId = signal<number | null>(null);
  readonly descLen = computed(() => this.description().trim().length);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  private get isCourier(): boolean { return this.auth.getCurrentUserRole().toUpperCase() === 'COURIER'; }

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.motifs = this.isCourier ? COURIER_MOTIFS : CLIENT_MOTIFS;
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate([homeForRole(this.auth.getCurrentUserRole())]);
      return;
    }
    // Statut vérifié avant la saisie (le serveur reste la source de vérité)
    this.http.get<any>(`/api/courses/${this.courseId}`).subscribe({
      next: (course) => { this.blockedReason.set(this.reasonFor(course.status)); this.chatRoomId.set(course.chatRoomId ?? null); },
      error: () => this.blockedReason.set('Impossible de charger la course. Réessayez plus tard.'),
    });
  }

  private reasonFor(status: string): string | null {
    switch (status) {
      case 'IN_PROGRESS':
      case 'OVERDUE':
      case 'PROOFS_SUBMITTED': return null;
      case 'DISPUTED': return 'Un litige est déjà ouvert pour cette course : un administrateur l’examine.';
      case 'PUBLISHED':
      case 'ASSIGNED': return 'La course n’est pas encore payée : discutez avec le coursier ou annulez la course.';
      default: return 'Cette course est clôturée : un litige n’est plus possible.';
    }
  }

  followLink(): string[] {
    return this.isCourier ? ['/courier/dashboard'] : ['/client/course-detail', String(this.courseId)];
  }

  isFormValid(): boolean {
    return !!this.motifCode() && this.descLen() >= MIN && this.understood();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting() || this.blockedReason()) return;
    // Bouton jamais muet : on dit précisément ce qui manque
    if (!this.motifCode()) { this.toast.error('Choisissez le motif du litige.'); return; }
    if (this.descLen() < MIN) { this.toast.error(`Décrivez la situation (au moins ${MIN} caractères).`); document.getElementById('d-text')?.focus(); return; }
    if (!this.understood()) { this.toast.error('Cochez la case de confirmation pour ouvrir le litige.'); return; }

    this.isSubmitting.set(true);
    this.http.post(`/api/disputes?courseId=${this.courseId}`, { motifCode: this.motifCode(), description: this.description().trim() }).subscribe({
      next: () => { this.isSubmitting.set(false); this.sent.set(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message ?? 'Le litige n’a pas pu être ouvert. Réessayez.');
      },
    });
  }
}
