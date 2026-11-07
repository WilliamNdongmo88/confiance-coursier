import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { homeForRole } from '../../../core/auth/session';
import { LucideEyeOff, LucideFlag, LucideScale, LucideShieldCheck, LucideUserRound } from '@lucide/angular';

interface Motif { value: string; title: string; hint: string; }

/** Valeurs attendues par le serveur (SubmitReportRequest). */
const MOTIFS: Motif[] = [
  { value: 'harcelement', title: 'Harcèlement ou menaces', hint: 'Messages insistants, intimidation, menaces.' },
  { value: 'injures', title: 'Propos injurieux', hint: 'Insultes ou propos irrespectueux.' },
  { value: 'fraude', title: 'Tentative de fraude', hint: 'Paiement hors plateforme, arnaque, faux reçu.' },
  { value: 'faux', title: 'Faux profil', hint: 'Usurpation d’identité ou compte trompeur.' },
  { value: 'autre', title: 'Autre comportement', hint: 'Un autre problème avec cette personne.' },
];

const MIN = 20;
const MAX = 2000;

/**
 * Signalement d'un utilisateur (comportement), base maquette-v2/client/report-user.html, Impeccable.
 * Distinct du litige (argent d'une course) : on le dit d'emblée. Confidentiel, examiné par un administrateur.
 */
