import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { homeForRole, hasUsableSession } from '../../../core/auth/session';

/** Route inconnue (TICK-072) : retour vers l'espace de l'utilisateur ou l'accueil public. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host { display: flex; min-height: 100dvh; align-items: center; justify-content: center;
            background: var(--bg); padding: 16px; text-align: center; }
    .code { font-size: 3rem; font-weight: 800; color: var(--primary); margin: 0; }
    h1 { font-size: 1.25rem; margin: 8px 0; color: var(--text); }
    p { color: var(--text-muted); margin: 0 0 24px; }
    .btn { min-height: 48px; justify-content: center; }
  `],
  template: `
    <div>
      <p class="code">404</p>
      <h1>Page introuvable</h1>
      <p>Le lien est peut-être incomplet ou la page a été déplacée.</p>
      <a [routerLink]="home" class="btn btn-primary">{{ loggedIn ? 'Retour à mon espace' : "Retour à l'accueil" }}</a>
    </div>
  `,
})
export class NotFoundComponent {
  readonly loggedIn = hasUsableSession();
  readonly home = this.loggedIn ? homeForRole(localStorage.getItem('user_role')) : '/';
}
