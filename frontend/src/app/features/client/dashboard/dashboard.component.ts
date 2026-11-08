import { ChatUnreadService } from '../../../core/services/chat-unread.service';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { warnLoadFailed } from '../../../shared/state/load-error';
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
  LucideMessagesSquare,
  LucideShieldCheck,
} from '@lucide/angular';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
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
    LucideMessagesSquare,
    LucideShieldCheck,
  ],
  styles: [`
    :host { display: block; --dash-muted: #56635c; }
    :host-context([data-theme="dark"]) { --dash-muted: #B0C0B7; }
    .dash-head p { color: var(--dash-muted); }
    .metric-unit { font-size: 13px; color: var(--dash-muted); font-weight: 600; }
    .metric-none { font-size: 15px; font-weight: 700; letter-spacing: -.02em; }
    .text-link { white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; }
    /* Course ouverte : des coursiers ont écrit (indice à côté de « Voir les coursiers ») */
    .row-wrote { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 3px 9px; border-radius: 99px;
      font-size: 12px; font-weight: 700; background: var(--cc-success-bg); color: var(--cc-success); animation: wrote-in .35s cubic-bezier(.16,1,.3,1) both; }
    .row-wrote.hot { background: var(--cc-danger-bg); color: var(--cc-danger); }
    :host-context([data-theme="dark"]) .row-wrote { background: rgba(159,221,180,.1); color: #9FDDB4; }
    :host-context([data-theme="dark"]) .row-wrote.hot { background: rgba(240,163,156,.12); color: #F0A39C; }
    @keyframes wrote-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .row-wrote { animation: none; } }

    /* Une course attend le client : l'action principale de l'écran */
    .dash-alert {
      display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 18px 20px; border-radius: 14px;
      background: var(--cc-forest); color: #fff; box-shadow: 0 14px 34px rgba(18,59,50,.18);
    }
    .dash-alert-icon { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
      background: rgba(215,237,154,.16); color: var(--cc-lime); }
    .dash-alert-body { flex: 1; min-width: 0; }
    .dash-alert-body strong { display: block; font-size: 15px; letter-spacing: -.02em; }
    .dash-alert-body span { display: block; margin-top: 2px; font-size: 13px; color: #cfdcd4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Rappel du séquestre */
    .escrow-steps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; counter-reset: step; }
    .escrow-steps li { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: start; font-size: 13px; line-height: 1.45; color: #d6e2da; }
    .escrow-steps li::before { counter-increment: step; content: counter(step); width: 26px; height: 26px; border-radius: 8px;
      display: grid; place-items: center; background: rgba(215,237,154,.14); color: var(--cc-lime); font-weight: 800; font-size: 12px; }
    .escrow-steps b { color: #fff; font-weight: 700; }
    .dark-card h3 { font-size: 17px; line-height: 1.25; letter-spacing: -.035em; margin: 0; color: #fff; }

    .help-card { padding: 17px; }
    .help-title { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-weight: 700; font-size: 14px; color: var(--cc-ink); }
    .help-title svg { color: var(--primary); }
    .help-card p { margin: 0 0 6px; font-size: 13px; line-height: 1.55; color: var(--dash-muted); }
    :host-context([data-theme="dark"]) .help-title { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .help-card p, :host-context([data-theme="dark"]) .dash-head p { color: #B0C0B7 !important; }

    /* Entrée : l'en-tête puis les blocs, dans l'ordre de lecture */
    .dash-in { animation: dash-rise .5s cubic-bezier(.16,1,.3,1) both; }
    .dash-in:nth-child(2) { animation-delay: .05s; } .dash-in:nth-child(3) { animation-delay: .1s; }
    .dash-in:nth-child(4) { animation-delay: .15s; } .dash-in:nth-child(5) { animation-delay: .2s; }
    .row-item { animation: dash-rise .4s cubic-bezier(.16,1,.3,1) both; }
    @keyframes dash-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

    /* Mobile : résumé compact sur une ligne, l'action d'abord */
    @media (max-width: 767.98px) {
      .metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px; margin-bottom: 18px; }
      .metric-card { padding: 12px 10px; display: block; text-align: center; }
      .metric-card .metric-icon, .metric-card .metric-note { display: none; }
      .metric-card .metric-label { font-size: 12px; line-height: 1.25; }
      .metric-card .metric-value { font-size: 22px; margin-top: 4px; }
      .metric-none { font-size: 13px; }
      .dash-alert { flex-wrap: wrap; }
      .dash-alert .primary-action { width: 100%; justify-content: center; }
      .dash-head .primary-action { width: 100%; justify-content: center; margin-top: 4px; }
    }
    @media (prefers-reduced-motion: reduce) { .dash-in, .row-item { animation: none; } }
  `],
  template: `
      <section class="page-head dash-head dash-in">
        <div>
          <h1>Bonjour {{ firstName }},</h1>
          <p>
            @if (loading) { Chargement de vos courses… }
            @else if (proofsSubmittedCourse) { Une course attend votre validation. }
            @else if (activeCourses.length > 0) { Voici où en sont vos courses. }
            @else { Confiez votre première course : des coursiers vérifiés vous répondent. }
          </p>
        </div>
        @if (!loading && activeCourses.length > 0 && !proofsSubmittedCourse) {
          <a routerLink="/client/create-course" class="primary-action">
            <svg lucidePlus size="14"></svg> Nouvelle course
          </a>
        }
      </section>

      @if (proofsSubmittedCourse; as c) {
        <section class="dash-alert dash-in" aria-label="Action attendue">
          <span class="dash-alert-icon"><svg lucideShieldCheck size="20"></svg></span>
          <div class="dash-alert-body">
            <strong>Preuves reçues : à vous de valider</strong>
            <span>« {{ c.description }} » — l’argent reste bloqué tant que vous n’avez pas validé.</span>
          </div>
          <a class="primary-action primary-action--lime" [routerLink]="['/client/course-detail', c.id]" [queryParams]="{ status: 'submitted' }">
            Examiner les preuves <svg lucideArrowRight size="14"></svg>
          </a>
        </section>
      }

      @if (!loading && courses.length > 0) {
      <section class="metrics-grid dash-in" aria-label="Résumé de votre activité">
        <article class="metric-card">
          <span class="metric-icon"><svg lucidePackageOpen size="20"></svg></span>
          <div>
            <span class="metric-label">Courses actives</span>
            <strong class="metric-value">{{ activeCourses.length }}</strong>
            <div class="metric-note">
              @if (activeCourses.length === 0) { Aucune pour l’instant }
              @else {
                <em>{{ inProgressCount }} en cours</em>
                @if (inProgressCount !== activeCourses.length) { · {{ activeCourses.length - inProgressCount }} à suivre }
              }
            </div>
          </div>
        </article>

        <article class="metric-card">
          <span class="metric-icon"><svg lucideCircleCheckBig size="20"></svg></span>
          <div>
            <span class="metric-label">Terminées</span>
            <strong class="metric-value">{{ completedCourses.length }}</strong>
            <div class="metric-note">Depuis votre inscription</div>
          </div>
        </article>

        <article class="metric-card">
          <span class="metric-icon"><svg lucideStar size="20"></svg></span>
          <div>
            <span class="metric-label">Votre note</span>
            <!-- TICK-078 : note réelle donnée par les coursiers, affichée seulement s'il y a des avis -->
            <strong class="metric-value">
              @if (reviewCount > 0) {
                {{ ratingLabel }} <span class="metric-unit">/ 5</span>
              } @else {
                <span class="metric-none">—</span>
              }
            </strong>
            <div class="metric-note">{{ reviewCount > 0 ? 'Sur ' + reviewCount + ' avis de coursiers' : 'Pas encore d’avis' }}</div>
          </div>
        </article>
      </section>
      }

      <div class="content-aside-grid dash-in">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Courses à suivre</h2>
              <p>Les dernières mises à jour de vos commandes</p>
            </div>
            <a class="text-link" routerLink="/client/history">
              Historique <svg lucideArrowUpRight size="13"></svg>
            </a>
          </div>

          <!-- TICK-077 : états chargement / erreur / vide partagés -->
          @if (loading) {
            <app-skeleton [lines]="3" />
          } @else if (loadError) {
            <app-error-state message="Impossible de charger vos courses." (retry)="loadCourses()" />
          } @else if (activeCourses.length === 0) {
            <app-empty-state title="Aucune course en cours"
                             message="Décrivez ce qu’il faut faire, où et quand : des coursiers vérifiés vous proposent leur tarif."
                             actionLabel="Créer ma première course" actionLink="/client/create-course" />
          }

          @for (course of activeCourses; track course.id; let i = $index) {
            <article class="row-item" [style.animation-delay.ms]="120 + i * 40">
              <span class="row-icon"><svg lucidePackageOpen size="16"></svg></span>
              <div class="row-body">
                <div class="row-title">{{ course.description }}</div>
                <div class="row-meta">
                  <span>{{ course.zone }}</span>
                  <span class="row-meta-dot"></span>
                  <span>{{ course.scheduledAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <!-- Seulement s'il y a du nouveau : messages de coursiers pas encore lus -->
                @if (course.status === 'PUBLISHED' && unread.sum(course.conversationRoomIds); as n) {
                  <div class="row-wrote hot">
                    <svg lucideMessageCircle size="13"></svg>
                    {{ n }} nouveau{{ n > 1 ? 'x' : '' }} message{{ n > 1 ? 's' : '' }} de {{ unread.roomsWithUnread(course.conversationRoomIds) }} coursier{{ unread.roomsWithUnread(course.conversationRoomIds) > 1 ? 's' : '' }}
                  </div>
                }
              </div>
              <div class="row-right">
                <!-- TICK-077 : badge et action suivante issus de courseStatus() -->
                <app-status-badge [status]="course.status" role="CLIENT" />
                <div class="row-actions">
                  @if (nextAction(course); as action) {
                    @if (course.status === 'PUBLISHED' && unread.sum(course.conversationRoomIds); as n) {
                      <a [routerLink]="action.link" class="btn-row btn-row--green has-dot" [attr.aria-label]="action.label + ' : ' + n + ' message(s) non lu(s) de coursiers'">
                        {{ action.label }} <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span></a>
                    } @else {
                      <a [routerLink]="action.link" class="btn-row btn-row--green">{{ action.label }}</a>
                    }
                  }
                  <a [routerLink]="['/client/course-detail', course.id]" class="btn-row btn-row--ghost">Détails</a>
                  @if (course.chatRoomId) {
                    <a [routerLink]="['/chat', course.chatRoomId]" class="btn-row btn-row--green has-dot"
                       [attr.aria-label]="unread.count(course.chatRoomId) ? 'Chat : ' + unread.count(course.chatRoomId) + ' message(s) non lu(s)' : 'Ouvrir le chat de la course'">
                      <svg lucideMessageCircle size="14"></svg> Chat
                      @if (unread.count(course.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }
                    </a>
                  }
                </div>
              </div>
            </article>
          }
        </section>

        <aside class="card-stack">
          <article class="dark-card">
            <h3>Votre argent est protégé</h3>
            <ol class="escrow-steps">
              <li><span>Vous payez : <b>les fonds sont bloqués</b>, pas versés.</span></li>
              <li><span>Le coursier réalise la course et <b>envoie ses preuves</b>.</span></li>
              <li><span>Vous vérifiez, puis <b>vous validez</b> : il est payé. Un souci ? Ouvrez un litige.</span></li>
            </ol>
          </article>

          <article class="panel help-card">
            <h3 class="help-title"><svg lucideMessagesSquare size="16"></svg> Besoin d’un coup de main ?</h3>
            <p>Le centre d’aide répond aux questions sur les paiements, les courses et le suivi.</p>
            <a class="text-link" routerLink="/support">Contacter le support <svg lucideArrowRight size="13"></svg></a>
          </article>
        </aside>
      </div>
  `,
})
export class ClientDashboardComponent implements OnInit {
  readonly unread = inject(ChatUnreadService);
  /** Pastilles de messages non lus : rafraîchies toutes les 30 s tant que l'écran est ouvert. */
  private readonly unreadTimer = (() => {
    const id = setInterval(() => this.unread.refresh(), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
    return id;
  })();

  courses: any[] = [];
  loading = true;

  private courseService = inject(CourseService);
  private http = inject(HttpClient);
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

  /** Note au format français (4,7). */
  get ratingLabel(): string { return this.trustScore.toFixed(1).replace('.', ','); }

  /** TICK-078 : note réelle du client (moyenne des avis des coursiers) et nombre d'avis. */
  trustScore = 0;
  reviewCount = 0;

  // ─── Helpers exposés au template ─────────────────────────────────────────

  /** Action suivante attendue du client (TICK-077). */
  nextAction(course: any) { return courseStatus(course, 'CLIENT').action; }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.unread.refresh(true);
    this.loadCourses();
    this.http.get<any>('/api/users/me').subscribe({
      next: (p) => { this.trustScore = Number(p.trustScore ?? 0); this.reviewCount = Number(p.reviewCount ?? 0); },
      error: warnLoadFailed('profil client (note)', "« Pas encore d'avis » affiché"),
    });
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
