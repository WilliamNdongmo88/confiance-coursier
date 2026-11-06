import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  otp?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  email: string;
  fullName: string;
  role: string;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';

  /** Signal réactif — true si un token est présent en localStorage */
  private _isLoggedIn = signal<boolean>(!!localStorage.getItem('jwt_token'));
  readonly isLoggedIn = computed(() => this._isLoggedIn());

  constructor(private http: HttpClient) {}

  /**
   * Étape 1 de la connexion (TICK-066) : le serveur vérifie le mot de passe, puis envoie un OTP
   * si le compte est ADMIN (otpRequired = true). 401 si identifiants incorrects, 429 si trop de demandes.
   */
  requestAdminOtp(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-otp`, { email, password });
  }

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        this.saveToken(
          response.token,
          response.userId,
          response.role,
          response.fullName,
          response.refreshToken,
          response.email
        );
      })
    );
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  /** Renvoie un nouveau code OTP pour l'email donné via l'endpoint dédié. */
  resendOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-otp`, { email });
  }

  /**
   * Échange un refresh token contre un nouveau couple access/refresh token.
   * Utilisé par l'intercepteur HTTP pour rejouer les requêtes 401.
   */
  refreshAccessToken(refreshToken: string | null): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken });
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Déconnexion : invalide le refresh token côté serveur (best-effort) puis
   * vide tout le localStorage. L'appel HTTP est fire-and-forget (ne bloque pas
   * la navigation) et ignore les erreurs (le token local est déjà effacé).
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.clearStorage();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: () => { /* token déjà effacé localement — on ignore */ }
      });
    }
  }

  /** Efface toutes les clés d'authentification et met à jour le signal. */
  private clearStorage(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_full_name');
    localStorage.removeItem('user_email');
    this._isLoggedIn.set(false);
  }

  saveToken(
    token: string,
    userId: number,
    role: string,
    fullName?: string,
    refreshToken?: string,
    email?: string
  ): void {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_id', String(userId));
    localStorage.setItem('user_role', role);
    if (fullName) {
      localStorage.setItem('user_full_name', fullName);
    }
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    if (email) {
      localStorage.setItem('user_email', email);
    }
    this._isLoggedIn.set(true);
  }

  getCurrentUserId(): number {
    return Number(localStorage.getItem('user_id')) || 0;
  }

  getCurrentUserRole(): string {
    return localStorage.getItem('user_role') || 'INCONNU';
  }

  /** Retourne l'email de l'utilisateur connecté (ou chaîne vide si absent). */
  getCurrentUserEmail(): string {
    return localStorage.getItem('user_email') || '';
  }

  /** Retourne le nom complet de l'utilisateur connecté (ou chaîne vide si absent). */
  getCurrentUserFullName(): string {
    return localStorage.getItem('user_full_name') || '';
  }
}
