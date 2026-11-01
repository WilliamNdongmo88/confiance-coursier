import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, LucideArrowLeft, LucideBike, LucideMoon, LucideSun],
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
            <button class="theme-toggle" type="button" [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'" (click)="theme.toggleTheme()">
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

          <div class="options-row">
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
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  remember = true;
  isLoading = false;

  /** Langue courante (FR/EN) — bascule cosmétique conforme à la maquette. */
  readonly lang = signal<string>('fr');

  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.initLang();

    // Redirect automatique si déjà connecté (token valide en localStorage).
    if (this.authService.isLoggedIn()) {
      this.redirectByRole(this.authService.getCurrentUserRole());
    }
  }

  onSubmit(): void {
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        // saveToken() est déjà appelé dans AuthService.login() (tap) — inclut fullName.
        this.toast.success(`Bienvenue ${response.email} !`);
        this.redirectByRole(response.role);
      },
      error: (err) => {
        this.isLoading = false;
        const message = err.error?.message || 'Email ou mot de passe incorrect.';
        this.toast.error(message);
      }
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

  private initLang(): void {
    let saved = 'fr';
    try { saved = localStorage.getItem('lang') || 'fr'; } catch (e) { /* ignore */ }
    this.lang.set(saved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', saved);
    }
  }

  private redirectByRole(role: string): void {
    if (role === 'COURIER') {
      this.router.navigate(['/courier/dashboard']);
    } else if (role === 'ADMIN') {
      // Route admin à venir (Sprint 6) — fallback côté client pour l'instant.
      this.router.navigate(['/client/dashboard']);
    } else {
      this.router.navigate(['/client/dashboard']);
    }
  }
}
