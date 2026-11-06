import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CourseService, CourierSummary } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideArrowLeft,
  LucideSparkles,
  LucideStar,
  LucideCheckCircle,
  LucideMapPin,
  LucideShieldCheck,
  LucideMessageSquare,
  LucideLoader,
  LucideUsers,
} from '@lucide/angular';

@Component({
  selector: 'app-select-courier',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    LucideArrowLeft,
    LucideSparkles,
    LucideStar,
    LucideCheckCircle,
    LucideMapPin,
    LucideShieldCheck,
    LucideMessageSquare,
    LucideLoader,
    LucideUsers,
  ],
  styles: [`
    /* ── Indicateur d'étapes ── */
    .steps-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 28px;
    }
    .step-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: var(--cc-line-2);
      transition: all .2s;
    }
    .step-dot.active {
      background: var(--primary);
      width: 22px;
      border-radius: 5px;
    }
    .step-dot.done { background: var(--cc-success); }

    /* ── Carte coursier ── */
    .courier-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 16px);
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      transition: border-color .15s, box-shadow .15s;
    }
    .courier-card:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,.1));
    }
    .courier-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }
    .courier-avatar {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      flex-shrink: 0;
      letter-spacing: -0.02em;
    }
    .courier-details h3 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .courier-stats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .courier-stats span {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .courier-actions { flex-shrink: 0; }

    /* ── Liste ── */
    .courier-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── Titre de section ── */
    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
    }

    /* ── Barre d'action ── */
    .action-bar {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }
    .action-bar .btn { width: 100%; justify-content: center; }

    /* ── Badge vérifié ── */
    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
      background: var(--cc-success-bg);
      color: var(--cc-success);
    }

    /* ── État vide ── */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 16px);
    }
    .empty-state svg { color: var(--cc-line-2); margin-bottom: 12px; }
    .empty-state p { color: var(--text-muted); font-size: 0.9rem; }

    /* ── Spinner loading ── */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    @media (max-width: 640px) {
      .courier-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .courier-actions {
        width: 100%;
      }
      .courier-actions .btn {
        width: 100%;
        justify-content: center;
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  template: `

      <!-- En-tête de page -->
      <section class="page-head">
        <div>
          <h1>Choisir un coursier</h1>
          <p>{{ courseZone ? 'Basé sur votre zone : ' + courseZone : 'Coursiers disponibles dans votre zone' }}</p>
        </div>
        <a [routerLink]="['/client/create-course']" class="btn btn-secondary btn-sm">
          <svg lucideArrowLeft size="15"></svg> Retour
        </a>
      </section>

      <!-- Indicateur d'étapes -->
      <div class="steps-indicator">
        <div class="step-dot done"></div>
        <div class="step-dot active"></div>
        <div class="step-dot"></div>
      </div>

      <!-- Chargement -->
      @if (isLoading) {
        <div class="loading-state">
          <svg lucideLoader size="20" style="animation: spin 1s linear infinite;"></svg>
          Chargement des coursiers...
        </div>
      }

      <!-- Liste des coursiers -->
      @if (!isLoading) {
        @if (couriers.length > 0) {
          <!-- Titre section -->
          <div class="section-title-row">
            <h2 class="section-title">
              <svg lucideSparkles size="18" style="color: var(--cc-warning);"></svg>
              Recommandés pour vous
            </h2>
          </div>

          <div class="courier-list">
            @for (courier of couriers; track courier.id) {
              <div class="courier-card">
                <div class="courier-info">
                  <!-- Avatar initiales -->
                  <div class="courier-avatar">{{ courier.initials }}</div>

                  <div class="courier-details">
                    <h3>
                      {{ courier.fullName }}
                      @if (courier.kycVerified) {
                        <span class="badge-verified">
                          <svg lucideShieldCheck size="10"></svg> Vérifié
                        </span>
                      }
                    </h3>
                    <div class="courier-stats">
                      <!-- Note -->
                      <span style="color: var(--cc-warning); font-weight: 700;">
                        <svg lucideStar size="13" style="fill: currentColor;"></svg>
                        {{ courier.averageRating != null ? (courier.averageRating | number:'1.1-1') : '—' }}
                      </span>
                      <!-- Courses -->
                      <span>
                        <svg lucideCheckCircle size="13"></svg>
                        {{ courier.completedCourses }} course{{ courier.completedCourses !== 1 ? 's' : '' }}
                      </span>
                      <!-- Zone -->
                      <span>
                        <svg lucideMapPin size="13"></svg>
                        {{ courier.zone }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Action -->
                <div class="courier-actions">
                  <button
                    class="btn btn-primary btn-block"
                    [disabled]="choosingCourierId === courier.id"
                    (click)="chooseCourier(courier)"
                  >
                    @if (choosingCourierId === courier.id) {
                      <svg lucideLoader size="15" style="animation: spin 1s linear infinite; margin-right:4px;"></svg>
                      En cours...
                    } @else {
                      Choisir et discuter
                      <svg lucideMessageSquare size="15" style="margin-left:4px;"></svg>
                    }
                  </button>
                </div>
              </div>
            }
          </div>

          <div class="action-bar">
            <button class="btn btn-secondary" disabled>
              Voir tous les coursiers disponibles
            </button>
          </div>

        } @else {
          <!-- État vide -->
          <div class="empty-state">
            <svg lucideUsers size="48"></svg>
            <p>Aucun coursier disponible pour le moment.<br>Réessayez dans quelques instants.</p>
            <button class="btn btn-secondary" style="margin-top: 16px;" (click)="loadCouriers()">
              Actualiser
            </button>
          </div>
        }
      }

  `
})
export class SelectCourierComponent implements OnInit {

  courseId: number | null = null;
  courseZone = '';
  couriers: CourierSummary[] = [];
  isLoading = false;
  choosingCourierId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('courseId');
    this.courseId = id ? Number(id) : null;

    // Récupère la zone de la course pour l'afficher dans le sous-titre
    if (this.courseId) {
      this.courseService.getCourseById(this.courseId).subscribe({
        next: (course: any) => { this.courseZone = course?.zone ?? ''; },
        error: () => {}
      });
    }

    this.loadCouriers();
  }

  loadCouriers(): void {
    this.isLoading = true;
    this.courseService.getAvailableCouriers().subscribe({
      next: (list) => {
        this.couriers = list;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Impossible de charger la liste des coursiers.');
      }
    });
  }

  chooseCourier(courier: CourierSummary): void {
    if (!this.courseId) return;
    this.choosingCourierId = courier.id;

    // TICK-057 : ouvre la conversation sans créer d'offre fictive
    this.courseService.openConversation(this.courseId, courier.id).subscribe({
      next: (response) => {
        this.choosingCourierId = null;
        if (response?.chatRoomId) {
          this.router.navigate(['/chat', response.chatRoomId]);
        } else {
          this.toast.error('Impossible d\'ouvrir le chat. Veuillez réessayer.');
        }
      },
      error: (err: any) => {
        this.choosingCourierId = null;
        this.toast.error(err.error?.message || 'Impossible de contacter ce coursier.');
      }
    });
  }
}
