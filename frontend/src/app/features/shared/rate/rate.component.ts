import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideCheck, LucideSend, LucideStar } from '@lucide/angular';

const STAR_LABELS: Record<number, string> = { 1: 'Très mauvais', 2: 'Mauvais', 3: 'Correct', 4: 'Bien', 5: 'Excellent' };

/** Points rapides selon le rôle noté et le ressenti (ajoutés en tête du commentaire). */
const TAGS = {
  COURIER: {
    good: ['Ponctuel', 'Preuves claires', 'Bonne communication', 'Soigneux', 'Aimable'],
    bad: ['En retard', 'Preuves incomplètes', 'Difficile à joindre', 'Ne correspond pas à la demande', 'Peu soigneux'],
  },
  CLIENT: {
    good: ['Demande claire', 'Réactif', 'Aimable', 'Validation rapide', 'Bonnes indications'],
    bad: ['Demande floue', 'Peu joignable', 'Validation tardive', 'Changements de dernière minute', 'Peu courtois'],
  },
};

/**
 * Notation après une course terminée (client → coursier, coursier → client), obligatoire (TICK-073).
 * Base maquette-v2/client/rate.html, Impeccable : une étoile = un geste ; points rapides adaptés à la note ;
 * confirmation sur place après l'envoi.
 */
