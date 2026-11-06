import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { hasUsableSession } from '../auth/session';

/**
 * Accès réservé aux utilisateurs connectés (TICK-072 : l'expiration du JWT est vérifiée).
 * Jeton d'accès expiré mais refresh token valide → accès autorisé, l'intercepteur renouvelle la session.
 * Session expirée → nettoyage puis /login (avec retour vers la page demandée).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (hasUsableSession()) {
    return true;
  }
  if (localStorage.getItem('jwt_token')) {
    inject(AuthService).logout(); // session périmée : on repart proprement
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
