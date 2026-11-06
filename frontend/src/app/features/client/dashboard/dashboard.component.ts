import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { courseStatus } from '../../../shared/status/course-status';
import { EmptyStateComponent } from '../../../shared/state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/state/error-state.component';
import { SkeletonComponent } from '../../../shared/state/skeleton.component';

import {
  LucidePlus,
  LucidePackageOpen,
  LucideCircleCheckBig,
  LucideStar,
  LucideMessageCircle,
  LucideArrowUpRight,
  LucideArrowRight,
  LucideSparkles,
  LucideMessagesSquare,
} from '@lucide/angular';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    LucidePlus,
    LucidePackageOpen,
    LucideCircleCheckBig,
    LucideStar,
    LucideMessageCircle,
    LucideArrowUpRight,
    LucideArrowRight,
    LucideSparkles,
    LucideMessagesSquare,
  ],
  template: `

      <!-- ── En-tête de page ── -->
      <section class="page-head">
        <div>
          <h1>Bonjour {{ firstName }},</h1>
          <p>Voici le point sur vos courses et vos prochaines étapes.</p>
        </div>
        <a routerLink="/client/create-course" class="primary-action">
          <svg lucidePlus size="14"></svg> Créer une course
        </a>
      </section>

      <!-- ── Notice ── -->
      <div class="app-notice">
        <svg lucideSparkles size="16"></svg>
        <div>
          <strong>Votre famille est à portée de main.</strong>
          <span> Commandez une course pour un proche au Cameroun et suivez sa réalisation depuis votre espace.</span>
        </div>
      </div>

      <!-- ── Métriques ── -->
      <section class="metrics-grid" aria-label="Résumé de votre activité">

        <article class="metric-card">
          <span class="metric-icon"><svg lucidePackageOpen size="20"></svg></span>
          <div>
            <span class="metric-label">Courses actives</span>
            <strong class="metric-value">{{ activeCourses.length.toString().padStart(2, '0') }}</strong>
            <div class="metric-note">
              <em>{{ inProgressCount }} en cours</em>
              @if (inProgressCount !== activeCourses.length) {
                · {{ activeCourses.length - inProgressCount }} à confirmer
              }
            </div>
          </div>
        </article>

        <article class="metric-card">
          <span class="metric-icon"><svg lucideCircleCheckBig size="20"></svg></span>
          <div>
            <span class="metric-label">Courses terminées</span>
            <strong class="metric-value">{{ completedCourses.length.toString().padStart(2, '0') }}</strong>
            <div class="metric-note">Depuis votre inscription</div>
          </div>
        </article>

        <article class="metric-card">
          <span class="metric-icon"><svg lucideStar size="20"></svg></span>
          <div>
            <span class="metric-label">Expérience moyenne</span>
            <strong class="metric-value">
              @if (averageRating !== null) {
                {{ averageRating | number:'1.1-1' }}
                <span style="font-size:13px;color:#839087;font-weight:600">/ 5</span>
              } @else {
                <span style="font-size:20px;color:#839087">—</span>
              }
            </strong>
            <div class="metric-note">Évaluation des coursiers</div>
          </div>
        </article>

      </section>

      <!-- ── Grille principale ── -->
      <div class="content-aside-grid">

        <!-- Panel : courses à suivre -->
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Courses à suivre</h2>
              <p>Les dernières mises à jour de vos commandes</p>
            </div>
            <a class="text-link" routerLink="/client/history">
              Tout l'historique <svg lucideArrowUpRight style="width:12px;vertical-align:-2px"></svg>
            </a>
          </div>

          <!-- TICK-077 : états chargement / erreur / vide partagés -->
          @if (loading) {
            <app-skeleton [lines]="3" />
          } @else if (loadError) {
            <app-error-state message="Impossible de charger vos courses." (retry)="loadCourses()" />
          } @else if (activeCourses.length === 0) {
            <app-empty-state title="Aucune course active pour le moment."
                             message="Décrivez votre besoin : des coursiers vérifiés vous répondent."
                             actionLabel="Créer ma première course" actionLink="/client/create-course" />
          }

          <!-- Liste des courses actives -->
          @for (course of activeCourses; track course.id) {
            <article class="row-item">
              <span class="row-icon">
                <svg lucidePackageOpen size="16"></svg>
              </span>

              <div class="row-body">
                <div class="row-title">{{ course.description }}</div>
                <div class="row-meta">
                  <span>{{ course.zone }}</span>
                  <span class="row-meta-dot"></span>
                  <span>{{ course.scheduledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>

              <div class="row-right">
                <!-- TICK-077 : badge et action suivante issus de courseStatus() -->
                <app-status-badge [status]="course.status" role="CLIENT" />

                <!-- Actions -->
                <div class="row-actions">
                  @if (nextAction(course); as action) {
                    <a [routerLink]="action.link" class="btn-row btn-row--green">{{ action.label }}</a>
                  }
                  <a [routerLink]="['/client/course-detail', course.id]"
                     class="btn-row btn-row--ghost">Détails</a>

                  @if (course.chatRoomId) {
                    <a [routerLink]="['/chat', course.chatRoomId]"
                       class="btn-row btn-row--green"
                       aria-label="Chat">
                      <svg lucideMessageCircle style="width:14px;height:14px"></svg> Chat
                    </a>
                  }
                </div>
              </div>
            </article>
          }

        </section>

        <!-- ── Aside ── -->
        <aside class="card-stack">

          <!-- CTA contextuel selon statut -->
          @if (proofsSubmittedCourse) {
            <article class="dark-card">
              <small>La prochaine étape</small>
              <h3 style="font-size:17px;line-height:1.25;letter-spacing:-.035em;margin:9px 0">
                Votre course attend votre validation
              </h3>
              <p>Les preuves pour "{{ proofsSubmittedCourse.description }}" sont disponibles. Consultez-les avant de confirmer.</p>
              <a class="primary-action primary-action--lime"
                 [routerLink]="['/client/course-detail', proofsSubmittedCourse.id]"
                 [queryParams]="{status: 'submitted'}">
                Examiner les preuves <svg lucideArrowRight size="14"></svg>
              </a>
            </article>
          } @else if (activeCourses.length === 0) {
            <article class="dark-card">
              <small>Par où commencer ?</small>
              <h3 style="font-size:17px;line-height:1.25;letter-spacing:-.035em;margin:9px 0">
                Créez votre première course
              </h3>
              <p>Décrivez votre besoin et choisissez un coursier de confiance en quelques clics.</p>
              <a class="primary-action primary-action--lime" routerLink="/client/create-course">
                Nouvelle course <svg lucideArrowRight size="14"></svg>
              </a>
            </article>
          } @else {
            <article class="dark-card">
              <small>Tout se passe bien</small>
              <h3 style="font-size:17px;line-height:1.25;letter-spacing:-.035em;margin:9px 0">
                {{ activeCourses.length }} course{{ activeCourses.length > 1 ? 's' : '' }} en cours
              </h3>
              <p>Suivez l'avancement en temps réel et discutez avec votre coursier via le chat.</p>
              <a class="primary-action primary-action--lime" routerLink="/client/create-course">
                Ajouter une course <svg lucideArrowRight size="14"></svg>
              </a>
            </article>
          }

          <!-- Aide -->
          <article class="panel" style="padding:17px">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:#304237;margin-bottom:9px">
              <svg lucideMessagesSquare style="width:16px;color:#538366"></svg>
              Besoin d'un coup de main ?
            </div>
            <p style="font-size:12px;line-height:1.55;color:#7f8a82;margin:0 0 13px">
              Notre centre d'aide répond aux questions sur les paiements, les courses et le suivi.
            </p>
            <a class="text-link" href="/support">Contacter le support →</a>
          </article>

        </aside>

      </div><!-- /content-aside-grid -->

  `,
})
export class ClientDashboardComponent implements OnInit {

