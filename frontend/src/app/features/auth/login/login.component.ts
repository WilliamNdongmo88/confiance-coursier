import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideBike } from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, LucideBike],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
      <div class="auth-card">
        <div class="text-center mb-8">
          <div class="brand-icon">
            <svg lucideBike size="20"></svg>
          </div>
          <h1 class="text-xl font-extrabold text-[#123b32]">ConfianceCoursier</h1>
        </div>

        <h2 class="auth-title">Se connecter</h2>

        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" [(ngModel)]="email" name="email" required class="form-input" placeholder="vous@email.com">
          </div>
          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" required class="form-input" placeholder="••••••••">
          </div>
          <button type="submit" [disabled]="isLoading" class="btn-primary flex items-center justify-center gap-2">
            @if (isLoading) {
              <app-spinner></app-spinner>
              Connexion en cours...
            } @else {
              Se connecter
            }
          </button>
        </form>

        <p class="text-center text-sm text-gray-600 mt-6">
          Pas encore de compte ? <a routerLink="/register" class="auth-link">S'inscrire</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.authService.saveToken(response.token, response.userId, response.role);
        this.toast.success(`Bienvenue ${response.email} !`);

        if (response.role === 'COURIER') {
          this.router.navigate(['/courier/dashboard']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        // Récupère le message d'erreur du backend
        const message = err.error?.message || 'Email ou mot de passe incorrect.';
        this.toast.error(message);
      }
    });
  }
}
