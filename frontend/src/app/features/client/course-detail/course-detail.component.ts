import { ChatUnreadService } from '../../../core/services/chat-unread.service';
import { warnLoadFailed } from '../../../shared/state/load-error';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideAlertTriangle, LucideArrowRight, LucideCalendarDays, LucideCamera, LucideCheckCircle, LucideClock,
  LucideLockKeyhole, LucideMapPin, LucideMessageCircle, LucidePhone, LucideScale, LucideStar, LucideUserRound, LucideUsers,
  LucideWallet,
} from '@lucide/angular';

interface Step { label: string; when?: string; state: 'done' | 'active' | 'todo'; }

/** Statuts où un litige est possible (identiques à DisputeService.DISPUTABLE_STATUSES). */
const DISPUTABLE = ['IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED'];

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined;

/** Étapes du suivi, du point de vue du client. */
function buildSteps(c: any): Step[] {
  const order = ['PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'PROOFS_SUBMITTED', 'COMPLETED'];
  const pos: Record<string, number> = { OVERDUE: 2, DISPUTED: 3, REFUNDED: 2, CANCELLED: 0 };
  const s: string = c.status;
  const i = s in pos ? pos[s] : order.indexOf(s);
  const closed = s === 'REFUNDED' || s === 'CANCELLED';
  const st = (n: number): Step['state'] => (i > n ? 'done' : i === n ? 'active' : 'todo');
  return [
    { label: 'Course publiée', when: fmt(c.createdAt), state: st(0) },
    { label: 'Offre d’un coursier acceptée', state: st(1) },
    { label: 'Paiement bloqué en séquestre', when: fmt(c.paidAt), state: st(2) },
    { label: s === 'DISPUTED' ? 'Litige en cours d’examen' : 'Preuves envoyées', state: s === 'DISPUTED' ? 'active' : st(3) },
    {
      label: s === 'REFUNDED' ? 'Course remboursée' : s === 'CANCELLED' ? 'Course annulée' : 'Course validée, coursier payé',
      when: fmt(c.completedAt), state: i >= 4 || closed ? 'done' : 'todo',
    },
  ];
}

/**
 * Suivi d'une course côté client (base maquette-v2/client/course-detail.html, Impeccable, mode Operate).
 * En tête : la prochaine étape (une seule action principale selon le statut).
 * À côté : où est l'argent, le contact sur place, la discussion et, si possible, le litige.
 */
@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    StatusBadgeComponent, RouterLink, DatePipe,
    LucideAlertTriangle, LucideArrowRight, LucideCalendarDays, LucideCamera, LucideCheckCircle, LucideClock,
    LucideLockKeyhole, LucideMapPin, LucideMessageCircle, LucidePhone, LucideScale, LucideStar, LucideUserRound, LucideUsers,
    LucideWallet,
  ],
  styles: [`
    :host { display: block; --cd-m: #56635c; }
    :host-context([data-theme="dark"]) { --cd-m: #B0C0B7; }
    .cd { max-width: 1040px; margin: 0 auto; }
    .cd-head h1 { margin: 0 0 8px; font-size: clamp(22px, 3.4vw, 30px); line-height: 1.15; letter-spacing: -.035em; font-weight: 800;
      color: var(--cc-ink); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-bottom: 20px; font-size: 14px; color: var(--cd-m); }
    .meta span { display: inline-flex; align-items: center; gap: 5px; }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 20px; margin-bottom: 16px;
      animation: cd-in .45s cubic-bezier(.16,1,.3,1) both; }
    .col > .box:nth-child(2) { animation-delay: .05s; } .col > .box:nth-child(3) { animation-delay: .1s; } .col > .box:nth-child(4) { animation-delay: .15s; }
    .box h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 16px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    .box h2 svg { color: var(--primary); }
    .muted { margin: 0; font-size: 14px; line-height: 1.55; color: var(--cd-m); }
    /* Prochaine étape */
    .next { position: relative; overflow: hidden; background: var(--cc-forest); border-color: transparent; color: #fff; padding: 22px; }
    .next.warn { background: #6b3a12; }
    .next.calm { background: var(--cc-white); border-color: var(--cc-line); color: var(--cc-ink); }
    .next small { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: var(--cc-lime); }
    .next.warn small { color: #ffd29a; }
    .next.calm small { color: var(--primary); }
    .next h3 { margin: 0 0 8px; font-size: 20px; line-height: 1.25; letter-spacing: -.03em; font-weight: 800; color: inherit; }
    .next p { margin: 0 0 14px; font-size: 14.5px; line-height: 1.55; color: #d6e2da; }
    .next.warn p { color: #f3dcc4; }
    .next.calm p { color: var(--cd-m); }
    .next .when { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 16px; padding: 7px 11px; border-radius: 99px;
      background: rgba(255,255,255,.1); font-size: 13.5px; font-weight: 650; color: #fff; }
    .next.calm .when { background: var(--cc-paper-2); color: var(--cc-ink); }
    .next.calm .when.hot { background: var(--cc-danger-bg); color: var(--cc-danger); font-weight: 700; }
    :host-context([data-theme="dark"]) .next.calm .when.hot { background: rgba(240,163,156,.12); color: #F0A39C; }
    .acts { display: flex; flex-wrap: wrap; gap: 10px; }
    .acts .primary-action { min-height: 46px; font-size: 14px; }
    .ghost-w { min-height: 46px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.28); background: transparent;
      color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
    .next.calm .ghost-w { border-color: var(--cc-line); color: var(--cc-ink); }
    .ghost-w:disabled { opacity: .5; cursor: default; }
    .cancel-hint { margin: 12px 0 0; font-size: 13px; opacity: .85; }
    .cancel-box { margin-top: 14px; padding: 14px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.22); animation: cb-in .25s ease both; }
    .cancel-box b { display: block; font-size: 15px; }
    .cancel-box p { margin: 6px 0 12px; font-size: 13.5px; line-height: 1.45; opacity: .9; }
    .cancel-acts { display: flex; flex-wrap: wrap; gap: 8px; }
    .danger-w { min-height: 46px; padding: 0 16px; border-radius: 10px; border: 0; background: #F0A39C; color: #3b0d09; font: inherit; font-weight: 750; cursor: pointer; }
    .danger-w:disabled { opacity: .5; cursor: default; }
    @keyframes cb-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .cancel-box { animation: none; } }
    .hint { margin: 10px 0 0; font-size: 12.5px; color: #cfdcd4; }
    .next.calm .hint { color: var(--cd-m); }
    /* Suivi */
    .steps { list-style: none; margin: 0; padding: 0; }
    .steps li { position: relative; display: grid; grid-template-columns: 22px 1fr; gap: 12px; padding-bottom: 16px; }
    .steps li:last-child { padding-bottom: 0; }
    .steps li::after { content: ''; position: absolute; left: 10px; top: 22px; bottom: 0; width: 2px; background: var(--cc-line); }
    .steps li:last-child::after { display: none; }
    .steps li.done::after { background: var(--cc-success); }
    .dot { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      border: 2px solid var(--cc-line); background: var(--cc-white); }
    .done .dot { background: var(--cc-success); border-color: var(--cc-success); color: #fff; }
    .active .dot { border-color: var(--primary); }
    .active .dot::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--primary); animation: cd-pulse 1.8s ease-in-out infinite; }
    .steps b { display: block; font-size: 14.5px; font-weight: 650; color: var(--cc-ink); }
    .todo b { color: var(--cd-m); font-weight: 550; }
    .steps span { font-size: 12.5px; color: var(--cd-m); }
    /* Argent */
    .money-state { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 12px; border-radius: 12px; background: var(--cc-paper-2); }
    .money-state svg { flex: none; width: 18px; height: 18px; color: var(--primary); }
    .money-state b { display: block; font-size: 14px; color: var(--cc-ink); }
    .money-state span { font-size: 12.5px; color: var(--cd-m); }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 14px; color: var(--cd-m); }
    .row b { color: var(--cc-ink); font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .row.total { margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--cc-line); font-size: 15px; }
    .row.total b { font-size: 18px; font-weight: 800; }
    .paid { margin: 8px 0 0; font-size: 12.5px; color: var(--cd-m); }
    /* Contact, discussion, litige */
    .who { display: flex; align-items: center; gap: 12px; }
    .av { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); font-weight: 800; }
    .who b { display: block; font-size: 15px; color: var(--cc-ink); }
    .who a { color: var(--primary); font-weight: 700; text-decoration: none; }
    .chat-full { width: 100%; justify-content: center; margin-top: 14px; min-height: 46px; }
    .problem { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .problem p { flex: 1 1 180px; }
    .btn-danger-soft { min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid color-mix(in oklab, var(--cc-danger) 45%, transparent);
      background: var(--cc-danger-bg); color: var(--cc-danger); font-weight: 750; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
    .btn-danger-soft:hover { background: var(--cc-danger); color: #fff; }
    .sk { height: 140px; border-radius: 16px; margin-bottom: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2));
      background-size: 200% 100%; animation: cd-sk 1.2s linear infinite; }
    @keyframes cd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes cd-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.7); opacity: .6; } }
    @keyframes cd-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .cd-head h1, :host-context([data-theme="dark"]) .box h2, :host-context([data-theme="dark"]) .steps li:not(.todo) b,
    :host-context([data-theme="dark"]) .money-state b, :host-context([data-theme="dark"]) .who b, :host-context([data-theme="dark"]) .next.calm h3 { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .next { background: #12392f; }
    :host-context([data-theme="dark"]) .next.warn { background: #4a2a10; }
    :host-context([data-theme="dark"]) .next.calm { background: var(--cc-white); }
    :host-context([data-theme="dark"]) .next p { color: #d6e2da !important; }
    :host-context([data-theme="dark"]) .next.calm p, :host-context([data-theme="dark"]) .muted { color: #B0C0B7 !important; }
    :host-context([data-theme="dark"]) .money-state, :host-context([data-theme="dark"]) .av { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .money-state svg, :host-context([data-theme="dark"]) .av, :host-context([data-theme="dark"]) .who a,
    :host-context([data-theme="dark"]) .box h2 svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .btn-danger-soft { color: #F0A39C; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .box, .next { padding: 18px 16px; }
      .acts .primary-action, .acts .ghost-w { flex: 1 1 100%; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) { .box, .sk, .active .dot::after { animation: none; } }
  `],
  template: `
    <div class="cd">
      @if (isLoading && !course) {
        <div class="sk"></div><div class="sk"></div>
      }

      @if (course) {
        <section class="cd-head">
          <h1>{{ course.description }}</h1>
          <div class="meta">
            <app-status-badge [status]="course.status" role="CLIENT" />
            @if (course.zone) { <span><svg lucideMapPin size="14"></svg> {{ zone() }}</span> }
            @if (course.scheduledAt) { <span><svg lucideCalendarDays size="14"></svg> {{ course.scheduledAt | date:'EEEE d MMMM, HH:mm' }}</span> }
          </div>
        </section>

        <div class="grid">
          <div class="col">
            <!-- ── Prochaine étape : une seule action principale ── -->
            @switch (course.status) {
              @case ('PUBLISHED') {
                <section class="box next calm">
                  <small>Prochaine étape</small>
                  <h3>Choisissez votre coursier</h3>
                  <p>Les coursiers vérifiés vous écrivent et proposent leur tarif. Acceptez l’offre qui vous convient dans le chat.</p>
                  <!-- Seulement s'il y a du nouveau : messages de coursiers pas encore lus -->
                  @if (unread.sum(course.conversationRoomIds); as n) {
                    <div class="when hot"><svg lucideMessageCircle size="15"></svg>
                      {{ n }} nouveau{{ n > 1 ? 'x' : '' }} message{{ n > 1 ? 's' : '' }} de {{ unread.roomsWithUnread(course.conversationRoomIds) }} coursier{{ unread.roomsWithUnread(course.conversationRoomIds) > 1 ? 's' : '' }}</div>
                  }
                  <div class="acts"><a class="primary-action has-dot" [routerLink]="['/client/select-courier', courseId]"
                       [attr.aria-label]="unread.sum(course.conversationRoomIds) ? 'Voir les coursiers : ' + unread.sum(course.conversationRoomIds) + ' message(s) non lu(s)' : 'Voir les coursiers'">
                    <svg lucideUsers size="16"></svg> Voir les coursiers
                    @if (unread.sum(course.conversationRoomIds); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }</a></div>
                </section>
              }
              @case ('ASSIGNED') {
                <section class="box next">
                  <small>Prochaine étape</small>
                  <h3>Payez pour lancer la course</h3>
                  <p>Vous avez accepté l’offre de {{ course.courierName || 'votre coursier' }}. L’argent restera bloqué jusqu’à votre validation des preuves.</p>
                  <div class="acts">
                    <a class="primary-action primary-action--lime" [routerLink]="['/client/pay', courseId]"><svg lucideLockKeyhole size="16"></svg> Payer maintenant</a>
                    @if (course.chatRoomId) { <a class="ghost-w has-dot" [routerLink]="['/chat', course.chatRoomId]"><svg lucideMessageCircle size="16"></svg> Discuter
                      @if (unread.count(course.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }</a> }
                  </div>
                </section>
              }
              @case ('IN_PROGRESS') {
                <section class="box next">
                  <small>En cours</small>
                  <h3>{{ course.startedAt ? (course.courierName || 'Votre coursier') + ' réalise la course' : (course.courierName || 'Votre coursier') + ' va démarrer la course' }}</h3>
                  <p>Il doit envoyer ses preuves (vidéo, photos, reçu s’il y a des achats). Vous serez prévenu dès qu’elles arrivent.</p>
                  @if (course.proofDeadline) {
                    <div class="when"><svg lucideClock size="15"></svg> Preuves attendues avant le {{ course.proofDeadline | date:'d MMM à HH:mm' }} · {{ timeLeft(course.proofDeadline) }}</div>
                  }
                  <div class="acts">
                    @if (course.chatRoomId) { <a class="primary-action primary-action--lime has-dot" [routerLink]="['/chat', course.chatRoomId]"><svg lucideMessageCircle size="16"></svg> Discuter avec le coursier
                      @if (unread.count(course.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }</a> }
                    @if (!course.startedAt && !confirmCancel) {
                      <button type="button" class="ghost-w" [disabled]="acting" (click)="confirmCancel = true">Annuler la course</button>
                    }
                  </div>
                  <!-- Rétractation : annulation libre tant que le coursier n'a pas démarré -->
                  @if (!course.startedAt) {
                    @if (confirmCancel) {
                      <div class="cancel-box" role="group" aria-label="Annuler la course">
                        <b>Annuler la course et être remboursé ?</b>
                        <p>Le coursier n’a pas encore démarré : vous récupérez la totalité de votre paiement, frais de service compris. Le coursier est prévenu. Cette action est définitive.</p>
                        <div class="cancel-acts">
                          <button type="button" class="ghost-w" [disabled]="acting" (click)="confirmCancel = false">Garder la course</button>
                          <button type="button" class="danger-w" [disabled]="acting" (click)="cancelBeforeStart()">{{ acting ? 'Annulation…' : 'Oui, annuler et être remboursé' }}</button>
                        </div>
                      </div>
                    } @else {
                      <p class="cancel-hint">Pas encore démarrée : vous pouvez encore l’annuler et être remboursé intégralement.</p>
                    }
                  }
                </section>
              }
              @case ('PROOFS_SUBMITTED') {
                <section class="box next">
                  <small>À vous de jouer</small>
                  <h3>Les preuves sont arrivées</h3>
                  <p>Vérifiez-les : si tout est conforme, validez pour payer le coursier. Sinon, ouvrez un litige.</p>
                  @if (course.autoValidateAt) {
                    <div class="when"><svg lucideClock size="15"></svg> Validation automatique le {{ course.autoValidateAt | date:'d MMM à HH:mm' }} · {{ timeLeft(course.autoValidateAt) }}</div>
                  }
                  <div class="acts"><a class="primary-action primary-action--lime" [routerLink]="['/client/validate', courseId]"><svg lucideCamera size="16"></svg> Voir les preuves et valider</a></div>
                </section>
              }
              @case ('OVERDUE') {
                <!-- TICK-065b : le coursier n'a pas envoyé ses preuves à temps -->
                <section class="box next warn" role="alert">
                  <small>Le coursier est en retard</small>
                  <h3>Aucune preuve reçue à temps</h3>
                  <p>L’échéance du {{ course.proofDeadline | date:'d MMM à HH:mm' }} est dépassée. Votre argent reste bloqué : rien n’est versé sans preuves.</p>
                  <div class="acts">
                    <button type="button" class="primary-action primary-action--lime" [disabled]="acting" (click)="cancelOverdue()">Annuler et être remboursé</button>
                    @if (extensionsLeft() > 0) {
                      <button type="button" class="ghost-w" [disabled]="acting" (click)="extend(12)">Prolonger de 12 h</button>
                      <button type="button" class="ghost-w" [disabled]="acting" (click)="extend(24)">Prolonger de 24 h</button>
                    }
                  </div>
                  <p class="hint">
                    @if (extensionsLeft() > 0) { {{ extensionsLeft() }} prolongation{{ extensionsLeft() > 1 ? 's' : '' }} possible{{ extensionsLeft() > 1 ? 's' : '' }}. }
                    @if (autoDecisionAt()) { Sans choix de votre part avant le {{ autoDecisionAt() | date:'d MMM à HH:mm' }}, vous serez remboursé automatiquement (ou un administrateur tranchera si des preuves ou des achats existent). }
                  </p>
                </section>
              }
              @case ('DISPUTED') {
                <section class="box next calm">
                  <small>Litige en cours</small>
                  <h3>Un administrateur examine le dossier</h3>
                  <p>Il consulte les preuves et la discussion. L’argent reste bloqué jusqu’à sa décision, que vous recevrez par email.</p>
                </section>
              }
              @case ('COMPLETED') {
                <section class="box next calm">
                  <small>Course terminée</small>
                  <h3>{{ course.reviewDue ? 'Notez votre coursier' : 'Merci, la course est terminée' }}</h3>
                  <p>{{ course.reviewDue ? 'Votre note aide les autres clients à choisir un coursier de confiance.' : 'Le coursier a été payé après votre validation.' }}</p>
                  @if (course.reviewDue) {
                    <div class="acts"><a class="primary-action" [routerLink]="['/client/rate', courseId]"><svg lucideStar size="16"></svg> Noter {{ course.courierName || 'le coursier' }}</a></div>
                  }
                </section>
              }
              @case ('REFUNDED') {
                <section class="box next calm"><small>Course remboursée</small><h3>Vous avez été remboursé</h3>
                  <p>Le montant payé vous a été restitué par le moyen de paiement utilisé.</p></section>
              }
              @case ('CANCELLED') {
                <section class="box next calm"><small>Course annulée</small><h3>Cette course a été annulée</h3>
                  <p>Aucun paiement n’a été effectué.</p></section>
              }
            }

            <!-- ── Suivi ── -->
            <section class="box" aria-labelledby="cd-steps">
              <h2 id="cd-steps">Suivi de la course</h2>
              <ol class="steps">
                @for (s of steps; track s.label) {
                  <li [class]="s.state" [attr.aria-current]="s.state === 'active' ? 'step' : null">
                    <span class="dot" aria-hidden="true">@if (s.state === 'done') { <svg lucideCheckCircle size="13"></svg> }</span>
                    <div><b>{{ s.label }}</b>@if (s.when) { <span>{{ s.when }}</span> }</div>
                  </li>
                }
              </ol>
            </section>
          </div>

          <aside class="col">
            <!-- ── Où est l'argent ── -->
            @if (course.totalAmount) {
              <section class="box" aria-labelledby="cd-money">
                <h2 id="cd-money"><svg lucideWallet size="17"></svg> Votre paiement</h2>
                <div class="money-state">
                  <svg [attr.aria-hidden]="true" lucideLockKeyhole size="18"></svg>
                  <div><b>{{ moneyTitle() }}</b><span>{{ moneyHint() }}</span></div>
                </div>
                <div class="row"><span>Tarif du coursier</span><b>{{ xaf(course.courseAmount) }}</b></div>
                @if (course.realCosts > 0) { <div class="row"><span>Achats remboursés</span><b>{{ xaf(course.realCosts) }}</b></div> }
                @if (course.commissionAmount > 0) { <div class="row"><span>Frais de service ({{ rate() }} %)</span><b>{{ xaf(course.commissionAmount) }}</b></div> }
                <div class="row total"><span>Total payé</span><b>{{ xaf(course.totalAmount) }}</b></div>
                @if (course.paidAt) { <p class="paid">Payé le {{ course.paidAt | date:'d MMMM yyyy à HH:mm' }}</p> }
              </section>
            }

            <!-- ── Coursier & discussion ── -->
            @if (course.courierName || course.chatRoomId) {
              <section class="box" aria-labelledby="cd-courier">
                <h2 id="cd-courier"><svg lucideUserRound size="17"></svg> Votre coursier</h2>
                <div class="who">
                  <span class="av" aria-hidden="true">{{ initials(course.courierName) }}</span>
                  <div><b>{{ course.courierName || 'Coursier' }}</b><span class="muted">Identité vérifiée</span></div>
                </div>
                @if (course.chatRoomId) {
                  <a class="btn btn-secondary chat-full has-dot" [routerLink]="['/chat', course.chatRoomId]">
                    <svg lucideMessageCircle size="16"></svg> Ouvrir la discussion
                    @if (unread.count(course.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }
                  </a>
                }
              </section>
            }

            <!-- ── Contact sur place ── -->
            @if (course.contactName || course.contactPhone) {
              <section class="box" aria-labelledby="cd-contact">
                <h2 id="cd-contact"><svg lucidePhone size="17"></svg> Contact sur place</h2>
                <div class="who">
                  <span class="av" aria-hidden="true">{{ initials(course.contactName) }}</span>
                  <div><b>{{ course.contactName || 'Contact' }}</b>
                    @if (course.contactPhone) { <a [href]="'tel:' + course.contactPhone">{{ course.contactPhone }}</a> }</div>
                </div>
                <p class="muted paid">Visible uniquement par le coursier retenu.</p>
              </section>
            }

            <!-- ── Litige (uniquement quand il est possible) ── -->
            @if (canDispute()) {
              <section class="box problem" aria-label="Signaler un problème">
                <p class="muted">Un problème avec la course (retard, preuves non conformes) ?</p>
                <a class="btn-danger-soft" [routerLink]="['/client/dispute-form', courseId]"><svg lucideScale size="16"></svg> Ouvrir un litige</a>
              </section>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class CourseDetailComponent implements OnInit {
  readonly unread = inject(ChatUnreadService);
  courseId = 0;
  course: any = null;
  steps: Step[] = [];
  isLoading = false;
  acting = false;
  /** Horloge pour les comptes à rebours (rafraîchie chaque minute). */
  private readonly now = signal(Date.now());

  /** Paramètres serveur (TICK-065b) — aucune valeur codée en dur. */
  private maxExtensions = 0;
  private overdueGraceHours = 0;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  constructor() {
    // Comptes à rebours (minute) et messages non lus des coursiers (au plus toutes les 10 s, côté service)
    const id = setInterval(() => { this.now.set(Date.now()); this.unread.refresh(); }, 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  ngOnInit(): void {
    this.unread.refresh(true);
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (p) => {
        this.maxExtensions = Number(p.maxExtensions ?? 0);
        this.overdueGraceHours = Number(p.overdueGraceHours ?? 0);
      },
      error: warnLoadFailed('paramètres publics (prolongations, délai de grâce)', 'boutons de prolongation masqués'),
    });
    this.loadCourse();
  }

  // ── Affichage ─────────────────────────────────────────────────────────────
  xaf(n: number | null | undefined): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))} XAF`;
  }

  rate(): string { return String(this.course?.commissionRate ?? 0).replace('.', ','); }

  zone(): string { return String(this.course?.zone ?? '').replace(' - ', ' · '); }

  initials(name?: string | null): string {
    return (name ?? '').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
  }

  canDispute(): boolean { return DISPUTABLE.includes(this.course?.status); }

  /** Où est l'argent, selon l'état du séquestre. */
  moneyTitle(): string {
    switch (this.course?.escrowStatus) {
      case 'RELEASED': return 'Versé au coursier';
      case 'REFUNDED': return 'Remboursé';
      case 'SPLIT': return 'Partagé après litige';
      case 'DISPUTED': return 'Bloqué pendant le litige';
      default: return 'Bloqué en séquestre';
    }
  }

  moneyHint(): string {
    switch (this.course?.escrowStatus) {
      case 'RELEASED': return 'Après validation des preuves.';
      case 'REFUNDED': return 'Restitué par votre moyen de paiement.';
      case 'SPLIT': return 'Selon la décision de l’administrateur.';
      case 'DISPUTED': return 'Rien n’est versé avant la décision.';
      default: return 'Versé seulement après votre validation des preuves.';
    }
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
    const ms = new Date(iso).getTime() - this.now();
    if (ms <= 0) return 'échéance dépassée';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h >= 48 ? `dans ${Math.floor(h / 24)} jours` : h > 0 ? `dans ${h} h ${m} min` : `dans ${m} min`;
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

  /** Rétractation : annulation d'une course payée que le coursier n'a pas encore démarrée. */
  confirmCancel = false;
  cancelBeforeStart(): void {
    this.acting = true;
    this.http.post<any>('/api/courses/' + this.courseId + '/cancel-before-start', {}).subscribe({
      next: () => {
        this.acting = false;
        this.confirmCancel = false;
        this.toast.success('Course annulée : vous êtes remboursé intégralement.');
        this.loadCourse();
      },
      error: (err) => {
        this.acting = false;
        this.confirmCancel = false;
        this.toast.error(err?.error?.message ?? 'Impossible d’annuler la course.');
        this.loadCourse();
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
        this.toast.error(err?.error?.message ?? 'Impossible d’annuler la course.');
      },
    });
  }

  loadCourse(): void {
    this.isLoading = true;
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (c: any) => {
        this.course = c;
        this.steps = buildSteps(c);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Impossible de charger les détails de la course.');
        this.router.navigate(['/client/dashboard']);
      },
    });
  }
}
