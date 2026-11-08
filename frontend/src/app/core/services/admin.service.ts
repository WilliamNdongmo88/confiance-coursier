import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ─── Interfaces (match backend DTOs) ──────────────────────────────────────────

export interface AdminKycResponse {
  id: number;
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  // Informations personnelles déclarées lors du KYC
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;   // ISO date: YYYY-MM-DD
  nationality: string | null;
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

export interface DisputeParty { id: number; fullName: string | null; email: string | null; status: string | null; }

export interface DisputeProof {
  id: number;
  proofType: 'PHOTO' | 'VIDEO' | 'RECEIPT' | string;
  presignedUrl: string;
  mimeType: string | null;
  uploadedAt: string | null;
  videoDurationMs: number | null;
}

/** Dossier d'arbitrage d'un litige ({@code GET /api/admin/disputes/{id}}). */
export interface DisputeDetail {
  dispute: DisputeResponse;
  openedByRole: 'CLIENT' | 'COURIER';
  client: DisputeParty | null;
  courier: DisputeParty | null;
  course: { id: number; description: string; zone: string | null; status: string; escrowStatus: string | null;
    paidAt: string | null; proofDeadline: string | null; completedAt: string | null; };
  amounts: { held: number; courseAmount: number | null; realCosts: number | null;
    courierOnRelease: number | null; platformOnRelease: number | null;
    clientOnFullRefund: number | null; platformOnFullRefund: number | null; };
  proofs: DisputeProof[];
  chatRoomId: number | null;
}

// ─── TICK-091 : gestion des courses ──────────────────────────────────────────

export interface AdminCourseRow {
  id: number; description: string; zone: string | null; status: string; escrowStatus: string | null;
  clientName: string | null; courierName: string | null; totalAmount: number | null; courseAmount: number | null;
  createdAt: string; scheduledAt: string | null; paidAt: string | null; blocked: boolean;
}
export interface AdminCoursePage { items: AdminCourseRow[]; total: number; page: number; size: number; }
export interface AdminParty { id: number; fullName: string | null; email: string | null; phone: string | null; status: string | null; }
export interface AdminCourseDetail {
  course: any;
  client: AdminParty | null;
  courier: AdminParty | null;
  blocked: boolean;
  timeline: { label: string; at: string }[];
  ledger: { id: number; entryType: string; amount: number; provider: string | null; providerRef: string | null; status: string | null; createdAt: string }[];
  held: number;
  proofs: DisputeProof[];
  rooms: { chatRoomId: number; courierId: number; courierName: string; archived: boolean; retained: boolean }[];
  disputes: { id: number; motifCode: string; status: string; decision: string | null; createdAt: string }[];
  cancelReason: string | null;
  cancelledAt: string | null;
  /** CANCEL (pas encore payée), REFUND (argent bloqué), ou null. */
  cancelAction: 'CANCEL' | 'REFUND' | null;
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
  /** TICK-089 : moyen de déplacement du coursier. */
  vehicle?: string | null;
  /** Motif et date de la suspension en cours (null si le compte est actif). */
  suspensionReason?: string | null;
  suspendedAt?: string | null;
}

/** Règles de remboursement et délais ({@code GET/PUT /api/admin/platform-rules}, TICK-093). */
export interface PlatformRules {
  refundFeesOnFullRefund: boolean;
  refundFeesOnNoShow: boolean;
  proofDeadlineHours: number;
  reminderHoursBefore: number;
  overdueGraceHours: number;
  maxExtensions: number;
  autoValidateHours: number;
}

/** Une modification de réglage ({@code GET /api/admin/settings-history}, TICK-093). */
export interface SettingChange {
  id: number;
  settingKey: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: number | null;
  changedByName: string | null;
}

/** Page de comptes renvoyée par {@code GET /api/admin/users/search} (TICK-094). */
export interface AdminUserPage {
  items: UserProfileResponse[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  counts: { ALL: number; CLIENT: number; COURIER: number; SUSPENDED: number };
}

/** Activité réelle d'un compte ({@code GET /api/admin/users/{id}/summary}). */
export interface UserActivitySummary {
  coursesAsClient: number;
  coursesAsCourier: number;
  completedAsCourier: number;
  disputesOpened: number;
  reportsReceived: number;
  /** Litiges des courses où le compte est client ou coursier (les plus récents d'abord). */
  disputes: { id: number; courseId: number; motifCode: string; status: string; decision: string | null; openedByThisUser: boolean; createdAt: string; }[];
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

// ─── Gains ────────────────────────────────────────────────────────────────────

export interface MonthlyGain {
  month: string;
  gains: number;
  volume: number;
  nbCourses: number;
}

export interface CourseGainEntry {
  courseId: number;
  description: string | null;
  status: string;
  escrowStatus: string | null;
  completedAt: string | null;
  totalAmount: number;
  commissionAmount: number;
  platformFeeAmount: number;
  courierAmount: number;
  commissionRate: number;
  commissionRateCourier: number;
}

export interface GainsStatsResponse {
  totalGains: number;
  totalVolume: number;
  totalCourses: number;
  gainsThisMonth: number;
  gainsLastMonth: number;
  monthly: MonthlyGain[];
  recentCourses: CourseGainEntry[];
}

// ─── Payout Settings ──────────────────────────────────────────────────────────

export interface PayoutSettingsResponse {
  mtnNumber: string | null;
  mtnName: string | null;
  orangeNumber: string | null;
  orangeName: string | null;
  bankIban: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  preferredMethod: string | null;
}

export interface UpdatePayoutSettingsRequest {
  mtnNumber?: string;
  mtnName?: string;
  orangeNumber?: string;
  orangeName?: string;
  bankIban?: string;
  bankName?: string;
  bankAccountName?: string;
  preferredMethod?: string;
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

