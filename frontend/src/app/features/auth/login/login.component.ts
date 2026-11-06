import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { homeForRole } from '../../../core/auth/session';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideShieldCheck } from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, SpinnerComponent,
            LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideShieldCheck],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">

        <!-- Ligne du haut : Retour | FR + Thème -->
        <div class="auth-topbar">
          <a class="back-link" routerLink="/" aria-label="Retour à l'accueil">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
            <button class="lang-toggle" type="button" aria-label="Changer de langue" (click)="toggleLang()">
              {{ lang().toUpperCase() }}
            </button>
            <button class="theme-toggle" type="button"
                    [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
                    (click)="theme.toggleTheme()">
              @if (theme.isDarkMode()) {
                <svg lucideSun size="18"></svg>
              } @else {
                <svg lucideMoon size="18"></svg>
              }
            </button>
          </div>
        </div>

        <!-- Logo centré sur sa propre ligne -->
        <div class="auth-logo">
          <svg lucideBike size="22"></svg>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <h1 class="auth-title">Se connecter</h1>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input id="login-email" type="email" [(ngModel)]="email" name="email" required
              class="form-input" placeholder="vous@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Mot de passe</label>
            <input id="login-password" type="password" [(ngModel)]="password" name="password" required
              class="form-input" placeholder="••••••••" autocomplete="current-password">
          </div>

          <!-- Champ OTP admin — affiché uniquement après requestAdminOtp() -->
          <div *ngIf="otpRequired()" class="form-group otp-group">
            <label class="form-label" for="login-otp">
              <svg lucideShieldCheck size="14" style="display:inline;vertical-align:middle;margin-right:5px;"></svg>
              Code de vérification administrateur
            </label>
            <input id="login-otp" type="text" [(ngModel)]="otp" name="otp"
              class="form-input otp-input"
              placeholder="000000"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code">
            <p class="form-hint" style="margin-top:6px;">
              Vérifiez votre boîte email — le code expire dans 5 minutes.
              <button type="button" class="forgot-link" (click)="resendAdminOtp()" [disabled]="isLoading">
                Renvoyer
              </button>
            </p>
          </div>

          <div class="options-row" *ngIf="!otpRequired()">
            <label class="form-checkbox">
              <input id="login-remember" type="checkbox" [(ngModel)]="remember" name="remember">
              Se souvenir de moi
            </label>
            <button type="button" class="forgot-link" (click)="forgotPassword()">Mot de passe oublié ?</button>
          </div>

          <button type="submit" [disabled]="isLoading" class="btn btn-primary btn-block btn-lg">
            @if (isLoading) {
              <app-spinner></app-spinner>
              Connexion en cours...
            } @else if (otpRequired()) {
              <svg lucideShieldCheck size="16"></svg>
              Vérifier et se connecter
            } @else {
              Se connecter
            }
          </button>
        </form>

        <div class="auth-footer">Pas encore de compte ? <a routerLink="/register">S'inscrire</a></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .otp-group {
      background: var(--bg-card, #f7f8f5);
      border: 1px solid #b8ddc8;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    [data-theme="dark"] .otp-group {
      background: #1a2e24;
      border-color: #2e5040;
    }
    .otp-input {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 8px;
      text-align: center;
    }
  `]
})
export class LoginComponent implements OnInit {
  email    = '';
  password = '';
  otp      = '';
  remember = true;
  isLoading = false;

  /** true = l'email est admin → le champ OTP est affiché */
  readonly otpRequired = signal<boolean>(false);

  readonly lang = signal<string>('fr');

  private authService = inject(AuthService);
  private router      = inject(Router);
  private toast       = inject(ToastService);
  readonly theme      = inject(ThemeService);
  private route       = inject(ActivatedRoute);

  ngOnInit(): void {
    this.initLang();
    // TICK-053 : déconnexion forcée suite à une suspension de compte.
    if (this.route.snapshot.queryParamMap.get('reason') === 'suspended') {
      this.toast.error('Votre compte est suspendu. Contactez le support pour plus d\'informations.');
    }
    if (this.authService.isLoggedIn()) {
      this.redirectByRole(this.authService.getCurrentUserRole());
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.isLoading = true;

    // ── Étape 1 : si OTP pas encore demandé, on le demande d'abord ──────────
    if (!this.otpRequired()) {
      this.authService.requestAdminOtp(this.email, this.password).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.otpRequired === true) {
            // Compte ADMIN : mot de passe vérifié, code envoyé → afficher le champ OTP
            this.otpRequired.set(true);
            this.toast.info('Vérifiez votre boîte email — un code vous a été envoyé.');
          } else {
            // Utilisateur normal → connexion directe
            this.doLogin();
          }
        },
        error: (err) => {
          this.isLoading = false;
          // TICK-066 : identifiants refusés (401), compte suspendu (403) ou trop de demandes (429)
          if (err?.status === 401 || err?.status === 403 || err?.status === 429) {
            this.toast.error(err.error?.message || 'Email ou mot de passe incorrect.');
            return;
          }
          // Erreur réseau : tentative de connexion standard
          this.doLogin();
        }
      });
      return;
    }

    // ── Étape 2 : OTP déjà demandé → connexion avec OTP ─────────────────────
    if (!this.otp || this.otp.length !== 6) {
      this.isLoading = false;
      this.toast.error('Veuillez saisir le code à 6 chiffres reçu par email.');
      return;
    }
    this.doLogin();
  }

  resendAdminOtp(): void {
    this.authService.requestAdminOtp(this.email, this.password).subscribe({
      next: () => this.toast.info('Un nouveau code a été envoyé à votre adresse email.'),
      error: (err) => this.toast.error(err?.error?.message || 'Impossible d\'envoyer le code. Réessayez.')
    });
  }

  forgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  toggleLang(): void {
    const next = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', next);
      try { localStorage.setItem('lang', next); } catch (e) { /* ignore */ }
    }
  }

  private doLogin(): void {
    this.isLoading = true;
    const payload: any = { email: this.email, password: this.password };
    if (this.otpRequired() && this.otp) payload.otp = this.otp;

    this.authService.login(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.toast.success(`Bienvenue ${response.email} !`);
        this.redirectByRole(response.role);
      },
      error: (err) => {
        this.isLoading = false;
        // TICK-074 : compte non vérifié → écran de saisie du code (avec « Renvoyer le code »)
        if (err.status === 403 && err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.toast.info(err.error.message);
          this.router.navigate(['/verify-otp'], { queryParams: { email: this.email } });
          return;
        }
        const message = err.error?.message || 'Email ou mot de passe incorrect.';
        this.toast.error(message);
      }
    });
  }

  private initLang(): void {
    let saved = 'fr';
    try { saved = localStorage.getItem('lang') || 'fr'; } catch (e) { /* ignore */ }
    this.lang.set(saved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', saved);
    }
  }

  /**
   * Après connexion : page demandée avant la redirection vers /login (returnUrl) si elle est interne
   * et compatible avec le rôle, sinon l'accueil du rôle (TICK-072).
   */
  private redirectByRole(role: string): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && this.isSafeReturnUrl(returnUrl, role)) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.router.navigate([homeForRole(role)]);
  }

  /** Chemin interne uniquement (pas de « //hote »), et pas l'espace d'un autre rôle. */
  private isSafeReturnUrl(url: string, role: string): boolean {
    if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\') || url.includes(':')) return false;
    const spaces: Record<string, string> = { CLIENT: '/client/', COURIER: '/courier/', ADMIN: '/admin/' };
    return Object.entries(spaces).every(([r, prefix]) => r === role || !url.startsWith(prefix));
  }
}
