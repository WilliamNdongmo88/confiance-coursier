import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideEye, LucideEyeOff, LucideMoon, LucideShieldCheck, LucideSun, LucideUser } from '@lucide/angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideEye, LucideEyeOff, LucideMoon, LucideShieldCheck, LucideSun, LucideUser],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card auth-card--wide">

        <div class="auth-topbar">
          <a class="back-link" routerLink="/" aria-label="Retour à l’accueil">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
            <button class="theme-toggle" type="button"
              [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
              (click)="theme.toggleTheme()">
              @if (theme.isDarkMode()) { <svg lucideSun size="18"></svg> } @else { <svg lucideMoon size="18"></svg> }
            </button>
          </div>
        </div>

        <div class="auth-logo">
          <span class="auth-mark"><svg lucideBike size="18"></svg></span>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <h1 class="auth-title">Créer un compte</h1>
        <p class="auth-subtitle">Un seul compte pour confier ou réaliser des courses en toute confiance.</p>

        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <fieldset class="role-field">
            <legend class="form-label">Vous êtes</legend>
            <div class="role-selector" role="radiogroup" aria-label="Type de compte">
              <button type="button" class="role-card" role="radio" [attr.aria-checked]="role === 'CLIENT'"
                      [class.selected]="role === 'CLIENT'" (click)="role = 'CLIENT'">
                <span class="role-icon"><svg lucideUser size="22"></svg></span>
                <span class="role-name">Client</span>
                <span class="role-desc">Je confie une course</span>
              </button>
              <button type="button" class="role-card" role="radio" [attr.aria-checked]="role === 'COURIER'"
                      [class.selected]="role === 'COURIER'" (click)="role = 'COURIER'">
                <span class="role-icon"><svg lucideBike size="22"></svg></span>
                <span class="role-name">Coursier</span>
                <span class="role-desc">Je réalise des courses</span>
              </button>
            </div>
            @if (role === 'COURIER') {
              <p class="role-note">
                <svg lucideShieldCheck size="16"></svg>
                <span>Après l’inscription, vous ferez vérifier votre identité. Vous pourrez ensuite proposer vos services.</span>
              </p>
            }
          </fieldset>

          <div class="form-group">
            <label class="form-label" for="reg-fullname">Nom complet</label>
            <input id="reg-fullname" type="text" class="form-input" [(ngModel)]="fullName" name="fullName" required
              placeholder="Jean Dupont" autocomplete="name">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input id="reg-email" type="email" class="form-input" [(ngModel)]="email" name="email" required
              placeholder="vous@email.com" autocomplete="email" aria-describedby="reg-email-hint">
            <p id="reg-email-hint" class="form-hint">Votre code de confirmation sera envoyé à cette adresse.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-phone">Téléphone <span class="optional">(facultatif)</span></label>
            <input id="reg-phone" type="tel" class="form-input" [(ngModel)]="phone" name="phone"
              placeholder="+237 6XX XXX XXX" autocomplete="tel" inputmode="tel">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Mot de passe</label>
            <div class="password-field">
              <input id="reg-password" [type]="showPassword() ? 'text' : 'password'" class="form-input"
                [(ngModel)]="password" name="password" required minlength="8"
                placeholder="8 caractères minimum" autocomplete="new-password" aria-describedby="reg-password-hint">
              <button type="button" class="password-toggle" (click)="showPassword.set(!showPassword())"
                      [attr.aria-pressed]="showPassword()"
                      [attr.aria-label]="showPassword() ? 'Masquer les mots de passe' : 'Afficher les mots de passe'">
                @if (showPassword()) { <svg lucideEyeOff size="18"></svg> } @else { <svg lucideEye size="18"></svg> }
              </button>
            </div>
            <p id="reg-password-hint" class="form-hint" [class.hint-ok]="password.length >= 8">
              @if (password.length >= 8) { Longueur suffisante. } @else { Au moins 8 caractères ({{ password.length }}/8). }
            </p>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password-confirm">Confirmer le mot de passe</label>
            <input id="reg-password-confirm" [type]="showPassword() ? 'text' : 'password'" class="form-input"
              [(ngModel)]="confirmPassword" name="confirmPassword" required
              placeholder="••••••••" autocomplete="new-password"
              [class.input-error]="mismatch()" [attr.aria-invalid]="mismatch()">
            @if (mismatch()) {
              <p class="form-error" role="alert">Les mots de passe ne correspondent pas.</p>
            }
          </div>

          <label class="form-checkbox cgu-check">
            <input type="checkbox" [(ngModel)]="acceptCgu" name="acceptCgu" required>
            <span>J’accepte les <a class="cgu-link" routerLink="/conditions-utilisation" target="_blank">conditions d’utilisation</a> et la <a class="cgu-link" routerLink="/confidentialite" target="_blank">politique de confidentialité</a>.</span>
          </label>

          <button type="submit" class="btn btn-primary btn-block btn-lg"
            [disabled]="isLoading || !acceptCgu || mismatch()">
            @if (isLoading) { Création en cours… } @else { Créer mon compte }
          </button>
        </form>

        <div class="auth-footer">Déjà un compte ? <a routerLink="/login">Se connecter</a></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; --reg-muted: #56635c; }
    :host-context([data-theme="dark"]) { --reg-muted: var(--cc-muted); }
    .auth-card--wide { max-width: 500px; }
    .role-field { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; }
    .role-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .role-card {
      display: grid; justify-items: center; gap: 4px; padding: 16px 10px 14px;
      border: 1.5px solid var(--cc-line); border-radius: 13px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; text-align: center; cursor: pointer;
      transition: border-color .18s, background .18s, transform .12s, box-shadow .18s;
    }
    .role-card:hover { border-color: color-mix(in oklab, var(--primary) 55%, var(--cc-line)); }
    .role-card:active { transform: scale(.98); }
    .role-card.selected {
      border-color: var(--primary); background: color-mix(in oklab, var(--primary) 9%, var(--cc-white));
      box-shadow: 0 6px 18px color-mix(in oklab, var(--primary) 16%, transparent);
    }
    .role-icon {
      width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 4px;
      background: var(--cc-paper-2); color: var(--cc-muted);
      transition: background .18s, color .18s, transform .25s cubic-bezier(.16,1,.3,1);
    }
    .selected .role-icon { background: var(--primary); color: #fff; transform: scale(1.06); }
    .role-name { font-weight: 750; font-size: .95rem; }
    .role-desc { font-size: .8rem; color: var(--reg-muted); }
    .role-note {
      display: flex; gap: 9px; align-items: flex-start; margin: 12px 0 0; padding: 11px 13px;
      border-radius: 10px; background: var(--cc-paper-2); color: var(--cc-ink); font-size: .84rem; line-height: 1.45;
      animation: reg-in .3s cubic-bezier(.16,1,.3,1);
    }
    .role-note svg { flex: none; margin-top: 1px; color: var(--primary); }
    .optional { font-weight: 500; color: var(--reg-muted); }
    .form-hint { margin: 6px 0 0; font-size: .8rem; color: var(--reg-muted); }
    .hint-ok { color: var(--cc-success); }
    .input-error { border-color: var(--cc-danger) !important; }
    .form-error { color: var(--cc-danger); font-size: .8rem; margin: 6px 0 0; animation: reg-in .2s ease-out; }
    /* Consentement : un panneau doux, une vraie case dessinée, une validation qui se voit */
    .cgu-check {
      display: flex; align-items: flex-start; gap: 12px; margin: 6px 0 18px; padding: 13px 14px;
      border: 1px solid var(--cc-line); border-radius: 12px; background: var(--cc-paper-2);
      color: var(--cc-ink); font-size: .87rem; line-height: 1.5; cursor: pointer;
      transition: border-color .18s, background .18s;
    }
    .cgu-check:hover { border-color: color-mix(in oklab, var(--primary) 45%, var(--cc-line)); }
    .cgu-check:has(input:checked) {
      border-color: color-mix(in oklab, var(--primary) 60%, transparent);
      background: color-mix(in oklab, var(--primary) 8%, var(--cc-white));
    }
    .cgu-link { color: var(--primary); font-weight: 700; text-underline-offset: 3px; }
    :host-context([data-theme="dark"]) .cgu-link { color: var(--cc-success); }
    /* Sombre : les règles globales (!important) des champs et aides écrasent les états — on les rétablit */
    :host-context([data-theme="dark"]) .form-error { color: var(--cc-danger) !important; }
    :host-context([data-theme="dark"]) .hint-ok { color: var(--cc-success) !important; }
    :host-context([data-theme="dark"]) .form-input.input-error { border-color: var(--cc-danger) !important; }
    :host-context([data-theme="dark"]) .cgu-check { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .role-icon { background: rgba(255,255,255,.06); }
    :host-context([data-theme="dark"]) .selected .role-icon { background: var(--cc-lime); color: #123b32; }
    @keyframes reg-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .role-note, .form-error { animation: none; } .role-card:active { transform: none; } }
  `]
})
export class RegisterComponent {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role = 'CLIENT';
  acceptCgu = false;
  isLoading = false;
  /** Mots de passe affichés en clair (bouton œil, s'applique aux deux champs). */
  readonly showPassword = signal(false);

  mismatch(): boolean { return !!this.confirmPassword && this.confirmPassword !== this.password; }

  readonly theme = inject(ThemeService);

  private authService = inject(AuthService);
  private router      = inject(Router);
  private toast       = inject(ToastService);
  private route       = inject(ActivatedRoute);

  constructor() {
    // TICK-072 : rôle présélectionné depuis la landing (/register?role=CLIENT|COURIER)
    const r = this.route.snapshot.queryParamMap.get('role')?.toUpperCase();
    if (r === 'CLIENT' || r === 'COURIER') this.role = r;
  }


  onSubmit(): void {
    if (this.password !== this.confirmPassword) {
      this.toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!this.acceptCgu) {
      this.toast.error('Vous devez accepter les CGU pour continuer.');
      return;
    }

    this.isLoading = true;

    this.authService.register({
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      password: this.password,
      role: this.role,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Compte créé ! Saisissez le code reçu par email.');
        this.router.navigate(['/verify-otp'], {
          queryParams: { email: this.email, phone: this.phone }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Une erreur est survenue lors de l\'inscription.');
      },
    });
  }
}