@Component({
  selector: 'app-report-user',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideEyeOff, LucideFlag, LucideScale, LucideShieldCheck, LucideUserRound],
  styles: [`
    :host { display: block; --rm: #56635c; }
    :host-context([data-theme="dark"]) { --rm: #B0C0B7; }
    .r { max-width: 760px; margin: 0 auto; }
    .r-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .r-head p { margin: 0 0 18px; font-size: 15px; line-height: 1.5; color: var(--rm); max-width: 62ch; }
    .who { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 14px; border-radius: 14px; background: var(--cc-white); border: 1px solid var(--cc-line); }
    .av { flex: none; width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); font-weight: 800; }
    .who b { display: block; font-size: 15.5px; color: var(--cc-ink); }
    .who span { font-size: 13px; color: var(--rm); }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 14px; padding: 0; list-style: none; }
    .facts li { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 12px; background: var(--cc-paper-2); font-size: 13px; line-height: 1.45; color: var(--cc-ink); }
    .facts svg { flex: none; margin-top: 1px; color: var(--primary); }
    .money { margin: 0 0 18px; font-size: 13.5px; line-height: 1.5; color: var(--rm); }
    .money a { color: var(--primary); font-weight: 700; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 22px; margin-bottom: 16px; animation: r-in .45s cubic-bezier(.16,1,.3,1) both; }
    .box h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .num { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; }
    .motifs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mo { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; text-align: left; border: 1.5px solid var(--cc-line); border-radius: 13px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; cursor: pointer; transition: border-color .18s, background .18s, box-shadow .18s; }
    .mo:hover { border-color: color-mix(in oklab, var(--cc-danger) 40%, var(--cc-line)); }
    .mo.on { border-color: var(--cc-danger); background: color-mix(in oklab, var(--cc-danger) 6%, var(--cc-white)); box-shadow: 0 6px 16px color-mix(in oklab, var(--cc-danger) 12%, transparent); }
    .radio { flex: none; margin-top: 2px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid color-mix(in oklab, var(--cc-ink) 30%, transparent); display: grid; place-items: center; }
    .mo.on .radio { border-color: var(--cc-danger); }
    .mo.on .radio::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--cc-danger); animation: r-pop .25s cubic-bezier(.16,1,.3,1); }
    .mo b { display: block; font-size: 14.5px; }
    .mo small { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.4; color: var(--rm); }
    textarea.form-input { min-height: 140px; resize: vertical; line-height: 1.55; }
    .tip { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: var(--rm); }
    .count { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: 12.5px; color: var(--rm); }
    .count .ok { color: var(--cc-success); font-weight: 650; }
    .submit { display: grid; gap: 10px; }
    .confirm-line { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); cursor: pointer; }
    .confirm-line input { flex: none; width: 20px; height: 20px; margin: 1px 0 0; accent-color: var(--cc-danger); }
    .go { width: 100%; min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; border: 0;
      background: var(--cc-danger); color: #fff; font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; transition: background .15s, opacity .15s; }
    .go:hover { background: #9c3a35; }
    .go.inactive { opacity: .45; }
    .cancel { justify-self: center; min-height: 44px; display: inline-flex; align-items: center; border: 0; background: none; color: var(--rm); font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; }
    .state { text-align: center; padding: 30px 22px; border-radius: 16px; border: 1px solid var(--cc-line); background: var(--cc-white); animation: r-in .45s cubic-bezier(.16,1,.3,1) both; }
    .state h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--cc-ink); }
    .state p { margin: 0 auto 16px; max-width: 46ch; color: var(--rm); line-height: 1.55; }
    .state .ic { width: 62px; height: 62px; margin: 0 auto 14px; border-radius: 18px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); animation: r-pop .5s cubic-bezier(.16,1,.3,1); }
    .state .acts { display: grid; gap: 10px; max-width: 320px; margin: 0 auto; }
    .state .acts > * { min-height: 46px; justify-content: center; }
    @keyframes r-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes r-pop { 0% { transform: scale(.6); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
    :host-context([data-theme="dark"]) .r-head h1, :host-context([data-theme="dark"]) .box h2, :host-context([data-theme="dark"]) .mo b,
    :host-context([data-theme="dark"]) .who b, :host-context([data-theme="dark"]) .state h2, :host-context([data-theme="dark"]) .facts li,
    :host-context([data-theme="dark"]) .confirm-line { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .facts li, :host-context([data-theme="dark"]) .av, :host-context([data-theme="dark"]) .state .ic { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .facts svg, :host-context([data-theme="dark"]) .av, :host-context([data-theme="dark"]) .state .ic,
    :host-context([data-theme="dark"]) .money a { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .num { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .mo.on, :host-context([data-theme="dark"]) .mo.on .radio { border-color: #E2776F; }
    :host-context([data-theme="dark"]) .mo.on .radio::after { background: #E2776F; }
    @media (max-width: 640px) { .facts, .motifs { grid-template-columns: 1fr; } .box { padding: 18px 16px; } }
    @media (prefers-reduced-motion: reduce) { .box, .state, .state .ic, .mo.on .radio::after { animation: none; } }
  `],
  template: `
    <div class="r">
      <section class="r-head">
        <h1>Signaler {{ name() ? name() : 'un utilisateur' }}</h1>
        <p>Pour un comportement inacceptable : harcèlement, insultes, tentative de fraude, faux profil.</p>
      </section>

      @if (sent()) {
        <div class="state" role="status">
          <span class="ic"><svg lucideShieldCheck size="28"></svg></span>
          <h2>Signalement envoyé</h2>
          <p>Merci. Un administrateur va l’examiner en toute confidentialité{{ name() ? ' : ' + name() + ' ne saura pas qui l’a signalé' : '' }}. Il peut avertir ou suspendre le compte.</p>
          <div class="acts">
            @if (room()) { <a class="primary-action" [routerLink]="['/chat', room()]">Retour à la discussion</a> }
            <a class="btn btn-secondary" [routerLink]="home()">Tableau de bord</a>
          </div>
        </div>
      } @else {
        @if (name()) {
          <div class="who">
            <span class="av" aria-hidden="true">{{ initials() }}</span>
            <div><b>{{ name() }}</b><span>Personne signalée</span></div>
          </div>
        }

        <ul class="facts" aria-label="Bon à savoir">
          <li><svg lucideEyeOff size="16"></svg><span>Votre signalement est <strong>confidentiel</strong>.</span></li>
          <li><svg lucideShieldCheck size="16"></svg><span>Un administrateur l’examine et peut <strong>avertir ou suspendre</strong> le compte.</span></li>
        </ul>
        <p class="money">Un problème d’argent ou de course non conforme ? Ouvrez plutôt un <strong>litige</strong> depuis la course concernée.</p>

        <form (submit)="onSubmit($event)" novalidate>
          <section class="box" aria-labelledby="r-motif">
            <h2 id="r-motif"><span class="num">1</span> Que se passe-t-il ?</h2>
            <div class="motifs" role="radiogroup" aria-labelledby="r-motif">
              @for (m of motifs; track m.value) {
                <button type="button" class="mo" role="radio" [attr.aria-checked]="motif() === m.value" [class.on]="motif() === m.value" (click)="motif.set(m.value)">
                  <span class="radio" aria-hidden="true"></span>
                  <span><b>{{ m.title }}</b><small>{{ m.hint }}</small></span>
                </button>
              }
            </div>
          </section>

          <section class="box" aria-labelledby="r-desc">
            <h2 id="r-desc"><span class="num">2</span> Décrivez les faits</h2>
            <p class="tip">Quand, comment (chat, appel, sur place) et ce qui a été dit ou fait. Restez factuel : l’administrateur peut consulter la discussion.</p>
            <label class="form-label" for="r-text">Description</label>
            <textarea id="r-text" class="form-input" name="description" [ngModel]="description()" (ngModelChange)="description.set($event)"
                      [attr.maxlength]="MAX" placeholder="Ex : après mon refus, il m’a envoyé plusieurs messages insultants dans le chat."></textarea>
            <div class="count">
              @if (descLen() < MIN) { <span>Encore {{ MIN - descLen() }} caractères au minimum</span> } @else { <span class="ok">Description suffisante</span> }
              <span>{{ descLen() }}/{{ MAX }}</span>
            </div>
          </section>

          <section class="box submit" aria-label="Confirmation">
            <label class="confirm-line">
              <input type="checkbox" name="honest" [ngModel]="honest()" (ngModelChange)="honest.set($event)">
              <span>Je certifie que ces faits sont réels. Un signalement abusif peut entraîner la suspension de mon propre compte.</span>
            </label>
            <button type="submit" class="go" [class.inactive]="!isFormValid()" [attr.aria-disabled]="!isFormValid()" [disabled]="isSubmitting()">
              <svg lucideFlag size="17"></svg> {{ isSubmitting() ? 'Envoi…' : 'Envoyer le signalement' }}
            </button>
            <button type="button" class="cancel" (click)="goBack()">Annuler</button>
          </section>
        </form>
      }
    </div>
  `,
})
export class ReportUserComponent implements OnInit {
  readonly MIN = MIN;
  readonly MAX = MAX;
  readonly motifs = MOTIFS;
  targetId!: number;

