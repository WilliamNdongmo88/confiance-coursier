import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * TICK-060 : le tarif du coursier n'est PAS envoyé par le client.
 * Il est lu côté serveur depuis course.courseAmount (offre acceptée).
 * L'idempotencyKey évite le double paiement en cas de retry.
 */
export interface PaymentInitiateRequest {
  courseId: number;
  fraisReels: number;
  paymentMethod: string;
  idempotencyKey: string;
}

export interface PaymentInitiateResponse {
  paymentRef: string;
  totalAmount: number;
  status: string;
  courseId: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly apiUrl = '/api/payment';

  constructor(private http: HttpClient) {}

  initiate(req: PaymentInitiateRequest): Observable<PaymentInitiateResponse> {
    return this.http.post<PaymentInitiateResponse>(`${this.apiUrl}/initiate`, req);
  }
}
