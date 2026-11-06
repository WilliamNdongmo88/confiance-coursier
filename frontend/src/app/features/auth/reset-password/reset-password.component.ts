import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../../core/services/theme.service';
import { LucideArrowLeft, LucideBike, LucideCheckCircle, LucideEye, LucideEyeOff, LucideLink2Off, LucideLockKeyhole, LucideMoon, LucideSun } from '@lucide/angular';

/**
 * Nouveau mot de passe (lien reçu par email, token valable 15 min côté serveur).
 * Un lien invalide ou expiré bascule sur un état dédié ; les autres erreurs restent sur le formulaire.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideCheckCircle, LucideEye, LucideEyeOff, LucideLink2Off, LucideLockKeyhole, LucideMoon, LucideSun],
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

        @if (!token || linkExpired) {
          <div class="auth-state">
            <span class="auth-badge auth-badge--warn" aria-hidden="true"><svg lucideLink2Off size="26"></svg></span>
            <h1 class="auth-title">Lien invalide ou expiré</h1>
            <p class="auth-subtitle">Les liens de réinitialisation sont valables 15 minutes et ne servent qu’une fois. Demandez-en un nouveau.</p>
            <a routerLink="/forgot-password" class="btn btn-primary btn-block btn-lg">Recevoir un nouveau lien</a>
          </div>
        } @else if (success) {
          <div class="auth-state">
            <span class="auth-badge auth-badge--ok" aria-hidden="true"><svg lucideCheckCircle size="26"></svg></span>
            <h1 class="auth-title">Mot de passe mis à jour</h1>
            <p class="auth-subtitle">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <a routerLink="/login" class="btn btn-primary btn-block btn-lg">Se connecter</a>
          </div>
        } @else {
          <span class="auth-badge" aria-hidden="true"><svg lucideLockKeyhole size="26"></svg></span>
          <h1 class="auth-title">Nouveau mot de passe</h1>
          <p class="auth-subtitle">Choisissez un mot de passe d’au moins 8 caractères.</p>

          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label" for="rp-password">Nouveau mot de passe</label>
              <div class="password-field">
                <input id="rp-password" [type]="showPassword ? 'text' : 'password'" class="form-input"
                  [(ngModel)]="password" name="password" required minlength="8" placeholder="8 caractères minimum"
                  autocomplete="new-password" [disabled]="loading" aria-describedby="rp-hint" autofocus>
                <button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-pressed]="showPassword"
                        [attr.aria-label]="showPassword ? 'Masquer les mots de passe' : 'Afficher les mots de passe'">
                  @if (showPassword) { <svg lucideEyeOff size="18"></svg> } @else { <svg lucideEye size="18"></svg> }
                </button>
              </div>
              <p id="rp-hint" class="auth-hint" [class.auth-hint--ok]="password.length >= 8">
                @if (password.length >= 8) { Longueur suffisante. } @else { Au moins 8 caractères ({{ password.length }}/8). }
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" for="rp-confirm">Confirmer le mot de passe</label>
              <input id="rp-confirm" [type]="showPassword ? 'text' : 'password'" class="form-input"
                [(ngModel)]="confirmPassword" name="confirmPassword" required placeholder="••••••••"
                autocomplete="new-password" [disabled]="loading"
                [class.input-error]="mismatch()" [attr.aria-invalid]="mismatch()">
              @if (mismatch()) { <p class="auth-error auth-error--field" role="alert">Les mots de passe ne correspondent pas.</p> }
            </div>

            @if (error) { <p class="auth-error" role="alert">{{ error }}</p> }

            <button type="submit" class="btn btn-primary btn-block btn-lg"
              [disabled]="loading || password.length < 8 || password !== confirmPassword">
              @if (loading) { Enregistrement… } @else { Enregistrer le mot de passe }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  success = false;
  linkExpired = false;
  error = '';

  readonly theme = inject(ThemeService);
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => { this.token = params['token'] || ''; });
  }

  mismatch(): boolean { return !!this.confirmPassword && this.confirmPassword !== this.password; }

  onSubmit(): void {
    if (this.loading || this.password.length < 8 || this.password !== this.confirmPassword) return;
    this.loading = true;
    this.error = '';
    this.http.post('/api/auth/reset-password', { token: this.token, newPassword: this.password }).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => {
        this.loading = false;
        const msg: string = err?.error?.message || '';
        // Token refusé par le serveur (« Lien de réinitialisation invalide ou expiré… ») → état dédié
        if (/lien|expir|token/i.test(msg)) { this.linkExpired = true; return; }
        this.error = msg || 'Enregistrement impossible pour le moment. Vérifiez votre connexion et réessayez.';
      },
    });
  }
}