  deleteKyc(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/kyc/${id}`);
  }

  // ─── Disputes ─────────────────────────────────────────────────────────────

  getDisputes(status?: string): Observable<DisputeResponse[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<DisputeResponse[]>('/api/admin/disputes', { params });
  }

  // ─── Courses (TICK-091) ──────────────────────────────────────────────────

  getCourses(status: string, q: string, page: number, size = 20): Observable<AdminCoursePage> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (status) params['status'] = status;
    if (q.trim()) params['q'] = q.trim();
    return this.http.get<AdminCoursePage>('/api/admin/courses', { params });
  }

  getCourseDetail(id: number): Observable<AdminCourseDetail> {
    return this.http.get<AdminCourseDetail>(`/api/admin/courses/${id}`);
  }

  cancelCourse(id: number, reason: string): Observable<AdminCourseDetail> {
    return this.http.post<AdminCourseDetail>(`/api/admin/courses/${id}/cancel`, { reason });
  }

  getDisputeDetail(id: number): Observable<DisputeDetail> {
    return this.http.get<DisputeDetail>(`/api/admin/disputes/${id}`);
  }

  resolveDispute(id: number, decision: string, refundAmount?: number): Observable<DisputeResponse> {
    return this.http.post<DisputeResponse>(`/api/admin/disputes/${id}/resolve`,
      { decision, refundAmount: refundAmount ?? null }
    );
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

  getUserSummary(id: number): Observable<UserActivitySummary> {
    return this.http.get<UserActivitySummary>(`/api/admin/users/${id}/summary`);
  }

  /** TICK-094 : page de comptes (onglet, recherche nom / email / téléphone) et compteurs de chaque onglet. */
  searchUsers(tab: string, q: string, page: number, size: number): Observable<AdminUserPage> {
    const params: Record<string, string> = { tab, page: String(page), size: String(size) };
    if (q.trim()) params['q'] = q.trim();
    return this.http.get<AdminUserPage>('/api/admin/users/search', { params });
  }

  getUsers(role?: string, status?: string): Observable<UserProfileResponse[]> {
    const params: Record<string, string> = {};
    if (role) params['role'] = role;
    if (status) params['status'] = status;
    return this.http.get<UserProfileResponse[]>('/api/admin/users', { params });
  }

  /** TICK-094 : motif obligatoire (10 à 500 caractères), envoyé à la personne suspendue. */
  suspendUser(id: number, reason: string): Observable<UserProfileResponse> {
    return this.http.post<UserProfileResponse>(`/api/admin/users/${id}/suspend`, { reason });
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

  // ─── Gains ────────────────────────────────────────────────────────────────

  getGains(): Observable<GainsStatsResponse> {
    return this.http.get<GainsStatsResponse>('/api/admin/gains');
  }

  // ─── Payout Settings ──────────────────────────────────────────────────────

  getPlatformRules(): Observable<PlatformRules> {
    return this.http.get<PlatformRules>('/api/admin/platform-rules');
  }

  updatePlatformRules(rules: PlatformRules): Observable<PlatformRules> {
    return this.http.put<PlatformRules>('/api/admin/platform-rules', rules);
  }

  getSettingsHistory(page: number, size: number): Observable<{ items: SettingChange[]; total: number; page: number; size: number }> {
    return this.http.get<{ items: SettingChange[]; total: number; page: number; size: number }>('/api/admin/settings-history',
      { params: { page: String(page), size: String(size) } });
  }

  getPayoutSettings(): Observable<PayoutSettingsResponse> {
    return this.http.get<PayoutSettingsResponse>('/api/admin/payout-settings');
  }

  updatePayoutSettings(data: UpdatePayoutSettingsRequest): Observable<PayoutSettingsResponse> {
    return this.http.put<PayoutSettingsResponse>('/api/admin/payout-settings', data);
  }
}
