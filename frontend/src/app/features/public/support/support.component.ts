import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { homeForRole, hasUsableSession } from '../../../core/auth/session';

/** Page Support (TICK-072) — simple, accessible connecté ou non. La FAQ complète viendra avec TICK-102. */
@Component({
  selector: 'app-support',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--bg, #f7f8f5); }
    .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 40px; }
    h1 { font-size: 1.4rem; margin: 16px 0; color: var(--text, #15241f); }
    h2 { font-size: 1rem; margin: 20px 0 6px; color: var(--text, #15241f); }
    p { color: var(--text-muted, #6d7a71); margin: 0; line-height: 1.6; }
    .btn { min-height: 44px; }
  `],
  template: `
    <div class="wrap">
      <a [routerLink]="back" class="btn btn-secondary btn-sm">← Retour</a>
      <h1>Support</h1>
      <h2>Un problème sur une course ?</h2>
      <p>Depuis le détail de la course ou le chat, utilisez « Ouvrir un litige » : les fonds restent bloqués
         et un administrateur examine les preuves et la conversation.</p>
      <h2>Un comportement inapproprié ?</h2>
      <p>Dans le chat, le menu ⋮ permet de signaler l'autre personne.</p>
      <h2>Compte suspendu ou connexion impossible ?</h2>
      <p>Utilisez « Mot de passe oublié » sur la page de connexion. Si votre compte est suspendu,
         la décision vous a été envoyée par email.</p>
    </div>
  `,
})
export class SupportComponent {
  readonly back = hasUsableSession() ? homeForRole(localStorage.getItem('user_role')) : '/';
}
