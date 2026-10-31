import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideBike, LucideUser } from '@lucide/angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, LucideBike, LucideUser],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
      <div class="auth-card">
        <!-- Logo -->
        <div class="text-center mb-6">
          <div class="brand-icon">
            <svg lucideBike size="20"></svg>
          </div>
          <h1 class="text-xl font-extrabold text-[#123b32]">ConfianceCoursier</h1>
        </div>

        <h2 class="auth-title">Créer un compte</h2>

        <!-- Sélecteur de rôle -->
        <p class="text-sm text-gray-500 text-center mb-3">Je suis :</p>
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button type="button"
            (click)="role = 'CLIENT'"
            [class]="role === 'CLIENT' ? 'border-2 border-[#123b32] bg-[#e4f1e8] p-4 rounded-xl text-center transition-all' : 'border-2 border-gray-200 p-4 rounded-xl text-center transition-all hover:border-gray-300'">
            <svg lucideUser size="24" class="mx-auto mb-2 text-[#123b32]"></svg>
            <div class="font-bold text-sm text-[#15241f]">Client</div>
            <div class="text-xs text-gray-500">Je commande</div>
          </button>

          <button type="button"
            (click)="role = 'COURIER'"
            [class]="role === 'COURIER' ? 'border-2 border-[#123b32] bg-[#e4f1e8] p-4 rounded-xl text-center transition-all' : 'border-2 border-gray-200 p-4 rounded-xl text-center transition-all hover:border-gray-300'">
            <svg lucideBike size="24" class="mx-auto mb-2 text-[#123b32]"></svg>
            <div class="font-bold text-sm text-[#15241f]">Coursier</div>
            <div class="text-xs text-gray-500">J'exécute</div>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nom complet</label>
            <input type="text" [(ngModel)]="fullName" name="fullName" required class="form-input" placeholder="Jean Dupont">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" [(ngModel)]="email" name="email" required class="form-input" placeholder="vous@email.com">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
            <input type="tel" [(ngModel)]="phone" name="phone" required class="form-input" placeholder="+237 6XX XXX XXX">
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" required class="form-input" placeholder="Min 8 caractères">
          </div>

          <button type="submit" [disabled]="isLoading" class="btn-primary flex items-center justify-center gap-2">
            @if (isLoading) {
              <app-spinner></app-spinner>
              Création en cours...
            } @else {
              Créer mon compte
            }
          </button>
        </form>

        <p class="text-center text-sm text-gray-600 mt-6">
          Déjà un compte ? <a routerLink="/login" class="auth-link">Se connecter</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  role = 'CLIENT';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  onSubmit() {
    this.isLoading = true;

    this.authService.register({
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      password: this.password,
      role: this.role
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Compte créé ! Vérifiez la console backend pour l\'OTP.');
        this.router.navigate(['/verify-otp'], { queryParams: { email: this.email } });
      },
      error: (err) => {
        this.isLoading = false;
        const message = err.error?.message || 'Une erreur est survenue lors de l\'inscription.';
        this.toast.error(message);
      }
    });
  }
}
