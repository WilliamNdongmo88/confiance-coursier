import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideKeyRound, LucideMailCheck, LucideMoon, LucideSun } from '@lucide/angular';

/**
 * Mot de passe oublié. Le serveur répond toujours 200 (« si un compte existe… ») pour ne pas révéler
 * quels emails sont inscrits : l'écran reprend cette formulation. Une vraie erreur (réseau, 429…)
 * est affichée comme telle, sans faire croire que l'email est parti.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideKeyRound, LucideMailCheck, LucideMoon, LucideSun],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-topbar">
          <a class="back-link" routerLink="/login" aria-label="Retour à la connexion">
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

        @if (!sent) {
          <span class="auth-badge" aria-hidden="true"><svg lucideKeyRound size="26"></svg></span>
          <h1 class="auth-title">Mot de passe oublié ?</h1>
          <p class="auth-subtitle">Indiquez l’email de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>

          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label" for="fp-email">Email</label>
              <input id="fp-email" type="email" class="form-input" [(ngModel)]="email" name="email" required
                placeholder="vous@email.com" autocomplete="email" [disabled]="loading" autofocus>
            </div>
            @if (error) { <p class="auth-error" role="alert">{{ error }}</p> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading || !email.trim()">
              @if (loading) { Envoi en cours… } @else { Recevoir le lien }
            </button>
          </form>

          <div class="auth-footer">Vous vous en souvenez ? <a routerLink="/login">Se connecter</a></div>
        } @else {
          <div class="auth-state">
            <span class="auth-badge auth-badge--ok" aria-hidden="true"><svg lucideMailCheck size="26"></svg></span>
            <h1 class="auth-title">Vérifiez votre boîte mail</h1>
            <p class="auth-subtitle">
              Si un compte existe pour <strong class="auth-strong">{{ email }}</strong>, vous allez recevoir un lien
              pour choisir un nouveau mot de passe.
            </p>
            <ul class="auth-facts">
              <li>Le lien est valable <strong>15 minutes</strong>.</li>
              <li>Pensez à regarder dans vos courriers indésirables.</li>
            </ul>
            @if (error) { <p class="auth-error" role="alert">{{ error }}</p> }
            <button type="button" class="btn btn-secondary btn-block" (click)="resend()" [disabled]="resendCooldown > 0 || loading">
              @if (resendCooldown > 0) { Renvoyer le lien dans {{ resendCooldown }} s } @else { Renvoyer le lien }
            </button>
            <button type="button" class="auth-link-btn" (click)="changeEmail()">Utiliser une autre adresse</button>
          </div>
          <div class="auth-footer"><a routerLink="/login">Retour à la connexion</a></div>
        }
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class ForgotPasswordComponent implements OnDestroy {
  email = '';
  loading = false;
  sent = false;
  error = '';
  resendCooldown = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly theme = inject(ThemeService);
  private http   = inject(HttpClient);
  private toast  = inject(ToastService);

  onSubmit(): void {
    if (!this.email.trim() || this.loading) return;
    this.send(() => { this.sent = true; });
  }

  resend(): void {
    if (this.resendCooldown > 0 || this.loading) return;
    this.send(() => this.toast.success('Si un compte existe, un nouveau lien a été envoyé.'));
  }

  changeEmail(): void {
    this.sent = false;
    this.error = '';
    this.stopCooldown();
  }

  ngOnDestroy(): void { this.stopCooldown(); }

  private send(onOk: () => void): void {
    this.loading = true;
    this.error = '';
    this.http.post('/api/auth/forgot-password', { email: this.email.trim() }).subscribe({
      next: () => { this.loading = false; onOk(); this.startCooldown(); },
      error: (err) => {
        this.loading = false;
        this.error = err?.status === 429
          ? (err.error?.message || 'Trop de demandes. Patientez quelques minutes avant de réessayer.')
          : 'Envoi impossible pour le moment. Vérifiez votre connexion et réessayez.';
      },
    });
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.resendCooldown = 60;
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) this.stopCooldown();
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownInterval) { clearInterval(this.cooldownInterval); this.cooldownInterval = null; }
    if (this.resendCooldown < 0) this.resendCooldown = 0;
  }
}
