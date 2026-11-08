import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateCourseRequest {
  description: string;
  zone: string;
  scheduledAt: string;
  /** Personne à contacter sur place (facultatif). */
  contactName?: string | null;
  contactPhone?: string | null;
  /** D'où le client paie : CAMEROON (Mobile Money) ou ABROAD (carte bancaire). */
  clientLocation?: 'CAMEROON' | 'ABROAD' | null;
}

export interface CourierSummary {
  id: number;
  fullName: string;
  initials: string;
  averageRating: number | null;
  completedCourses: number;
  zone: string | null;
  kycVerified: boolean;
  /** TICK-089 : moyen de déplacement et même ville que la course. */
  vehicle: string | null;
  sameCity: boolean;
}

/** Conversation d'un coursier sur une course ouverte (GET /api/courses/{id}/conversations). */
export interface CourseConversation {
  chatRoomId: number;
  courierId: number;
  courierName: string;
  verified: boolean;
  trustScore: number | null;
  /** Offre en cours du coursier (null s'il n'a pas encore proposé de tarif). */
  offerAmount: number | null;
  offerStatus: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | null;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = '/api/courses';

  constructor(private http: HttpClient) {}

  createCourse(data: CreateCourseRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getMyCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-courses`);
  }

  // Récupère la liste des courses publiées
  getPublishedCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/published`);
  }

  updateCourse(id: number, data: CreateCourseRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCourseById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getMyMissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-missions`);
  }

  /** Coursiers vérifiés ; ceux de {@code city} (ville de la course) d'abord. */
  getAvailableCouriers(city?: string): Observable<CourierSummary[]> {
    return this.http.get<CourierSummary[]>('/api/users/couriers', { params: city ? { city } : {} });
  }

  /** TICK-059 — Le client accepte une offre ACTIVE → course passe en ASSIGNED. */
  acceptOffer(courseId: number, offerId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${courseId}/offers/${offerId}/accept`, {});
  }

  /**
   * TICK-057 — Ouvre (ou récupère) un salon de chat SANS créer d'offre fictive.
   * Appelé par le client avec courierId, ou par le coursier sans body.
   * Retourne { chatRoomId: number }.
   */
  /** Conversations ouvertes sur une course (client propriétaire), avec l'offre en cours de chaque coursier. */
  listConversations(courseId: number): Observable<CourseConversation[]> {
    return this.http.get<CourseConversation[]>(`${this.apiUrl}/${courseId}/conversations`);
  }

  openConversation(courseId: number, courierId?: number): Observable<{ chatRoomId: number }> {
    const body = courierId != null ? { courierId } : {};
    return this.http.post<{ chatRoomId: number }>(`${this.apiUrl}/${courseId}/conversations`, body);
  }

  /**
   * Téléverse une preuve en brouillon (TICK-064 : la soumission finale passe par submitProofs).
   * Retourne un Observable d'événements HTTP pour la barre de progression.
   */
  submitProof(courseId: number, file: File, proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT'): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('file', file);
    form.append('proofType', proofType);
    return this.http.post(`${this.apiUrl}/${courseId}/proofs`, form, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /** TICK-064 — Retire une preuve encore en brouillon (course IN_PROGRESS). */
  deleteProof(courseId: number, proofId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${courseId}/proofs/${proofId}`);
  }

  /** TICK-064 — Soumission finale : complétude vérifiée par le serveur, démarre les 72 h. */
  submitProofs(courseId: number): Observable<{ status: string; autoValidateAt: string }> {
    return this.http.post<{ status: string; autoValidateAt: string }>(`${this.apiUrl}/${courseId}/proofs/submit`, {});
  }

  /** TICK-073 — Courses terminées que l'utilisateur doit encore noter. */
  getPendingReviews(): Observable<{ courseId: number; description: string; completedAt: string; targetRole: string }[]> {
    return this.http.get<any[]>('/api/reviews/pending');
  }

  /** Récupère la liste des preuves d'une course. */
  getProofs(courseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${courseId}/proofs`);
  }
}