@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideCheck, LucideSend, LucideStar],
  styles: [`
    :host { display: block; --rm: #56635c; --gold: #d99d45; }
    :host-context([data-theme="dark"]) { --rm: #B0C0B7; --gold: #E3A857; }
    .rate { max-width: 560px; margin: 0 auto; }
    .card { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 18px; padding: 28px 24px; text-align: center;
      box-shadow: 0 14px 34px rgba(18,59,50,.07); animation: r-in .45s cubic-bezier(.16,1,.3,1) both; }
    .av { width: 64px; height: 64px; margin: 0 auto 12px; border-radius: 18px; display: grid; place-items: center;
      background: var(--cc-paper-2); color: var(--primary); font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
    h1 { text-wrap: balance; margin: 0 0 6px; font-size: clamp(22px, 3.6vw, 26px); line-height: 1.2; letter-spacing: -.035em; font-weight: 800; color: var(--cc-ink); }
    .sub { margin: 0 0 22px; font-size: 14.5px; line-height: 1.5; color: var(--rm); }
    .stars { display: flex; justify-content: center; gap: 6px; }
    .star { width: 52px; height: 52px; display: grid; place-items: center; border: 0; border-radius: 12px; background: none; cursor: pointer;
      color: color-mix(in oklab, var(--cc-ink) 22%, transparent); transition: color .15s, transform .18s cubic-bezier(.16,1,.3,1); }
    .star:hover { transform: scale(1.08); }
    .star.on { color: var(--gold); }
    .star.on svg { fill: currentColor; }
    .star.pop { animation: r-pop .35s cubic-bezier(.16,1,.3,1); }
    .star:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
    .label { min-height: 24px; margin: 8px 0 0; font-size: 15px; font-weight: 750; color: var(--cc-ink); }
    .label.idle { font-weight: 550; color: var(--rm); }
    .more { margin-top: 20px; text-align: left; animation: r-in .35s cubic-bezier(.16,1,.3,1) both; }
    .more h2 { margin: 0 0 10px; font-size: 14.5px; font-weight: 750; color: var(--cc-ink); }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .tag { min-height: 40px; padding: 0 14px; border-radius: 99px; border: 1.5px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink);
      font: inherit; font-size: 13.5px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color .15s, background .15s; }
    .tag.on { border-color: var(--primary); background: color-mix(in oklab, var(--primary) 9%, var(--cc-white)); color: var(--primary); }
    textarea.form-input { min-height: 96px; resize: vertical; line-height: 1.5; }
    .count { margin-top: 6px; text-align: right; font-size: 12.5px; color: var(--rm); }
    .low { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; background: var(--cc-warning-bg); font-size: 13px; line-height: 1.45; color: var(--cc-ink); }
    .send { width: 100%; min-height: 50px; margin-top: 18px; justify-content: center; font-size: 15px; }
    .send:disabled { opacity: .45; box-shadow: none; cursor: not-allowed; }
    :host-context([data-theme="dark"]) .send:not(:disabled) { background: var(--cc-lime); color: #123b32; }
    .done .ok { width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; background: var(--cc-success); color: #fff;
      animation: r-pop .5s cubic-bezier(.16,1,.3,1); }
    .done .actions { display: grid; gap: 10px; margin-top: 18px; }
    @keyframes r-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes r-pop { 0% { transform: scale(.6); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
    :host-context([data-theme="dark"]) h1, :host-context([data-theme="dark"]) .label, :host-context([data-theme="dark"]) .more h2 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .sub, :host-context([data-theme="dark"]) .label.idle { color: #B0C0B7 !important; }
    :host-context([data-theme="dark"]) .av { background: rgba(215,237,154,.12); color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .star { color: rgba(255,255,255,.28); }
    :host-context([data-theme="dark"]) .star.on { color: var(--gold); }
    :host-context([data-theme="dark"]) .tag.on { color: var(--cc-lime); border-color: var(--cc-lime); background: rgba(215,237,154,.1); }
    :host-context([data-theme="dark"]) .low { color: #F3F7F5; }
    @media (max-width: 420px) { .card { padding: 24px 16px; } .star { width: 46px; height: 46px; } }
    @media (prefers-reduced-motion: reduce) { .card, .more, .star.pop, .done .ok { animation: none; } .star:hover { transform: none; } }
  `],
  template: `
    <div class="rate">
      @if (!sent()) {
        <form class="card" (submit)="onSubmit($event)">
          <span class="av" aria-hidden="true">{{ targetInitials() }}</span>
          <h1>Comment s’est passée la course avec {{ targetName() }}&nbsp;?</h1>
          <p class="sub">Votre note est obligatoire après chaque course : elle aide {{ role() === 'CLIENT' ? 'les clients à choisir un coursier de confiance' : 'les coursiers à choisir leurs clients' }}.</p>

          <div class="stars" role="radiogroup" aria-label="Note de 1 à 5 étoiles" (mouseleave)="hoveredStar.set(0)">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button type="button" class="star" role="radio" [attr.aria-checked]="selectedStar() === n"
                      [attr.aria-label]="n + ' étoile' + (n > 1 ? 's' : '') + ' : ' + labels[n]"
                      [class.on]="n <= (hoveredStar() || selectedStar())" [class.pop]="popped() === n"
                      (mouseenter)="hoveredStar.set(n)" (click)="selectStar(n)" (keydown)="onKey($event, n)">
                <svg lucideStar size="36"></svg>
              </button>
            }
          </div>
          <p class="label" [class.idle]="!(hoveredStar() || selectedStar())" aria-live="polite">{{ starLabel() }}</p>

          @if (selectedStar()) {
            <div class="more">
              <h2>{{ selectedStar() >= 4 ? 'Qu’avez-vous apprécié ?' : selectedStar() === 3 ? 'Qu’est-ce qui aurait pu être mieux ?' : 'Que s’est-il passé ?' }} <span class="count">(facultatif)</span></h2>
              <div class="tags">
                @for (t of tags(); track t) {
                  <button type="button" class="tag" [class.on]="picked().includes(t)" [attr.aria-pressed]="picked().includes(t)" (click)="toggle(t)">
                    @if (picked().includes(t)) { <svg lucideCheck size="14"></svg> } {{ t }}
                  </button>
                }
              </div>
              <label class="form-label" for="rate-comment">Un mot de plus ? <span class="count">(facultatif)</span></label>
              <textarea id="rate-comment" class="form-input" name="comment" [(ngModel)]="comment" maxlength="900"
                        [placeholder]="role() === 'CLIENT' ? 'Ex : très réactif, preuves claires, merci !' : 'Ex : demande claire, validation rapide.'"></textarea>
              <div class="count">{{ comment.length }}/900</div>
              @if (selectedStar() <= 2) {
                <p class="low">Une note basse compte : plusieurs notes basses entraînent une vérification du compte. Si la course a posé un vrai problème, pensez aussi au litige ou au signalement.</p>
              }
            </div>
          }

          <button type="submit" class="primary-action send" [disabled]="!selectedStar() || isSubmitting()">
            @if (isSubmitting()) { Envoi… } @else if (!selectedStar()) { Choisissez une note } @else { <svg lucideSend size="16"></svg> Envoyer ma note }
          </button>
        </form>
      } @else {
        <div class="card done" role="status">
          <span class="ok"><svg lucideCheck size="30"></svg></span>
          <h1>Merci pour votre note</h1>
          <p class="sub">{{ selectedStar() }} étoile{{ selectedStar() > 1 ? 's' : '' }} pour {{ targetName() }}. Votre avis a bien été enregistré.</p>
          <div class="actions">
            @if (role() === 'CLIENT') {
              <a class="primary-action send" routerLink="/client/create-course">Confier une nouvelle course</a>
              <a class="btn btn-secondary" routerLink="/client/dashboard">Retour au tableau de bord</a>
            } @else {
              <a class="primary-action send" routerLink="/courier/dashboard">Voir les demandes</a>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class RateComponent implements OnInit {
  readonly labels = STAR_LABELS;
  courseId!: number;
  readonly role = signal<'CLIENT' | 'COURIER'>('CLIENT');
  readonly targetName = signal('votre coursier');
  readonly targetInitials = signal('?');

  readonly hoveredStar = signal(0);
  readonly selectedStar = signal(0);
  readonly popped = signal(0);
  readonly picked = signal<string[]>([]);
  comment = '';
  readonly isSubmitting = signal(false);
  readonly sent = signal(false);

  /** Points proposés : ceux de la personne notée (rôle inverse), positifs ou négatifs selon la note. */
  readonly tags = computed(() => {
    const set = this.role() === 'CLIENT' ? TAGS.COURIER : TAGS.CLIENT;
    return this.selectedStar() >= 4 ? set.good : set.bad;
  });

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    const userRole = (this.auth.getCurrentUserRole() ?? 'CLIENT').toUpperCase();
    this.role.set(userRole === 'COURIER' ? 'COURIER' : 'CLIENT');
    this.targetName.set(this.role() === 'CLIENT' ? 'votre coursier' : 'votre client');
    if (!this.courseId) {
      this.toast.error('Identifiant de course manquant.');
      this.router.navigate([this.home()]);
      return;
    }
    this.http.get<any>(`/api/courses/${this.courseId}`).subscribe({
      next: (course) => {
        // TICK-073 : vrais noms fournis par l'API
        const name: string = this.role() === 'CLIENT' ? (course.courierName || 'votre coursier') : (course.clientName || 'votre client');
        this.targetName.set(name);
        this.targetInitials.set(name.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('') || '?');
        if (course.status === 'COMPLETED' && course.reviewDue === false) {
          this.toast.info('Vous avez déjà noté cette course.');
          this.router.navigate([this.home()]);
        }
      },
      error: () => { /* noms seulement cosmétiques */ },
    });
  }

  private home(): string { return this.role() === 'CLIENT' ? '/client/dashboard' : '/courier/dashboard'; }

  starLabel(): string {
    const n = this.hoveredStar() || this.selectedStar();
    return n ? STAR_LABELS[n] : 'Touchez une étoile pour noter';
  }

  selectStar(n: number): void {
    const wasPositive = this.selectedStar() >= 4;
    this.selectedStar.set(n);
    this.popped.set(0);
    setTimeout(() => this.popped.set(n), 0);
    if (wasPositive !== n >= 4) this.picked.set([]); // les points changent de sens
  }

  /** Flèches gauche/droite pour changer la note au clavier. */
  onKey(e: KeyboardEvent, n: number): void {
    const next = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? Math.min(5, n + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? Math.max(1, n - 1) : 0;
    if (!next) return;
    e.preventDefault();
    this.selectStar(next);
    ((e.target as HTMLElement).parentElement?.children[next - 1] as HTMLElement | undefined)?.focus();
  }

  toggle(t: string): void {
    this.picked.update((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.selectedStar() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const parts = [this.picked().join(' · '), this.comment.trim()].filter(Boolean);
    const body = { stars: this.selectedStar(), comment: parts.length ? parts.join(' — ').slice(0, 1000) : null };
    this.http.post(`/api/courses/${this.courseId}/review`, body).subscribe({
      next: () => { this.isSubmitting.set(false); this.sent.set(true); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de l’envoi de la note.');
      },
    });
  }
}
