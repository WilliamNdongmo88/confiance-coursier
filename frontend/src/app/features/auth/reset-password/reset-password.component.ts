import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideEye, LucideEyeOff, LucideCheckCircle } from '@lucide/angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideEye, LucideEyeOff, LucideCheckCircle],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">

        <!-- Topbar -->
        <div class="auth-topbar">
          <a class="back-link" routerLink="/login" aria-label="Retour à la connexion">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
            <button class="lang-toggle" type="button" aria-label="Changer de langue" (click)="toggleLang()">
              {{ lang().toUpperCase() }}
            </button>
            <button class="theme-toggle" type="button"
              [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
              (click)="theme.toggleTheme()">
              @if (theme.isDarkMode()) { <svg lucideSun size="18"></svg> }
              @else { <svg lucideMoon size="18"></svg> }
            </button>
          </div>
        </div>

        <!-- Logo -->
        <div class="auth-logo">
          <svg lucideBike size="22"></svg>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <!-- Token manquant -->
        @if (!token) {
          <div class="st-ta-center-p-16px-0">
            <h1 class="auth-title">Lien invalide</h1>
            <p class="text-muted st-mb-24px">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
            <a routerLink="/forgot-password" class="btn btn-primary btn-block">
              Faire une nouvelle demande
            </a>
          </div>

        <!-- Succès -->
        } @else if (success) {
          <div class="st-ta-center-p-8px-0-16px">
            <div class="st-w-64px-heig-64px-bg-primary-ligh">
              <svg class="st-c-primary" lucideCheckCircle size="28"></svg>
            </div>
            <h1 class="auth-title st-mb-12px">Mot de passe mis à jour !</h1>
            <p class="text-muted st-mb-28px">
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <a routerLink="/login" class="btn btn-primary btn-block btn-lg">
              Se connecter
            </a>
          </div>

        <!-- Formulaire -->
        } @else {
          <h1 class="auth-title">Nouveau mot de passe</h1>
          <p class="text-muted st-ta-center-mb-24px-fs-93rem">
            Choisissez un mot de passe sécurisé d'au moins 8 caractères.
          </p>

          <form (ngSubmit)="onSubmit()">
            <!-- Nouveau mot de passe -->
            <div class="form-group st-posi-relative">
              <label class="form-label" for="rp-password">Nouveau mot de passe</label>
              <input [id]="'rp-password'"
                [type]="showPassword ? 'text' : 'password'"
                class="form-input st-padd-44px"
                [(ngModel)]="password" name="password" required minlength="8"
                placeholder="Min 8 caractères" autocomplete="new-password"
                [disabled]="loading">
              <button class="st-posi-absolute-righ-12px-bott-11px" type="button"

                (click)="showPassword = !showPassword"
                [attr.aria-label]="showPassword ? 'Masquer' : 'Afficher'">
                @if (showPassword) { <svg lucideEyeOff size="18"></svg> }
                @else { <svg lucideEye size="18"></svg> }
              </button>
            </div>

            <!-- Confirmer -->
            <div class="form-group st-posi-relative">
              <label class="form-label" for="rp-confirm">Confirmer le mot de passe</label>
              <input id="rp-confirm"
                [type]="showConfirm ? 'text' : 'password'"
                class="form-input st-padd-44px"
                [(ngModel)]="confirmPassword" name="confirmPassword" required
                placeholder="••••••••" autocomplete="new-password"
                [disabled]="loading"
                [class.input-error]="confirmPassword && confirmPassword !== password">
              <button class="st-posi-absolute-righ-12px-bott-11px" type="button"

                (click)="showConfirm = !showConfirm"
                [attr.aria-label]="showConfirm ? 'Masquer' : 'Afficher'">
                @if (showConfirm) { <svg lucideEyeOff size="18"></svg> }
                @else { <svg lucideEye size="18"></svg> }
              </button>
            </div>
            @if (confirmPassword && confirmPassword !== password) {
              <p class="st-c-danger-fs-8rem-m-12px-0-16px">
                Les mots de passe ne correspondent pas.
              </p>
            }

            <button type="submit" class="btn btn-primary btn-block btn-lg"
              [disabled]="loading || !password || password !== confirmPassword || password.length < 8">
              @if (loading) { Mise à jour… }
              @else { Enregistrer le nouveau mot de passe }
            </button>
          </form>
        }

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .input-error { border-color: var(--cc-danger) !important; }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-ta-center-p-16px-0 { text-align: center; padding: 16px 0; }
    .st-mb-24px { margin-bottom: 24px; }
    .st-ta-center-p-8px-0-16px { text-align: center; padding: 8px 0 16px; }
    .st-w-64px-heig-64px-bg-primary-ligh { width: 64px; height: 64px; background: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .st-c-primary { color: var(--primary); }
    .st-mb-12px { margin-bottom: 12px; }
    .st-mb-28px { margin-bottom: 28px; }
    .st-ta-center-mb-24px-fs-93rem { text-align: center; margin-bottom: 24px; font-size: .93rem; }
    .st-posi-relative { position: relative; }
    .st-padd-44px { padding-right: 44px; }
    .st-posi-absolute-righ-12px-bott-11px { position: absolute; right: 12px; bottom: 11px; background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0; display: flex; }
    .st-c-danger-fs-8rem-m-12px-0-16px { color: var(--cc-danger); font-size: .8rem; margin: -12px 0 16px; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  loading = false;
  success = false;

  readonly theme = inject(ThemeService);
  readonly lang  = signal<string>(localStorage.getItem('lang') || 'fr');
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private toast  = inject(ToastService);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
    });
  }

  onSubmit(): void {
    if (!this.password || this.password !== this.confirmPassword) return;
    this.loading = true;

    this.http.post('/api/auth/reset-password', {
      token: this.token,
      newPassword: this.password,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Lien invalide ou expiré. Veuillez refaire une demande.');
        // Si le token est expiré, redirige vers forgot-password après 3s
        setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
      },
    });
  }

  toggleLang(): void {
    const next = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    localStorage.setItem('lang', next);
    document.documentElement.lang = next;
  }
}
