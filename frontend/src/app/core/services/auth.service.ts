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
}

export interface AuthResponse {
  token: string;
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

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        this.saveToken(response.token, response.userId, response.role, response.fullName);
      })
    );
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  /** Efface toutes les clés d'authentification et met à jour le signal */
  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_full_name');
    this._isLoggedIn.set(false);
  }

  saveToken(token: string, userId: number, role: string, fullName?: string): void {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_id', String(userId));
    localStorage.setItem('user_role', role);
    if (fullName) {
      localStorage.setItem('user_full_name', fullName);
    }
    this._isLoggedIn.set(true);
  }

  getCurrentUserId(): number {
    return Number(localStorage.getItem('user_id')) || 0;
  }

  getCurrentUserRole(): string {
    return localStorage.getItem('user_role') || 'INCONNU';
  }

  /** Retourne le nom complet de l'utilisateur connecté (ou chaîne vide si absent). */
  getCurrentUserFullName(): string {
    return localStorage.getItem('user_full_name') || '';
  }
}
