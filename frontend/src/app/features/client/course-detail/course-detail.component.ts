import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideArrowLeft,
  LucideActivity,
  LucideCamera,
  LucideReceipt,
  LucideAlertTriangle,
  LucideMessageSquare,
  LucideCheckCircle,
} from '@lucide/angular';

interface TimelineStep {
  key: string;
  label: string;
  sublabel?: string;
  state: 'done' | 'active' | 'pending';
}

/** Construit la timeline en fonction du statut de la course */
function buildTimeline(status: string, paidAt?: string, createdAt?: string): TimelineStep[] {
  const statuses = ['PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'PROOFS_SUBMITTED', 'COMPLETED'];
  // OVERDUE (TICK-065b) : même étape que IN_PROGRESS — payée, preuves attendues
  const idx = statuses.indexOf(status === 'OVERDUE' ? 'IN_PROGRESS' : status);

  return [
    {
      key: 'PUBLISHED',
      label: 'Commande créée',
      sublabel: createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : undefined,
      state: idx > 0 ? 'done' : idx === 0 ? 'active' : 'pending',
    },
    {
      key: 'ASSIGNED',
      label: 'En négociation avec le coursier',
      state: idx > 1 ? 'done' : idx === 1 ? 'active' : 'pending',
    },
    {
      key: 'IN_PROGRESS',
      label: 'Paiement sécurisé (Escrow)',
      sublabel: paidAt ? new Date(paidAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : undefined,
      state: idx > 2 ? 'done' : idx === 2 ? 'active' : 'pending',
    },
    {
      key: 'PROOFS_SUBMITTED',
      label: 'Preuves soumises',
      sublabel: idx < 3 ? 'En attente' : 'Le coursier a soumis ses preuves',
      state: idx > 3 ? 'done' : idx === 3 ? 'active' : 'pending',
    },
    {
      key: 'COMPLETED',
      label: 'Course validée',
      state: idx >= 4 ? 'done' : 'pending',
    },
  ];
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    NgClass,
    SlicePipe,
    AppShellComponent,
    LucideArrowLeft,
    LucideActivity,
    LucideCamera,
    LucideReceipt,
    LucideAlertTriangle,
    LucideMessageSquare,
    LucideCheckCircle,
  ],
  styles: [`
    /* ── Timeline ── */
    .timeline {
      position: relative;
      padding-left: 24px;
      margin-top: 4px;
    }
    .timeline::before {
      content: "";
      position: absolute;
      left: 6px; top: 8px; bottom: 0;
      width: 2px;
      background: var(--border, #e1e8e0);
    }
    .timeline-step {
      position: relative;
      margin-bottom: 22px;
    }
    .timeline-step:last-child { margin-bottom: 0; }
    .timeline-step::before {
      content: "";
      position: absolute;
      left: -24px; top: 4px;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: var(--bg-card, #fff);
      border: 2px solid var(--cc-line-2, #d1dad2);
      z-index: 1;
    }
    .timeline-step.done::before {
      background: var(--cc-success, #26845d);
      border-color: var(--cc-success, #26845d);
    }
    .timeline-step.active::before {
      background: var(--primary, #17634f);
      border-color: var(--primary, #17634f);
      box-shadow: 0 0 0 4px var(--primary-light, #e4f1e8);
    }
    .timeline-step h4 {
      font-size: .92rem;
      font-weight: 600;
      color: var(--text, #15241f);
      margin: 0 0 2px;
    }
    .timeline-step.pending h4 { color: var(--cc-muted, #6d7a71); }
    .timeline-step p {
      font-size: .8rem;
      color: var(--text-muted, #6d7a71);
      margin: 0;
    }

    /* ── Finances ── */
    .finance-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: .92rem;
      color: var(--cc-muted, #6d7a71);
    }
    .finance-row.total {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed var(--border, #e1e8e0);
      font-weight: 700;
      color: var(--text, #15241f);
      font-size: 1rem;
    }

    /* ── Action box ── */
    .action-box {
      background: var(--bg-card, #fff);
      border: 1px solid var(--primary, #17634f);
      border-radius: var(--radius-lg, 16px);
      padding: 24px;
      text-align: center;
      margin-top: 24px;
    }
    .action-box h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text, #15241f);
      margin: 0 0 6px;
    }
    .action-box p {
      font-size: .88rem;
      color: var(--cc-muted, #6d7a71);
      margin: 0 0 16px;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    @media (max-width: 640px) {
      .action-buttons { flex-direction: column; }
      .action-buttons .btn { width: 100%; }
    }
  `],
  template: `
    <app-shell pageTitle="Détail course" [narrow]="true">

      <!-- En-tête -->
      <section class="page-head">
        <div>
          <h1>{{ course?.description ? (course.description | slice:0:40) + (course.description.length > 40 ? '…' : '') : 'Chargement…' }}</h1>
          <p>Course #{{ courseId }}</p>
        </div>
        <a routerLink="/client/dashboard" class="btn btn-secondary btn-sm">
          <svg lucideArrowLeft size="15"></svg> Retour
        </a>
      </section>

      @if (isLoading) {
        <div style="text-align:center;padding:48px;color:var(--cc-muted)">Chargement…</div>
      }

      @if (!isLoading && course) {

        <!-- ── Timeline ── -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;color:var(--text,#15241f);margin-bottom:16px">
            <svg lucideActivity size="17" style="color:var(--primary,#17634f)"></svg>
            Suivi de la course
          </div>
          <div class="timeline">
            @for (step of timeline; track step.key) {
              <div class="timeline-step" [ngClass]="step.state">
                <h4>{{ step.label }}</h4>
                @if (step.sublabel) { <p>{{ step.sublabel }}</p> }
              </div>
            }
          </div>
        </div>

        <!-- ── Preuves soumises ── -->
        @if (course.status === 'PROOFS_SUBMITTED') {
          <div class="card" style="margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;color:var(--text,#15241f);margin-bottom:10px">
              <svg lucideCamera size="17" style="color:var(--primary,#17634f)"></svg>
              Preuves de la course
              <span class="status-badge status-badge--success" style="margin-left:auto;font-size:.7rem">Soumises</span>
            </div>
            <p style="font-size:.85rem;color:var(--cc-muted);margin-bottom:14px">
              Le coursier a soumis ses preuves. Vérifiez-les avant de valider.
            </p>
            <a [routerLink]="['/client/validate', courseId]" class="btn btn-primary" style="width:100%;justify-content:center">
              <svg lucideCheckCircle size="17"></svg> Voir les preuves et valider
            </a>
          </div>
        } @else if (course.status === 'OVERDUE') {
          <!-- ── TICK-065b : le coursier n'a pas soumis ses preuves à temps ── -->
          <div class="card" style="margin-bottom:20px;border-color:var(--danger,#dc2626)">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;color:var(--text,#15241f);margin-bottom:10px">
              <svg lucideAlertTriangle size="17" style="color:var(--danger,#dc2626)"></svg>
              Le coursier est en retard
              <span class="status-badge status-badge--danger" style="margin-left:auto;font-size:.7rem">En retard</span>
            </div>
            <p style="font-size:.85rem;color:var(--cc-muted);margin-bottom:6px">
              L'échéance du {{ course.proofDeadline | date:'dd/MM à HH:mm' }} est dépassée sans preuves.
              Vos fonds restent bloqués en séquestre : rien n'est versé au coursier sans preuves.
            </p>
            @if (autoDecisionAt()) {
              <p style="font-size:.8rem;color:var(--cc-muted);margin-bottom:14px">
                Sans choix de votre part avant le {{ autoDecisionAt() | date:'dd/MM à HH:mm' }}, vous serez remboursé automatiquement
                (ou un administrateur tranchera si le coursier a déjà déposé des preuves ou engagé des achats).
              </p>
            }
            <div style="display:flex;flex-direction:column;gap:10px">
              @if (extensionsLeft() > 0) {
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                  <button class="btn btn-secondary" style="flex:1 1 140px;min-height:48px" [disabled]="acting" (click)="extend(12)">
                    Prolonger de 12 h
                  </button>
                  <button class="btn btn-secondary" style="flex:1 1 140px;min-height:48px" [disabled]="acting" (click)="extend(24)">
                    Prolonger de 24 h
                  </button>
                </div>
                <p style="font-size:.75rem;color:var(--cc-muted);margin:0">{{ extensionsLeft() }} prolongation(s) restante(s).</p>
              }
              <button class="btn btn-primary" style="min-height:48px;justify-content:center" [disabled]="acting" (click)="cancelOverdue()">
                Annuler et être remboursé
              </button>
              <a [routerLink]="['/client/dispute-form', courseId]" class="btn btn-ghost" style="min-height:48px;justify-content:center">
                Ouvrir un litige
              </a>
            </div>
          </div>
        } @else if (course.status === 'IN_PROGRESS' || course.status === 'ASSIGNED') {
          <!-- ── En attente de preuves ── -->
          <div class="card" style="margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;color:var(--text,#15241f);margin-bottom:10px">
              <svg lucideCamera size="17" style="color:var(--primary,#17634f)"></svg>
              Preuves de la course
              <span class="status-badge status-badge--warning" style="margin-left:auto;font-size:.7rem">En attente</span>
            </div>
            <p style="font-size:.85rem;color:var(--cc-muted)">
              Le coursier n'a pas encore soumis de preuves. Vous serez notifié dès qu'elles seront disponibles.
            </p>
            @if (course.status === 'IN_PROGRESS' && course.proofDeadline) {
              <p style="font-size:.85rem;margin-top:8px">
                Échéance des preuves : <strong>{{ course.proofDeadline | date:'dd/MM à HH:mm' }}</strong>
                ({{ timeLeft(course.proofDeadline) }})
              </p>
            }
          </div>
        }

        @if (course.reviewDue) {
          <!-- TICK-073 : notation due -->
          <div class="card" style="margin-bottom:20px">
            <p style="margin:0 0 12px;font-weight:600">Course terminée : notez {{ course.courierName || 'votre coursier' }}.</p>
            <a [routerLink]="['/client/rate', courseId]" class="btn btn-primary" style="width:100%;justify-content:center;min-height:48px">
              ★ Noter le coursier
            </a>
          </div>
        }

        <!-- ── Finances ── -->
        @if (course.totalAmount) {
          <div class="card" style="margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:.95rem;color:var(--text,#15241f);margin-bottom:14px">
              <svg lucideReceipt size="17" style="color:var(--primary,#17634f)"></svg>
              Détails financiers
            </div>
            @if (course.courierName) {
              <div class="finance-row">
                <span>Coursier :</span>
                <span>{{ course.courierName }}</span>
              </div>
            }
            <div class="finance-row">
              <span>Tarif du coursier :</span>
              <span>{{ course.courseAmount | number:'1.0-0' }} XAF</span>
            </div>
            @if (course.realCosts > 0) {
              <div class="finance-row">
                <span>Achats avancés par le coursier :</span>
                <span>{{ course.realCosts | number:'1.0-0' }} XAF</span>
              </div>
            }
            <div class="finance-row">
              <span>Frais de service ({{ course.commissionRate | number:'1.0-0' }}%) :</span>
              <span>{{ course.commissionAmount | number:'1.0-0' }} XAF</span>
            </div>
            <div class="finance-row total">
              <span>Total payé :</span>
              <span>{{ course.totalAmount | number:'1.0-0' }} XAF</span>
            </div>
            @if (course.paidAt) {
              <p style="font-size:.78rem;color:var(--cc-muted);margin:8px 0 0">
                Payé le {{ course.paidAt | date:'dd/MM/yyyy à HH:mm' }}
              </p>
            }
          </div>
        }

        <!-- ── Bouton Chat ── -->
        @if (course.chatRoomId) {
          <div style="margin-bottom:20px">
            <a [routerLink]="['/chat', course.chatRoomId]" class="btn btn-secondary" style="width:100%;justify-content:center">
              <svg lucideMessageSquare size="16"></svg> Ouvrir le chat
            </a>
          </div>
        }

        <!-- ── Action litige ── -->
        <div class="action-box">
          <h3>Un problème avec cette course ?</h3>
          <p>Si vous rencontrez un souci (retard, preuves non conformes, etc.), vous pouvez ouvrir un litige.</p>
          <div class="action-buttons">
            <button class="btn btn-danger" disabled title="Disponible au Sprint 5">
              <svg lucideAlertTriangle size="17"></svg> Signaler un problème
            </button>
          </div>
        </div>

      }
    </app-shell>
  `
})
export class CourseDetailComponent implements OnInit {
  courseId = 0;
  course: any = null;
  timeline: TimelineStep[] = [];
  isLoading = false;
  acting = false;

