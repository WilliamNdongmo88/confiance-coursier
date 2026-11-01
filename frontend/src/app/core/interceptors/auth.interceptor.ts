import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, share, switchMap, tap } from 'rxjs/operators';
import { AuthService, AuthResponse } from '../services/auth.service';

/**
 * Intercepteur d'authentification.
 *
 * 1. Ajoute l'en-tête `Authorization: Bearer <token>` aux requêtes vers `/api/`
 *    (sauf les endpoints `/api/auth/*` qui n'exigent pas de token).
 * 2. Sur une réponse 401 d'une route protégée :
 *    - déclenche un refresh unique (partagé entre les requêtes parallèles),
 *    - rejoue la requête originale avec le nouveau token,
 *    - en cas d'échec du refresh → déconnexion + redirection vers `/login`.
 *
 * Le refresh lui-même (`/api/auth/refresh`) est exclu du mécanisme pour éviter
 * toute boucle infinie.
 */

/** Refresh en cours (partagé). `null` = aucun refresh en vol. */
let refreshInProgress$: Observable<AuthResponse> | null = null;

/** Indique si une requête nécessite l'en-tête d'auth (route API protégée). */
function isProtectedApiRequest(url: string): boolean {
  return url.includes('/api/') && !url.includes('/api/auth/');
}

/** Clone la requête en ajoutant le Bearer si pertinent. */
function withAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (token && isProtectedApiRequest(req.url)) {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return req;
}

/** Lance un refresh unique, partagé entre toutes les requêtes 401 parallèles. */
function refreshOnce(auth: AuthService, router: Router): Observable<AuthResponse> {
  if (refreshInProgress$) {
    return refreshInProgress$;
  }

  refreshInProgress$ = auth.refreshAccessToken(auth.getRefreshToken()).pipe(
    tap((res) => {
      // Persiste le nouveau couple access/refresh token.
      auth.saveToken(res.token, res.userId, res.role, res.fullName, res.refreshToken);
      // Libère le verrou dès le succès pour limiter la fenêtre de compétition.
      refreshInProgress$ = null;
    }),
    catchError((err) => {
      // Échec du refresh (token expiré/révoqué) : déconnexion + redirection.
      refreshInProgress$ = null;
      auth.logout();
      router.navigate(['/login']);
      return throwError(() => err);
    }),
    // Multidiffusion : un seul appel /api/auth/refresh pour tous les abonnés.
    share()
  );

  return refreshInProgress$;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authReq = withAuthHeader(req, auth.getToken());

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isProtectedApiRequest(req.url)) {
        return handle401(req, next, auth, router, error);
      }
      return throwError(() => error);
    })
  );
};

/** Gère une 401 : refresh puis replay, ou déconnexion si pas de refresh token. */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
  originalError: HttpErrorResponse
): Observable<HttpEvent<unknown>> {
  // Pas de refresh token : on ne peut rien faire d'autre que déconnecter.
  if (!auth.getRefreshToken()) {
    auth.logout();
    router.navigate(['/login']);
    return throwError(() => originalError);
  }

  return refreshOnce(auth, router).pipe(
    switchMap((res: AuthResponse) => next(withAuthHeader(req, res.token))),
    catchError((err) => throwError(() => err))
  );
}
