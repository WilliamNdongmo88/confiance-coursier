import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentInitiateRequest {
  courseId: number;
  tarifCoursier: number;
  fraisReels: number;
  paymentMethod: string;
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
