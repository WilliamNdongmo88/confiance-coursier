import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f7f8f5;">
      <div style="width: 100%; max-width: 400px; padding: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h1 style="font-size: 1.8rem; color: #123b32; text-align: center; margin-bottom: 24px;">Se connecter</h1>

        <form (ngSubmit)="onSubmit()">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Email</label>
            <input type="email" [(ngModel)]="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Mot de passe</label>
            <input type="password" [(ngModel)]="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>

          <button type="submit" style="width: 100%; padding: 12px; background: #123b32; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Se connecter
          </button>
        </form>

        <p style="text-align: center; margin-top: 16px;">
          Pas encore de compte ? <a routerLink="/register" style="color: #123b32; font-weight: 600;">S'inscrire</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.authService.saveToken(response.token);
        alert(`Bienvenue ${response.email} ! Rôle : ${response.role}`);
        this.router.navigate(['/']);
      },
      error: () => alert('Email ou mot de passe incorrect.')
    });
  }
}
