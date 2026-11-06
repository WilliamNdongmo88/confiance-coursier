import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideUser } from '@lucide/angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule, LucideArrowLeft, LucideBike, LucideMoon, LucideSun, LucideUser],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card st-max-520px-padd-20px">

        <!-- Ligne 1 : Retour | FR + Thème -->
        <div class="auth-topbar">
          <a class="back-link" routerLink="/login" aria-label="Retour à la connexion">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
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

        <!-- Logo centré -->
        <div class="auth-logo">
          <svg lucideBike size="22"></svg>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <h1 class="auth-title">Créer un compte</h1>

        <!-- Sélecteur de rôle -->
        <p class="text-sm text-muted text-center mb-md">Je suis :</p>
        <div class="role-selector">

          <div class="role-card" [class.selected]="role === 'CLIENT'" (click)="role = 'CLIENT'">
            <div class="role-icon"><svg lucideUser size="28"></svg></div>
            <div class="role-name">Client</div>
            <div class="text-sm text-muted mt-sm">Je commande</div>
          </div>

          <div class="role-card" [class.selected]="role === 'COURIER'" (click)="role = 'COURIER'">
            <div class="role-icon"><svg lucideBike size="28"></svg></div>
            <div class="role-name">Coursier</div>
            <div class="text-sm text-muted mt-sm">J'exécute</div>
          </div>

        </div>

        <!-- Formulaire -->
        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">

          <div class="form-group">
            <label class="form-label" for="reg-fullname">Nom complet</label>
            <input id="reg-fullname" type="text" class="form-input"
              [(ngModel)]="fullName" name="fullName" required
              placeholder="Jean Dupont" autocomplete="name">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input id="reg-email" type="email" class="form-input"
              [(ngModel)]="email" name="email" required
              placeholder="vous@email.com" autocomplete="email">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-phone">Téléphone</label>
            <input id="reg-phone" type="tel" class="form-input"
              [(ngModel)]="phone" name="phone"
              placeholder="+237 6XX XXX XXX" autocomplete="tel">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Mot de passe</label>
            <input id="reg-password" type="password" class="form-input"
              [(ngModel)]="password" name="password" required minlength="8"
              placeholder="Min 8 caractères" autocomplete="new-password">
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password-confirm">Confirmer le mot de passe</label>
            <input id="reg-password-confirm" type="password" class="form-input"
              [(ngModel)]="confirmPassword" name="confirmPassword" required
              placeholder="••••••••" autocomplete="new-password"
              [class.input-error]="confirmPassword && confirmPassword !== password">
            @if (confirmPassword && confirmPassword !== password) {
              <p class="form-error">Les mots de passe ne correspondent pas.</p>
            }
          </div>

          <!-- Champs spécifiques COURSIER -->
          @if (role === 'COURIER') {
            <div>
              <hr class="st-bd-0-bt-1px-solid-bo-m-20px-0">
              <p class="st-fs-9rem-fw-700-c-primary">
                Informations professionnelles
              </p>

              <div class="form-group">
                <label class="form-label" for="reg-vehicle">Véhicule</label>
                <select id="reg-vehicle" class="form-select"
                  [(ngModel)]="vehicle" name="vehicle">
                  <option value="MOTO">Moto</option>
                  <option value="VELO">Vélo</option>
                  <option value="VOITURE">Voiture</option>
                  <option value="PIED">À pied</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-zone">Zone d'intervention principale</label>
                <input id="reg-zone" type="text" class="form-input"
                  [(ngModel)]="interventionZone" name="interventionZone"
                  placeholder="Ex: Yaoundé - Mokolo, Bastos">
              </div>
            </div>
          }

          <!-- CGU -->
          <label class="form-checkbox mb-md">
            <input type="checkbox" [(ngModel)]="acceptCgu" name="acceptCgu" required>
            <span>J'accepte les <a href="#" (click)="$event.preventDefault()">CGU</a>
              et la <a href="#" (click)="$event.preventDefault()">politique de confidentialité</a></span>
          </label>

          <!-- Bouton submit -->
          <button type="submit" class="btn btn-primary btn-block btn-lg"
            [disabled]="isLoading || !acceptCgu || (!!confirmPassword && confirmPassword !== password)">
            @if (isLoading) {
              Création en cours…
            } @else {
              Créer mon compte
            }
          </button>

        </form>

        <div class="auth-footer">Déjà un compte ? <a routerLink="/login">Se connecter</a></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Styles spécifiques à la page register non couverts par main.css */
    .role-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .role-card {
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      background: var(--bg);
    }

    .role-card:hover {
      border-color: var(--gray-400);
    }

    .role-card.selected {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .role-card .role-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
      color: var(--text-muted);
      transition: color 0.15s, transform 0.2s;
    }

    .role-card.selected .role-icon {
      color: var(--primary);
      transform: scale(1.1);
    }

    .role-name {
      font-weight: 700;
      font-size: .95rem;
      color: var(--text);
    }

    .input-error {
      border-color: var(--cc-danger) !important;
    }

    .form-error {
      color: var(--cc-danger);
      font-size: .8rem;
      margin-top: 4px;
    }

    .form-select {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-size: .95rem;
      background: var(--bg);
      color: var(--text);
      outline: none;
      box-sizing: border-box;
    }

    /* Dark mode overrides */
    [data-theme="dark"] .role-card {
      border-color: var(--cc-line);
      background: var(--surface);
    }

    [data-theme="dark"] .role-card:hover {
      border-color: var(--primary);
    }

    [data-theme="dark"] .role-card.selected {
      border-color: var(--primary);
      background: rgba(62, 138, 107, 0.15);
    }

    [data-theme="dark"] .role-card.selected .role-icon {
      color: var(--cc-lime);
    }

    @media (max-width: 480px) {
      .role-card {
        padding: 14px 10px;
      }
    }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-max-520px-padd-20px { max-width: 520px; padding-top: 20px; }
    .st-bd-0-bt-1px-solid-bo-m-20px-0 { border: 0; border-top: 1px solid var(--border); margin: 20px 0; }
    .st-fs-9rem-fw-700-c-primary { font-size: .9rem; font-weight: 700; color: var(--primary); margin-bottom: 16px; }
  `]
})
export class RegisterComponent {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role = 'CLIENT';
  vehicle = 'MOTO';
  interventionZone = '';
  acceptCgu = false;
  isLoading = false;

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
        this.toast.success('Compte créé ! Vérifiez votre téléphone pour l\'OTP.');
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
