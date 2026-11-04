import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideWallet,
  LucidePackageCheck,
  LucideStar,
  LucideShieldAlert,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideMessageCircle,
  LucideCamera,
  LucideShoppingBasket,
  LucidePill,
  LucideX,
  LucideCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-courier-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    NgClass,
    SlicePipe,
    AppShellComponent,
    LucideWallet,
    LucidePackageCheck,
    LucideStar,
    LucideShieldAlert,
    LucideArrowRight,
    LucideArrowUpRight,
    LucideMessageCircle,
    LucideCamera,
    LucideShoppingBasket,
    LucidePill,
    LucideX,
    LucideCheck,
  ],
  styles: [`
    /* ── Bannière KYC ── */
    .kyc-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
      border: 1px solid #b45309;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 18px;
      box-shadow: 0 4px 16px rgba(120, 53, 15, .25);
      flex-wrap: wrap;
    }
    .kyc-banner__icon-wrap {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255,255,255,.15);
      color: #fde68a;
      flex-shrink: 0;
    }
    .kyc-banner__body {
      flex: 1;
      min-width: 160px;
    }
    .kyc-banner__title {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -.01em;
      margin-bottom: 2px;
    }
    .kyc-banner__desc {
      margin: 0;
      font-size: 12px;
      color: #fde68a;
      line-height: 1.4;
    }
    .kyc-banner__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fde68a;
      color: #78350f;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    .kyc-banner__cta:hover {
      background: #fef3c7;
      transform: translateY(-1px);
    }
    @media (max-width: 520px) {
      .kyc-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .kyc-banner__icon-wrap { width: 32px; height: 32px; }
      .kyc-banner__body { min-width: unset; width: 100%; }
      .kyc-banner__cta { width: 100%; justify-content: center; }
    }

    /* ── Disponibilité ── */
    .availability {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border: 1px solid #d9eadc;
      background: #f0f7ef;
      border-radius: 99px;
      color: #39734e;
      font-size: 12px;
      font-weight: 700;
    }
    .availability-dot {
      height: 7px; width: 7px;
      border-radius: 50%;
      background: #47a36a;
      box-shadow: 0 0 0 4px #47a36a1c;
    }

    /* ── Barre de progression ── */
    .progressbar {
      height: 6px;
      background: #eef1ed;
      border-radius: 99px;
      margin: 11px 0 8px;
      overflow: hidden;
    }
    .progressbar-fill {
      height: 100%;
      background: #58936d;
      border-radius: 99px;
    }

    /* ── Bouton mission ── */
    .mission-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--cc-line-2, #d1dad2);
      background: var(--cc-white, #fff);
      color: #396b4e;
      border-radius: 7px;
      padding: 7px 10px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s;
    }
    .mission-btn:hover { background: #f1f6f0; }

    /* ── Encart règles ── */
    .rules-warning {
      background: #fff8e9;
      border: 1px solid #f0dfba;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      gap: 10px;
    }
    .rules-warning svg { color: #a66b16; flex-shrink: 0; margin-top: 1px; }
    .rules-warning p { font-size: 0.78rem; color: #6b5530; line-height: 1.4; margin: 0; }

    /* ── Modal ── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(16,38,29,.5);
      z-index: 80;
      align-items: center;
      justify-content: center;
      padding: 18px;
    }
    .modal-overlay.active { display: flex; }
    .modal-box {
      width: min(480px, 100%);
      background: #ffffff;
      border-radius: 13px;
      padding: 24px;
      box-shadow: 0 28px 80px rgba(16,38,29,.22);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .modal-header h2 { font-size: 17px; margin: 0; color: #24372c; font-weight: 700; }
    .modal-close {
      border: 0;
      background: #f1f4f0;
      border-radius: 8px;
      width: 31px; height: 31px;
      display: grid;
      place-items: center;
      color: #5a6b60;
      cursor: pointer;
    }
    .modal-detail {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8e2;
      font-size: 12px;
    }
    .modal-detail span:first-child { color: #7e8a82; }
    .modal-detail strong { color: #34463a; font-weight: 700; }
    .modal-actions { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
    .modal-actions > * { flex: 1; min-width: 0; justify-content: center; }

    /* ── Modal dark mode ── */
    [data-theme="dark"] .modal-box         { background: #1c2e26; box-shadow: 0 28px 80px rgba(0,0,0,.5); }
    [data-theme="dark"] .modal-header h2   { color: #e2ede6; }
    [data-theme="dark"] .modal-close       { background: #2a3d32; color: #9bb8a8; }
    [data-theme="dark"] .modal-close:hover { background: #35503f; }
    [data-theme="dark"] .modal-detail      { border-bottom-color: #2e4037; }
    [data-theme="dark"] .modal-detail span:first-child { color: #7a9e8a; }
    [data-theme="dark"] .modal-detail strong            { color: #c8ddd0; }
  `],
  template: `
    <app-shell pageTitle="Vue d'ensemble">

      <!-- En-tête -->
      <section class="page-head">
        <div>
          <h1>Bonjour {{ firstName }},</h1>
          <p>Votre activité, vos missions et vos revenus en un coup d'œil.</p>
        </div>
        <span class="availability">
          <span class="availability-dot"></span> Disponible aujourd'hui
        </span>
      </section>

      <!-- Alerte KYC : affichée uniquement si kycStatus !== APPROVED -->
      @if (kycStatus() !== 'APPROVED') {
        <div class="kyc-banner">
          <div class="kyc-banner__icon-wrap">
            <svg lucideShieldAlert size="20"></svg>
          </div>
          <div class="kyc-banner__body">
            @if (kycStatus() === 'PENDING') {
              <strong class="kyc-banner__title">Vérification d'identité en cours</strong>
              <p class="kyc-banner__desc">Votre dossier KYC est en cours d'examen par notre équipe (24-48h).</p>
            } @else if (kycStatus() === 'REJECTED') {
              <strong class="kyc-banner__title">Dossier KYC refusé — action requise</strong>
              <p class="kyc-banner__desc">Votre dossier a été refusé. Soumettez-en un nouveau pour accepter des missions.</p>
            } @else {
              <strong class="kyc-banner__title">Votre identité doit être vérifiée</strong>
              <p class="kyc-banner__desc">Le KYC doit être validé pour accepter de nouvelles missions.</p>
            }
          </div>
          @if (kycStatus() !== 'PENDING') {
            <a class="kyc-banner__cta" routerLink="/courier/kyc">
              {{ kycStatus() === 'REJECTED' ? 'Resoumettre' : 'Compléter le dossier' }}
              <svg lucideArrowRight size="13"></svg>
            </a>
          } @else {
            <a class="kyc-banner__cta" routerLink="/courier/kyc">
              Voir mon dossier
              <svg lucideArrowRight size="13"></svg>
            </a>
          }
        </div>
      }

      <!-- Métriques -->
      <section class="metrics-grid" aria-label="Résumé de votre activité">
        <article class="metric-card">
          <span class="metric-icon"><svg lucideWallet size="17"></svg></span>
          <div>
            <span class="metric-label">Revenus ce mois</span>
            <strong class="metric-value">
              — <span style="font-size:12px;color:#839087;font-weight:650">XAF</span>
            </strong>
            <div class="metric-note">Après frais de service</div>
          </div>
        </article>
        <article class="metric-card">
          <span class="metric-icon"><svg lucidePackageCheck size="17"></svg></span>
          <div>
            <span class="metric-label">Courses terminées</span>
            <strong class="metric-value">{{ completedCount }}</strong>
            <div class="metric-note">Depuis votre inscription</div>
          </div>
        </article>
        <article class="metric-card">
          <span class="metric-icon"><svg lucideStar size="17"></svg></span>
          <div>
            <span class="metric-label">Note moyenne</span>
            <strong class="metric-value">
              — <span style="font-size:12px;color:#839087;font-weight:650">/ 5</span>
            </strong>
            <div class="metric-note">Sur vos 30 dernières courses</div>
          </div>
        </article>
      </section>

      <!-- Grille contenu + aside -->
      <div class="content-aside-grid">

        <!-- ── Colonne principale ── -->
        <div style="display:flex;flex-direction:column;gap:15px;min-width:0">

          <!-- Panel : mes missions -->
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Mes missions</h2>
                <p>Suivez les courses à réaliser et les échanges clients</p>
              </div>
              <a class="text-link" routerLink="/courier/history">
                Voir l'historique
                <svg lucideArrowUpRight size="12" style="vertical-align:-2px"></svg>
              </a>
            </div>

            @if (myMissions.length === 0) {
              <div style="padding:24px;text-align:center;color:var(--cc-muted);font-size:.9rem">
                Aucune mission en cours.
              </div>
            }

            @for (mission of myMissions; track mission.id) {
              <article class="row-item">
                <span class="row-icon"><svg lucidePill size="16"></svg></span>
                <div class="row-body">
                  <div class="row-title">{{ mission.description | slice:0:50 }}{{ mission.description?.length > 50 ? '…' : '' }}</div>
                  <div class="row-meta">
                    <span>{{ mission.zone }}</span>
                    <span class="row-meta-dot"></span>
                    <span>{{ mission.scheduledAt | date:'dd/MM HH:mm' }}</span>
                  </div>
                </div>
                <div class="row-right">
                  <span class="status-badge" [ngClass]="statusBadgeClass(mission.status)">
                    {{ statusLabel(mission.status) }}
                  </span>
                  <div class="row-actions">
                    @if (mission.status === 'IN_PROGRESS') {
                      <a [routerLink]="['/courier/proofs', mission.id]" class="mission-btn">
                        <svg lucideCamera size="13"></svg> Preuves
                      </a>
                    }
                    <!-- Bouton Chat : visible dès qu'une chatRoom existe (toutes missions actives) -->
                    @if (mission.chatRoomId) {
                      <a [routerLink]="['/chat', mission.chatRoomId]" class="btn-row btn-row--green">
                        <svg lucideMessageCircle size="14"></svg> Chat
                      </a>
                    }
                  </div>
                </div>
              </article>
            }
          </section>

          <!-- Panel : nouvelles demandes -->
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Nouvelles demandes près de vous</h2>
                <p>Des missions correspondent à votre zone d'intervention</p>
              </div>
              @if (publishedCourses.length > 0) {
                <span class="status-badge status-badge--success">{{ publishedCourses.length }} nouvelle{{ publishedCourses.length > 1 ? 's' : '' }}</span>
              }
            </div>

            @if (publishedCourses.length === 0) {
              <div style="padding:24px;text-align:center;color:var(--cc-muted);font-size:.9rem">
                Aucune nouvelle demande pour le moment.
              </div>
            }

            @for (course of publishedCourses; track course.id) {
              <article class="row-item">
                <span class="row-icon"><svg lucideShoppingBasket size="16"></svg></span>
                <div class="row-body">
                  <div class="row-title">{{ course.description | slice:0:50 }}{{ course.description?.length > 50 ? '…' : '' }}</div>
                  <div class="row-meta">
                    <span>{{ course.scheduledAt | date:'dd/MM, HH:mm' }}</span>
                    <span class="row-meta-dot"></span>
                    <span>{{ course.zone }}</span>
                  </div>
                </div>
                <div class="row-right">
                  <button class="mission-btn" type="button" (click)="openModal(course)">
                    Voir la demande
                    <svg lucideArrowUpRight size="13"></svg>
                  </button>
                </div>
              </article>
            }
          </section>

        </div>

        <!-- ── Aside ── -->
        <aside class="card-stack">

          <!-- Gains -->
          <article class="dark-card">
            <small>Vos gains · ce mois-ci</small>
            <strong>— XAF</strong>
            <p>Les fonds sont versés après validation de la course.</p>
            <a routerLink="/courier/earnings">
              Consulter le détail
              <svg lucideArrowRight size="12" style="vertical-align:-2px;margin-left:5px"></svg>
            </a>
          </article>

          <!-- Profil de confiance -->
          <article class="panel" style="padding:17px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <strong style="font-size:13px;color:#304237">Profil de confiance</strong>
              <span style="color:#8a958d;font-size:12px">
                {{ kycStatus() === 'APPROVED' ? '2 / 4 étapes' : '1 / 4 étapes' }}
              </span>
            </div>
            <div class="progressbar">
              <div class="progressbar-fill"
                   [style.width]="kycStatus() === 'APPROVED' ? '50%' : '25%'"></div>
            </div>
            @if (kycStatus() === 'APPROVED') {
              <p style="font-size:12px;line-height:1.55;color:#7c8980;margin:0 0 11px">
                Identité vérifiée ✓ Continuez à compléter votre profil pour augmenter votre score.
              </p>
              <a class="text-link" routerLink="/courier/profile">Compléter mon profil →</a>
            } @else if (kycStatus() === 'PENDING') {
              <p style="font-size:12px;line-height:1.55;color:#7c8980;margin:0">
                Dossier en cours d'examen. Vous serez notifié dès la validation.
              </p>
            } @else {
              <p style="font-size:12px;line-height:1.55;color:#7c8980;margin:0 0 11px">
                Ajoutez les preuves KYC pour débloquer toutes les missions.
              </p>
              <a class="text-link" routerLink="/courier/kyc">Terminer ma vérification →</a>
            }
          </article>

          <!-- Encart règles -->
          <div class="rules-warning">
            <svg lucideShieldAlert size="16"></svg>
            <p><strong>Rappel :</strong> La fraude entraîne la suspension définitive du compte et la perte des gains en attente. Toutes les transactions sont vérifiées.</p>
          </div>
        </aside>

      </div>
    </app-shell>

    <!-- ── Modal demande de mission ── -->
    @if (selectedCourse) {
      <div class="modal-overlay" [class.active]="modalOpen()" (click)="closeModal($event)">
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ selectedCourse.description | slice:0:40 }}{{ selectedCourse.description?.length > 40 ? '…' : '' }}</h2>
            <button class="modal-close" type="button" aria-label="Fermer" (click)="closeModalDirect()">
              <svg lucideX size="15"></svg>
            </button>
          </div>
          <div class="modal-detail">
            <span>Zone</span>
            <strong>{{ selectedCourse.zone }}</strong>
          </div>
          <div class="modal-detail">
            <span>Créneau</span>
            <strong>{{ selectedCourse.scheduledAt | date:'dd/MM/yyyy à HH:mm' }}</strong>
          </div>
          <div class="modal-detail">
            <span>Description</span>
            <strong>{{ selectedCourse.description }}</strong>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" type="button" (click)="closeModalDirect()">Plus tard</button>
            <button class="btn btn-primary" type="button" [disabled]="isAccepting" (click)="acceptMission()">
              <svg lucideCheck size="15"></svg>
              {{ isAccepting ? 'En cours…' : 'Accepter la mission' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class CourierDashboardComponent implements OnInit {

  myMissions: any[]        = [];
  publishedCourses: any[]  = [];
  completedCount           = 0;
  selectedCourse: any      = null;
  modalOpen                = signal(false);
  isAccepting              = false;

  /** Statut KYC du coursier connecté — NONE | PENDING | APPROVED | REJECTED */
  kycStatus = signal<string>('NONE');

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private toast: ToastService,
    private router: Router,
    private http: HttpClient,
  ) {}

  get firstName(): string {
    const full = this.authService.getCurrentUserFullName().trim();
    if (full) return full.split(/\s+/)[0];
    return this.authService.getCurrentUserEmail().split('@')[0] || 'vous';
  }

  ngOnInit(): void {
    // 1. Charger le profil pour connaître le statut KYC réel
    this.http.get<any>('/api/users/me').subscribe({
      next: (profile) => this.kycStatus.set(profile.kycStatus || 'NONE'),
      error: () => {}   // silencieux — la bannière reste visible par défaut
    });

    // 2. Missions du coursier
    this.courseService.getMyMissions().subscribe({
      next: (list: any[]) => {
        this.myMissions    = list.filter(c => c.status !== 'COMPLETED');
        this.completedCount = list.filter(c => c.status === 'COMPLETED').length;
      },
      error: () => {}
    });

    // 3. Courses publiées disponibles
    this.courseService.getPublishedCourses().subscribe({
      next: (list: any[]) => { this.publishedCourses = list; },
      error: () => {}
    });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'PUBLISHED':        return 'status-badge--info';
      case 'ASSIGNED':         return 'status-badge--warning';
      case 'IN_PROGRESS':      return 'status-badge--success';
      case 'PROOFS_SUBMITTED': return 'status-badge--purple';
      case 'COMPLETED':        return 'status-badge--success';
      default:                 return '';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PUBLISHED':        return 'Publiée';
      case 'ASSIGNED':         return 'Négociation';
      case 'IN_PROGRESS':      return 'En cours';
      case 'PROOFS_SUBMITTED': return 'Preuves soumises';
      case 'COMPLETED':        return 'Terminée';
      default:                 return status;
    }
  }

  openModal(course: any): void {
    this.selectedCourse = course;
    this.modalOpen.set(true);
  }

  closeModal(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modalOpen.set(false);
    }
  }

  closeModalDirect(): void {
    this.modalOpen.set(false);
  }

  acceptMission(): void {
    if (!this.selectedCourse) return;
    this.isAccepting = true;

    this.courseService.createOffer(this.selectedCourse.id, 0.01, 'Contact initial').subscribe({
      next: (res: any) => {
        this.isAccepting = false;
        this.modalOpen.set(false);
        this.toast.success('Mission acceptée. Vous pouvez échanger avec le client.');
        const chatRoomId = res?.chatRoomId;
        if (chatRoomId) {
          this.router.navigate(['/chat', chatRoomId]);
        }
      },
      error: (err: any) => {
        this.isAccepting = false;
        this.toast.error(err.error?.message || 'Impossible d\'accepter cette mission.');
      }
    });
  }
}
