import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ─── Interfaces (match backend DTOs) ──────────────────────────────────────────

export interface AdminKycResponse {
  id: number;
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  documentType: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  frontFileUrl: string | null;
  backFileUrl: string | null;
  selfieFileUrl: string | null;
}

export interface DisputeResponse {
  id: number;
  courseId: number;
  openedBy: number;
  motifCode: string;
  description: string | null;
  status: string;
  decision: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface ReportResponse {
  id: number;
  reporterId: number;
  targetId: number;
  motif: string;
  description: string | null;
  status: string;
  decision: string | null;
  createdAt: string;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  country: string | null;
  city: string | null;
  status: string;
  trustScore: number;
  badge: string | null;
  kycStatus: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSettings {
  commissionRateClient: number;
  commissionRateCourier: number;
  tarifMinimumCoursier: number;
  currency: string;
}

export interface UpdateCommissionRequest {
  commissionRateClient: number;
  commissionRateCourier: number;
  tarifMinimumCoursier: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // ─── KYC ──────────────────────────────────────────────────────────────────

  getKycList(status?: string): Observable<AdminKycResponse[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<AdminKycResponse[]>('/api/admin/kyc', { params });
  }

  approveKyc(id: number): Observable<AdminKycResponse> {
    return this.http.post<AdminKycResponse>(`/api/admin/kyc/${id}/approve`, {});
  }

  rejectKyc(id: number, rejectionReason: string): Observable<AdminKycResponse> {
    return this.http.post<AdminKycResponse>(`/api/admin/kyc/${id}/reject`, { rejectionReason });
  }

  // ─── Disputes ─────────────────────────────────────────────────────────────

  getDisputes(status?: string): Observable<DisputeResponse[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<DisputeResponse[]>('/api/admin/disputes', { params });
  }

  resolveDispute(id: number, decision: string): Observable<DisputeResponse> {
    return this.http.post<DisputeResponse>(`/api/admin/disputes/${id}/resolve`, null, {
      params: { decision },
    });
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  getReports(status?: string): Observable<ReportResponse[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<ReportResponse[]>('/api/admin/reports', { params });
  }

  processReport(id: number, decision: string): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(`/api/admin/reports/${id}/process`, null, {
      params: { decision },
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  getUsers(role?: string, status?: string): Observable<UserProfileResponse[]> {
    const params: Record<string, string> = {};
    if (role) params['role'] = role;
    if (status) params['status'] = status;
    return this.http.get<UserProfileResponse[]>('/api/admin/users', { params });
  }

  suspendUser(id: number): Observable<UserProfileResponse> {
    return this.http.post<UserProfileResponse>(`/api/admin/users/${id}/suspend`, {});
  }

  activateUser(id: number): Observable<UserProfileResponse> {
    return this.http.post<UserProfileResponse>(`/api/admin/users/${id}/activate`, {});
  }

  // ─── Commissions ──────────────────────────────────────────────────────────

  getCommissions(): Observable<CommissionSettings> {
    return this.http.get<CommissionSettings>('/api/admin/commissions');
  }

  updateCommissions(data: UpdateCommissionRequest): Observable<CommissionSettings> {
    return this.http.put<CommissionSettings>('/api/admin/commissions', data);
  }
}
