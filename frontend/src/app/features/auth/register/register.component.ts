import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f7f8f5;">
      <div style="width:100%;max-width:520px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.10);padding:40px 40px 32px;">

        <!-- Topbar : Retour | FR+Thème -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <a routerLink="/login"
             style="display:inline-flex;align-items:center;gap:6px;color:#6b7280;font-size:.88rem;font-weight:600;text-decoration:none;padding:8px;border-radius:8px;">
            ← Retour
          </a>
        </div>

        <!-- Logo -->
        <div style="font-size:1.3rem;font-weight:800;color:#123b32;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
          🚴 ConfianceCoursier
        </div>

        <h1 style="font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:24px;color:#1a1a1a;">
          Créer un compte
        </h1>

        <!-- Sélecteur de rôle -->
        <p style="text-align:center;font-size:.9rem;color:#6b7280;margin-bottom:12px;">Je suis :</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">

          <!-- Carte CLIENT -->
          <div (click)="role = 'CLIENT'" [style]="role === 'CLIENT' ? selectedCardStyle : cardStyle"
               style="cursor:pointer;border-radius:14px;padding:20px 16px;text-align:center;transition:all .15s;">
            <div style="font-size:2rem;margin-bottom:8px;display:flex;justify-content:center;">👤</div>
            <div style="font-weight:700;font-size:.95rem;color:#1a1a1a;">Client</div>
            <div style="font-size:.8rem;color:#6b7280;margin-top:4px;">Je commande</div>
          </div>

          <!-- Carte COURSIER -->
          <div (click)="role = 'COURIER'" [style]="role === 'COURIER' ? selectedCardStyle : cardStyle"
               style="cursor:pointer;border-radius:14px;padding:20px 16px;text-align:center;transition:all .15s;">
            <div style="font-size:2rem;margin-bottom:8px;display:flex;justify-content:center;">🚴</div>
            <div style="font-weight:700;font-size:.95rem;color:#1a1a1a;">Coursier</div>
            <div style="font-size:.8rem;color:#6b7280;margin-top:4px;">J'exécute</div>
          </div>
        </div>

        <!-- Formulaire -->
        <form (ngSubmit)="onSubmit()" #registerForm="ngForm">

          <!-- Nom complet -->
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Nom complet</label>
            <input type="text" [(ngModel)]="fullName" name="fullName" required
                   style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                   placeholder="Jean Dupont">
          </div>

          <!-- Email -->
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Email</label>
            <input type="email" [(ngModel)]="email" name="email" required
                   style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                   placeholder="vous@email.com">
          </div>

          <!-- Téléphone -->
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Téléphone</label>
            <input type="tel" [(ngModel)]="phone" name="phone"
                   style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                   placeholder="+237 6XX XXX XXX">
          </div>

          <!-- Mot de passe -->
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" required minlength="8"
                   style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                   placeholder="Min 8 caractères">
          </div>

          <!-- Confirmer le mot de passe -->
          <div style="margin-bottom:20px;">
            <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Confirmer le mot de passe</label>
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required
                   style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                   [style.border-color]="confirmPassword && confirmPassword !== password ? '#ef4444' : '#e5e7eb'"
                   placeholder="••••••••">
            <p *ngIf="confirmPassword && confirmPassword !== password"
               style="color:#ef4444;font-size:.8rem;margin-top:4px;">
              Les mots de passe ne correspondent pas.
            </p>
          </div>

          <!-- Champs spécifiques COURSIER -->
          <div *ngIf="role === 'COURIER'">
            <hr style="border:0;border-top:1px solid #e5e7eb;margin:4px 0 20px;">
            <p style="font-size:.9rem;font-weight:700;color:#17634f;margin-bottom:16px;">Informations professionnelles</p>

            <!-- Véhicule -->
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Véhicule</label>
              <select [(ngModel)]="vehicle" name="vehicle"
                      style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;background:#fff;box-sizing:border-box;">
                <option value="MOTO">Moto</option>
                <option value="VELO">Vélo</option>
                <option value="VOITURE">Voiture</option>
                <option value="PIED">À pied</option>
              </select>
            </div>

            <!-- Zone d'intervention -->
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px;">Zone d'intervention principale</label>
              <input type="text" [(ngModel)]="interventionZone" name="interventionZone"
                     style="width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box;"
                     placeholder="Ex: Yaoundé - Mokolo, Bastos">
            </div>
          </div>

          <!-- CGU -->
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:20px;">
            <input type="checkbox" [(ngModel)]="acceptCgu" name="acceptCgu" required
                   style="margin-top:3px;accent-color:#17634f;">
            <span style="font-size:.875rem;color:#374151;">
              J'accepte les <a href="#" style="color:#17634f;font-weight:600;">CGU</a>
              et la <a href="#" style="color:#17634f;font-weight:600;">politique de confidentialité</a>
            </span>
          </div>

          <!-- Bouton submit -->
          <button type="submit"
                  [disabled]="isLoading || !acceptCgu || (confirmPassword !== password)"
                  style="width:100%;padding:14px;background:#17634f;color:#fff;font-weight:700;font-size:1rem;border:none;border-radius:10px;cursor:pointer;transition:opacity .2s;"
                  [style.opacity]="(isLoading || !acceptCgu || confirmPassword !== password) ? '0.55' : '1'">
            {{ isLoading ? 'Création en cours…' : 'Créer mon compte' }}
          </button>
        </form>

        <p style="text-align:center;font-size:.9rem;color:#4b5563;margin-top:24px;">
          Déjà un compte ?
          <a routerLink="/login" style="color:#17634f;font-weight:700;text-decoration:none;">Se connecter</a>
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
  confirmPassword = '';
  role = 'CLIENT';
  vehicle = 'MOTO';
  interventionZone = '';
  acceptCgu = false;
  isLoading = false;

  readonly cardStyle = 'border:2px solid #e5e7eb;background:#f9fafb;';
  readonly selectedCardStyle = 'border:2px solid #123b32;background:#e8f5ee;';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

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
      role: this.role
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Compte créé ! Vérifiez votre téléphone pour l\'OTP.');
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
