import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasUsableSession, homeForRole } from '../auth/session';

/** Pages publiques (landing, connexion, inscription) : un utilisateur connecté va directement à son espace (TICK-072). */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (hasUsableSession()) {
    return router.createUrlTree([homeForRole(localStorage.getItem('user_role'))]);
  }
  return true;
};
