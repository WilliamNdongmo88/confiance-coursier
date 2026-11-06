import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideMailCheck } from '@lucide/angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideMailCheck],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">

        <!-- Topbar -->
        <div class="auth-topbar">
          <a class="back-link" routerLink="/login" aria-label="Retour à la connexion">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
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

        <!-- État : formulaire -->
        @if (!sent) {
          <h1 class="auth-title">Mot de passe oublié ?</h1>
          <p class="text-muted st-ta-center-mb-24px-fs-93rem">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>

          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label" for="fp-email">Adresse email</label>
              <input id="fp-email" type="email" class="form-input"
                [(ngModel)]="email" name="email" required
                placeholder="vous@email.com" autocomplete="email"
                [disabled]="loading">
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg"
              [disabled]="loading || !email.trim()">
              @if (loading) { Envoi en cours… }
              @else { Envoyer le lien }
            </button>
          </form>

          <div class="auth-footer">
            Vous vous souvenez ? <a routerLink="/login">Se connecter</a>
          </div>

        <!-- État : email envoyé -->
        } @else {
          <div class="st-ta-center-p-8px-0-16px">
            <div class="st-w-64px-heig-64px-bg-primary-ligh">
              <svg class="st-c-primary" lucideMailCheck size="28"></svg>
            </div>
            <h1 class="auth-title st-mb-12px">Email envoyé !</h1>
            <p class="text-muted st-fs-93rem-lh-1-6-mb-8px">
              Un lien de réinitialisation a été envoyé à<br>
              <strong class="st-c-text">{{ email }}</strong>
            </p>
            <p class="text-muted st-fs-85rem-mb-28px">
              Vérifiez vos spams si vous ne le trouvez pas. Le lien expire dans <strong>15 minutes</strong>.
            </p>
            <button class="btn btn-primary btn-block" (click)="resend()" [disabled]="resendCooldown > 0">
              @if (resendCooldown > 0) { Renvoyer dans {{ resendCooldown }}s }
              @else { Renvoyer l'email }
            </button>
          </div>

          <div class="auth-footer">
            <a routerLink="/login">Retour à la connexion</a>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`:host { display: block; }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-ta-center-mb-24px-fs-93rem { text-align: center; margin-bottom: 24px; font-size: .93rem; }
    .st-ta-center-p-8px-0-16px { text-align: center; padding: 8px 0 16px; }
    .st-w-64px-heig-64px-bg-primary-ligh { width: 64px; height: 64px; background: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .st-c-primary { color: var(--primary); }
    .st-mb-12px { margin-bottom: 12px; }
    .st-fs-93rem-lh-1-6-mb-8px { font-size: .93rem; line-height: 1.6; margin-bottom: 8px; }
    .st-c-text { color: var(--text); }
    .st-fs-85rem-mb-28px { font-size: .85rem; margin-bottom: 28px; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;
  resendCooldown = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly theme = inject(ThemeService);
  private http   = inject(HttpClient);
  private toast  = inject(ToastService);

  onSubmit(): void {
    if (!this.email.trim()) return;
    this.loading = true;

    this.http.post('/api/auth/forgot-password', { email: this.email }).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
        this.startCooldown();
      },
      error: () => {
        this.loading = false;
        // On affiche quand même l'écran "email envoyé" pour ne pas révéler
        // si l'email existe ou non (sécurité anti-énumération)
        this.sent = true;
        this.startCooldown();
      },
    });
  }

  resend(): void {
    if (this.resendCooldown > 0) return;
    this.http.post('/api/auth/forgot-password', { email: this.email }).subscribe({
      next: () => { this.toast.success('Email renvoyé !'); this.startCooldown(); },
      error: () => { this.toast.success('Email renvoyé !'); this.startCooldown(); },
    });
  }


  private startCooldown(): void {
    this.resendCooldown = 60;
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }
}
