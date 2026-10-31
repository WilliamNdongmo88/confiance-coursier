import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const requiredRole: string = route.data['role'];
  const userRole = localStorage.getItem('user_role');

  if (userRole && userRole === requiredRole) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