  /** Paramètres serveur (TICK-065b) — aucune valeur codée en dur. */
  private maxExtensions = 0;
  private overdueGraceHours = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toast: ToastService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (p) => {
        this.maxExtensions = Number(p.maxExtensions ?? 0);
        this.overdueGraceHours = Number(p.overdueGraceHours ?? 0);
      },
      error: () => {},
    });
    this.loadCourse();
  }

  // ── TICK-065b : course en retard ──────────────────────────────────────────

  extensionsLeft(): number {
    return Math.max(0, this.maxExtensions - Number(this.course?.extensionCount ?? 0));
  }

  /** Date de la décision automatique (remboursement ou litige) si le client ne choisit pas. */
  autoDecisionAt(): Date | null {
    if (!this.course?.overdueSince || !this.overdueGraceHours) return null;
    return new Date(new Date(this.course.overdueSince).getTime() + this.overdueGraceHours * 3_600_000);
  }

  timeLeft(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'dépassée';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? 'dans ' + h + ' h ' + m + ' min' : 'dans ' + m + ' min';
  }

  extend(hours: 12 | 24): void {
    this.acting = true;
    this.http.post<any>('/api/courses/' + this.courseId + '/extend', { hours }).subscribe({
      next: () => {
        this.acting = false;
        this.toast.success('Délai prolongé de ' + hours + ' h. Le coursier a été prévenu.');
        this.loadCourse();
      },
      error: (err) => {
        this.acting = false;
        this.toast.error(err?.error?.message ?? 'Impossible de prolonger le délai.');
      },
    });
  }

  cancelOverdue(): void {
    if (!window.confirm('Annuler la course et être remboursé ? Cette action est définitive.')) return;
    this.acting = true;
    this.http.post<any>('/api/courses/' + this.courseId + '/cancel-overdue', {}).subscribe({
      next: () => {
        this.acting = false;
        this.toast.success('Course annulée : vous allez être remboursé.');
        this.loadCourse();
      },
      error: (err) => {
        this.acting = false;
        this.toast.error(err?.error?.message ?? "Impossible d'annuler la course.");
      },
    });
  }

  loadCourse(): void {
    this.isLoading = true;
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (c: any) => {
        this.course = c;
        this.timeline = buildTimeline(c.status, c.paidAt, c.createdAt);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Impossible de charger les détails de la course.');
        this.router.navigate(['/client/dashboard']);
      }
    });
  }
}
