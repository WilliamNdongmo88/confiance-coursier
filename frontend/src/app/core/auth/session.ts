/**
 * Utilitaires de session (TICK-072) : page d'accueil par rôle et expiration des JWT.
 * Lecture seule du localStorage — aucune dépendance Angular, réutilisable dans les guards.
 */

/** Page d'accueil de chaque rôle. */
export function homeForRole(role: string | null | undefined): string {
  switch ((role ?? '').toUpperCase()) {
    case 'CLIENT':  return '/client/dashboard';
    case 'COURIER': return '/courier/dashboard';
    case 'ADMIN':   return '/admin/dashboard';
    default:        return '/login';
  }
}

/** Date d'expiration (ms) d'un JWT, ou null s'il est illisible. */
export function jwtExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Jeton absent, illisible ou expiré. */
export function isJwtExpired(token: string | null | undefined, now = Date.now()): boolean {
  const exp = jwtExpiry(token);
  return exp === null || exp <= now;
}

/**
 * Session encore utilisable : jeton d'accès valide, ou jeton expiré mais refresh token valide
 * (l'intercepteur HTTP renouvellera l'accès au prochain appel).
 */
export function hasUsableSession(now = Date.now()): boolean {
  const access = localStorage.getItem('jwt_token');
  if (!access) return false;
  if (!isJwtExpired(access, now)) return true;
  return !isJwtExpired(localStorage.getItem('refresh_token'), now);
}
