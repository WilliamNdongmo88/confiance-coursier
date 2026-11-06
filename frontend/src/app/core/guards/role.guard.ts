import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { homeForRole } from '../auth/session';

/**
 * Rôle requis par la route (`data.role`). Mauvais rôle → accueil de SON rôle (TICK-072),
 * et non plus /login (qui déconnectait de fait l'utilisateur).
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const requiredRole: string = route.data['role'];
  const userRole = localStorage.getItem('user_role');

  if (userRole && userRole === requiredRole) {
    return true;
  }
  return router.createUrlTree([homeForRole(userRole)]);
};