  courses: any[] = [];
  loading = true;

  private courseService = inject(CourseService);
  private authService  = inject(AuthService);
  private router       = inject(Router);
  private toast        = inject(ToastService);

  // ─── Getters ─────────────────────────────────────────────────────────────

  get firstName(): string {
    const full = this.authService.getCurrentUserFullName().trim();
    if (full) return full.split(/\s+/)[0];
    // Fallback sur l'email (partie avant @) si fullName absent
    const email = this.authService.getCurrentUserEmail().trim();
    return email ? email.split('@')[0] : 'vous';
  }

  /** Courses actives = tout sauf COMPLETED et CANCELLED */
  get activeCourses(): any[] {
    return this.courses.filter(
      (c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
    );
  }

  get completedCourses(): any[] {
    return this.courses.filter((c) => c.status === 'COMPLETED');
  }

  get inProgressCount(): number {
    return this.courses.filter((c) => c.status === 'IN_PROGRESS').length;
  }

  /** Première course dont les preuves sont soumises (pour le CTA contextuel) */
  get proofsSubmittedCourse(): any | null {
    return this.courses.find((c) => c.status === 'PROOFS_SUBMITTED') ?? null;
  }

  /** Note moyenne — null jusqu'à l'implémentation du module reviews (TICK-033+) */
  get averageRating(): number | null {
    return null;
  }

  // ─── Helpers exposés au template ─────────────────────────────────────────

  /** Action suivante attendue du client (TICK-077). */
  nextAction(course: any) { return courseStatus(course, 'CLIENT').action; }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCourses();
  }

  /** Échec du chargement principal : état d'erreur avec « Réessayer » (TICK-077). */
  loadError = false;

  loadCourses(): void {
    this.loading = true;
    this.loadError = false;
    this.courseService.getMyCourses().subscribe({
      next: (data) => {
        this.courses = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = true;
        console.error(err);
      },
    });
  }
}