  readonly name = signal('');
  readonly room = signal<number | null>(null);
  readonly motif = signal('');
  readonly description = signal('');
  readonly honest = signal(false);
  readonly isSubmitting = signal(false);
  readonly sent = signal(false);
  readonly descLen = computed(() => this.description().trim().length);
  readonly initials = computed(() => this.name().trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  ngOnInit(): void {
    this.targetId = Number(this.route.snapshot.paramMap.get('userId'));
    const q = this.route.snapshot.queryParamMap;
    this.name.set((q.get('name') ?? '').trim().slice(0, 80));
    const room = Number(q.get('room'));
    this.room.set(room > 0 ? room : null);
    if (!this.targetId) {
      this.toast.error('Utilisateur introuvable.');
      this.router.navigate([this.home()]);
    }
  }

  home(): string { return homeForRole(this.auth.getCurrentUserRole()); }

  isFormValid(): boolean { return !!this.motif() && this.descLen() >= MIN && this.honest(); }

  goBack(): void {
    if (this.room()) this.router.navigate(['/chat', this.room()]);
    else window.history.length > 1 ? window.history.back() : this.router.navigate([this.home()]);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting()) return;
    if (!this.motif()) { this.toast.error('Choisissez ce qui se passe.'); return; }
    if (this.descLen() < MIN) { this.toast.error(`Décrivez les faits (au moins ${MIN} caractères).`); document.getElementById('r-text')?.focus(); return; }
    if (!this.honest()) { this.toast.error('Cochez la case pour certifier que les faits sont réels.'); return; }
    this.isSubmitting.set(true);
    this.http.post('/api/reports', { targetId: String(this.targetId), motif: this.motif(), description: this.description().trim() }).subscribe({
      next: () => { this.isSubmitting.set(false); this.sent.set(true); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err?.error?.message ?? 'Le signalement n’a pas pu être envoyé. Réessayez.');
      },
    });
  }
}
