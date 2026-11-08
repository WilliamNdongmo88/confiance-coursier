import { warnLoadFailed } from '../../../shared/state/load-error';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseConversation, CourseService, CourierSummary } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatUnreadService } from '../../../core/services/chat-unread.service';
import {
  LucideArrowRight, LucideBadgeCheck, LucideCalendarDays, LucideCheckCircle, LucideMail, LucideMapPin,
  LucideMessageCircle, LucideRefreshCw, LucideStar, LucideUsers,
} from '@lucide/angular';

type Conversation = CourseConversation;

/**
 * Choix du coursier (base maquette-v2/client/select-courier.html).
 * En tête : les coursiers qui ont déjà écrit (pastille de messages non lus), puis les coursiers disponibles.
 * Rien de factice : pas de « recommandés » inventés ni de bouton inactif ; la note n'apparaît que si elle existe.
 */
@Component({
  selector: 'app-select-courier',
  standalone: true,
  imports: [
    RouterLink, LucideArrowRight, LucideBadgeCheck, LucideCalendarDays, LucideCheckCircle, LucideMail, LucideMapPin,
    LucideMessageCircle, LucideRefreshCw, LucideStar, LucideUsers,
  ],
  styles: [`
    :host { display: block; --sc-muted: #56635c; }
    :host-context([data-theme="dark"]) { --sc-muted: #B0C0B7; }
    .sc { max-width: 860px; margin: 0 auto; }
    .sc-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .sc-course { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 18px; font-size: 14px; color: var(--sc-muted); }
    .sc-course span { display: inline-flex; align-items: center; gap: 5px; }
    .sc-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 26px; padding: 0; list-style: none; counter-reset: s; }
    .sc-steps li { display: flex; gap: 9px; align-items: flex-start; padding: 12px; border-radius: 12px; background: var(--cc-paper-2);
      font-size: 13px; line-height: 1.4; color: var(--cc-ink); }
    .sc-steps li::before { counter-increment: s; content: counter(s); flex: none; width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center;
      background: var(--primary); color: #fff; font-size: 12px; font-weight: 800; }
    .sc-h2 { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
    .sc-h2 h2 { margin: 0; font-size: 18px; letter-spacing: -.03em; font-weight: 750; color: var(--cc-ink); }
    .sc-h2 small { font-size: 13px; color: var(--sc-muted); }
    .sc-list { display: grid; gap: 10px; margin-bottom: 28px; }
    .card-c { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 14px; background: var(--cc-white);
      border: 1px solid var(--cc-line); animation: sc-in .45s cubic-bezier(.16,1,.3,1) both; transition: border-color .18s, box-shadow .18s; }
    .card-c:hover { border-color: color-mix(in oklab, var(--primary) 40%, var(--cc-line)); box-shadow: 0 8px 22px rgba(18,59,50,.07); }
    .card-c.wrote { border-color: color-mix(in oklab, var(--primary) 45%, var(--cc-line)); background: color-mix(in oklab, var(--primary) 5%, var(--cc-white)); }
    .av { flex: none; width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--cc-paper-2);
      color: var(--primary); font-weight: 800; font-size: 16px; letter-spacing: -.02em; }
    .who { flex: 1; min-width: 0; }
    .who h3 { margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 15.5px; font-weight: 750; color: var(--cc-ink); }
    .ok { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 99px; background: var(--cc-success-bg);
      color: var(--cc-success); font-size: 11.5px; font-weight: 750; }
    .stats { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 5px; font-size: 13px; color: var(--sc-muted); }
    .stats span { display: inline-flex; align-items: center; gap: 4px; }
    .stats .star { color: #a2671b; font-weight: 700; }
    .go { flex: none; min-height: 44px; }
    .offer { flex: none; display: grid; justify-items: end; gap: 1px; padding: 6px 12px; border-radius: 12px; background: var(--cc-success-bg); text-align: right; animation: sc-pop .35s cubic-bezier(.16,1,.3,1) both; }
    .offer small { font-size: 11.5px; font-weight: 700; color: var(--sc-muted); }
    .offer b { font-size: 17px; font-weight: 800; letter-spacing: -.02em; color: var(--cc-success); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .offer.none { background: var(--cc-paper-2); }
    .offer.none span { font-size: 12.5px; font-weight: 650; color: var(--sc-muted); white-space: nowrap; }
    .stats .new { color: var(--cc-danger); font-weight: 700; }
    @keyframes sc-pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
    .sk { height: 82px; border-radius: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2));
      background-size: 200% 100%; animation: sc-sk 1.2s linear infinite; }
    .empty { text-align: center; padding: 30px 18px; border-radius: 14px; border: 1px dashed var(--cc-line); color: var(--sc-muted); }
    .empty svg { color: var(--primary); margin-bottom: 8px; }
    .empty p { margin: 0 auto 6px; max-width: 46ch; line-height: 1.55; }
    .empty .mail { display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 14px; color: var(--cc-ink); font-weight: 600; }
    .btn-soft { min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    @keyframes sc-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes sc-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .sc-head h1, :host-context([data-theme="dark"]) .who h3,
    :host-context([data-theme="dark"]) .sc-h2 h2 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .av { background: rgba(215,237,154,.12); color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .sc-steps li::before { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .stats .star { color: #E3A857; }
    :host-context([data-theme="dark"]) .offer { background: rgba(159,221,180,.1); }
    :host-context([data-theme="dark"]) .offer b { color: #9FDDB4; }
    :host-context([data-theme="dark"]) .offer.none { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .stats .new { color: #F0A39C; }
    @media (max-width: 640px) {
      .sc-steps { grid-template-columns: 1fr; }
      .card-c { flex-wrap: wrap; }
      .go { width: 100%; justify-content: center; }
      .offer { order: 3; flex: 1 1 100%; grid-auto-flow: column; justify-content: space-between; align-items: center; text-align: left; }
      .card-c .go { order: 4; }
    }
    @media (prefers-reduced-motion: reduce) { .card-c, .sk, .offer { animation: none; } }
  `],
  template: `
    <div class="sc">
      <section class="sc-head">
        <h1>Choisir un coursier</h1>
        @if (course(); as c) {
          <div class="sc-course">
            <span><svg lucideMapPin size="14"></svg> {{ c.zone }}</span>
            @if (c.scheduledAt) { <span><svg lucideCalendarDays size="14"></svg> {{ when(c.scheduledAt) }}</span> }
          </div>
        }
      </section>

      <ol class="sc-steps" aria-label="Comment ça se passe">
        <li>Discutez avec un ou plusieurs coursiers : ils vous proposent leur tarif.</li>
        <li>Acceptez l’offre qui vous convient, directement dans le chat.</li>
        <li>Payez : l’argent reste bloqué jusqu’à votre validation des preuves.</li>
      </ol>

      @if (conversations().length > 0) {
        <div class="sc-h2"><h2>Ils vous ont écrit</h2><small>{{ conversations().length }} coursier{{ conversations().length > 1 ? 's' : '' }}@if (offerCount()) { · {{ offerCount() }} offre{{ offerCount() > 1 ? 's' : '' }} }</small></div>
        <div class="sc-list">
          @for (cv of conversations(); track cv.chatRoomId; let i = $index) {
            <article class="card-c wrote" [style.animation-delay.ms]="i * 50">
              <span class="av" aria-hidden="true">{{ initialsOf(cv.courierName) }}</span>
              <div class="who">
                <h3>{{ cv.courierName }}
                  @if (cv.verified) { <span class="ok"><svg lucideBadgeCheck size="12"></svg> Vérifié</span> }
                </h3>
                <div class="stats">
                  @if (cv.trustScore && cv.trustScore > 0) { <span class="star"><svg lucideStar size="13"></svg> {{ rating(+cv.trustScore) }}</span> }
                  <span [class.new]="unread.count(cv.chatRoomId)">{{ unread.count(cv.chatRoomId) ? 'Nouveau message' : 'Conversation en cours' }}</span>
                </div>
              </div>
              <div class="offer" [class.none]="!hasOffer(cv)">
                @if (hasOffer(cv)) { <small>Propose</small><b>{{ xaf(cv.offerAmount!) }}</b> }
                @else { <small>Tarif</small><span>Pas encore proposé</span> }
              </div>
              <a class="primary-action go has-dot" [routerLink]="['/chat', cv.chatRoomId]"
                 [attr.aria-label]="'Ouvrir la discussion avec ' + cv.courierName + (unread.count(cv.chatRoomId) ? ', ' + unread.count(cv.chatRoomId) + ' message(s) non lu(s)' : '')">
                <svg lucideMessageCircle size="15"></svg> Ouvrir la discussion
                @if (unread.count(cv.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }
              </a>
            </article>
          }
        </div>
      }

      <div class="sc-h2"><h2>Coursiers disponibles</h2>
        @if (!isLoading && others().length > 0) { <small>Identité vérifiée</small> }
      </div>

      @if (isLoading) {
        <div class="sc-list" aria-busy="true"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      } @else if (others().length === 0) {
        <div class="empty" role="status">
          <svg lucideUsers size="34"></svg>
          <p>{{ conversations().length ? 'Aucun autre coursier disponible pour le moment.' : 'Aucun coursier disponible pour le moment.' }}</p>
          <p>Votre course reste publiée : les coursiers de la zone peuvent vous écrire.</p>
          <span class="mail"><svg lucideMail size="15"></svg> Vous recevrez un email à chaque nouveau coursier qui vous écrit.</span><br>
          <button type="button" class="btn-soft" (click)="loadCouriers()"><svg lucideRefreshCw size="15"></svg> Actualiser</button>
        </div>
      } @else {
        <div class="sc-list">
          @for (c of others(); track c.id; let i = $index) {
            <article class="card-c" [style.animation-delay.ms]="i * 50">
              <span class="av" aria-hidden="true">{{ c.initials }}</span>
              <div class="who">
                <h3>{{ c.fullName }}
                  @if (c.kycVerified) { <span class="ok"><svg lucideBadgeCheck size="12"></svg> Vérifié</span> }
                </h3>
                <div class="stats">
                  @if (c.averageRating != null) { <span class="star"><svg lucideStar size="13"></svg> {{ rating(c.averageRating) }}</span> }
                  @else { <span>Pas encore noté</span> }
                  <span><svg lucideCheckCircle size="13"></svg> {{ c.completedCourses }} course{{ c.completedCourses !== 1 ? 's' : '' }}</span>
                  @if (c.zone) { <span><svg lucideMapPin size="13"></svg> {{ c.zone }}</span> }
                </div>
              </div>
              <button type="button" class="primary-action go" [disabled]="choosingCourierId === c.id" (click)="chooseCourier(c)">
                @if (choosingCourierId === c.id) { Ouverture… } @else { Discuter <svg lucideArrowRight size="15"></svg> }
              </button>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class SelectCourierComponent implements OnInit {
  courseId: number | null = null;
  readonly course = signal<{ zone: string; scheduledAt?: string } | null>(null);
  readonly couriers = signal<CourierSummary[]>([]);
  readonly conversations = signal<Conversation[]>([]);
  readonly offerCount = computed(() => this.conversations().filter((c) => this.hasOffer(c)).length);
  isLoading = false;
  choosingCourierId: number | null = null;

  /** Coursiers disponibles sans conversation déjà ouverte, les mieux notés d'abord. */
  readonly others = computed(() => {
    const engaged = new Set(this.conversations().map((c) => c.courierId));
    return this.couriers()
      .filter((c) => !engaged.has(c.id))
      .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1) || b.completedCourses - a.completedCourses);
  });

  readonly unread = inject(ChatUnreadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('courseId');
    this.courseId = id ? Number(id) : null;
    if (this.courseId) {
      this.courseService.getCourseById(this.courseId).subscribe({
        next: (c: any) => this.course.set({ zone: (c?.zone ?? '').replace(' - ', ' · '), scheduledAt: c?.scheduledAt }),
        error: warnLoadFailed('détail de la course (en-tête)', 'en-tête générique'),
      });
      this.courseService.listConversations(this.courseId).subscribe({
        next: (list) => this.conversations.set(list),
        error: warnLoadFailed('conversations de la course', 'section « Ils vous ont écrit » masquée'),
      });
    }
    this.unread.refresh(true);
    this.loadCouriers();
  }

  loadCouriers(): void {
    this.isLoading = true;
    this.courseService.getAvailableCouriers().subscribe({
      next: (list) => { this.couriers.set(list); this.isLoading = false; },
      error: () => { this.isLoading = false; this.toast.error('Impossible de charger la liste des coursiers.'); },
    });
  }

  rating(v: number): string { return v.toFixed(1).replace('.', ','); }
  /** Offre en cours (montant positif, encore active). */
  hasOffer(c: Conversation): boolean { return c.offerAmount != null && Number(c.offerAmount) > 0 && c.offerStatus === 'ACTIVE'; }
  xaf(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/ /g, ' ')} XAF`; }

  initialsOf(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'C';
  }

  when(iso: string): string {
    const d = new Date(iso);
    const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${time}`;
  }

  chooseCourier(courier: CourierSummary): void {
    if (!this.courseId) return;
    this.choosingCourierId = courier.id;
    // TICK-057 : ouvre la conversation sans créer d'offre fictive
    this.courseService.openConversation(this.courseId, courier.id).subscribe({
      next: (response) => {
        this.choosingCourierId = null;
        if (response?.chatRoomId) this.router.navigate(['/chat', response.chatRoomId]);
        else this.toast.error('Impossible d’ouvrir la discussion. Réessayez.');
      },
      error: (err: any) => {
        this.choosingCourierId = null;
        this.toast.error(err.error?.message || 'Impossible de contacter ce coursier.');
      },
    });
  }
}
