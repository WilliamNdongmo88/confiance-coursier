import { ChatUnreadService } from '../../../core/services/chat-unread.service';
import { Component, OnInit, signal, inject, DestroyRef, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { courseStatus } from '../../../shared/status/course-status';
import { EmptyStateComponent } from '../../../shared/state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/state/error-state.component';
import { SkeletonComponent } from '../../../shared/state/skeleton.component';
import { warnLoadFailed } from '../../../shared/state/load-error';
import {
  LucideAlertTriangle, LucideArrowRight, LucideArrowUpRight, LucideCamera, LucideClock, LucideMapPin, LucideMessageCircle, LucideMoreHorizontal, LucidePackage, LucidePackageCheck, LucidePhone,
  LucideShieldAlert, LucideShieldCheck, LucideShoppingBag, LucideStar, LucideTruck, LucideWallet, LucideX, LucideRefreshCw, LucideFlag,
} from '@lucide/angular';

import { courseCity, normalizeCity } from '../../../shared/data/courier-profile';

@Component({
  selector: 'app-courier-dashboard',
  standalone: true,
  imports: [
    RouterLink, DatePipe, SlicePipe, StatusBadgeComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent,
    LucideAlertTriangle, LucideArrowRight, LucideArrowUpRight, LucideCamera, LucideClock, LucideMapPin, LucideMessageCircle, LucideMoreHorizontal, LucidePackage, LucidePackageCheck, LucidePhone,
    LucideShieldAlert, LucideShieldCheck, LucideShoppingBag, LucideStar, LucideTruck, LucideWallet, LucideX, LucideRefreshCw, LucideFlag,
  ],
  styles: [`
    .m.declined { opacity: .78; }
    .zone-tabs { display: inline-flex; gap: 4px; padding: 4px; margin: 4px 16px 12px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); max-width: 100%; }
    .zone-tabs button { min-height: 38px; padding: 0 12px; border: 0; border-radius: 9px; background: none; color: var(--cm); font: inherit; font-size: 13.5px;
      font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .zone-tabs button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .zone-tabs b { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; background: var(--cc-line); color: var(--cc-ink); }
    .zone-empty { padding: 18px 4px 6px; text-align: center; color: var(--cm); font-size: 14px; }
    .zone-empty p { margin: 0 0 10px; }
    :host-context([data-theme="dark"]) .zone-tabs { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .zone-tabs button.on { background: #2B4A3E; color: #F3F7F5; }
    .rq-count { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; margin-left: 4px; border-radius: 11px;
      vertical-align: 2px; font-size: 12px; font-weight: 800; background: var(--cc-success-bg); color: var(--cc-success); }
    .refresh { flex: none; width: 40px; height: 40px; border-radius: 11px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink);
      display: grid; place-items: center; cursor: pointer; }
    .refresh.spin svg { animation: rq-spin .8s linear infinite; }
    .m.fresh { animation: rq-fresh 1.6s ease both; }
    .new-tag { display: inline-block; margin-bottom: 4px; padding: 1px 8px; border-radius: 99px; font-size: 11.5px; font-weight: 800;
      background: var(--cc-lime); color: #123b32; }
    @keyframes rq-spin { to { transform: rotate(360deg); } }
    @keyframes rq-fresh { 0% { background: color-mix(in oklab, var(--cc-lime) 35%, transparent); } 100% { background: transparent; } }
    :host-context([data-theme="dark"]) .refresh { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .rq-count { background: rgba(159,221,180,.12); color: #9FDDB4; }
    @media (prefers-reduced-motion: reduce) { .m.fresh, .refresh.spin svg { animation: none; } }
    .m-note { margin-top: 6px; font-size: 12.5px; color: var(--cm); }
    :host { display: block; --cm: #56635c; }
    :host-context([data-theme="dark"]) { --cm: #B0C0B7; }
    .head p { color: var(--cm); }
    .col-main { display: flex; flex-direction: column; gap: 15px; min-width: 0; }
    :host-context([data-theme="dark"]) .metric-icon { background: rgba(215,237,154,.1) !important; color: var(--cc-lime) !important; }
    .kyc { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; padding: 16px 18px; border-radius: 14px;
      background: var(--cc-warning-bg); border: 1px solid color-mix(in oklab, var(--cc-warning) 40%, transparent); color: var(--cc-ink); animation: cd-in .4s cubic-bezier(.16,1,.3,1) both; }
    .kyc.pending { background: var(--cc-paper-2); border-color: var(--cc-line); }
    .kyc-ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: rgba(255,255,255,.6); color: var(--cc-warning); }
    .kyc-b { flex: 1 1 240px; min-width: 0; }
    .kyc-b b { display: block; font-size: 15px; }
    .kyc-b span { font-size: 13.5px; line-height: 1.45; opacity: .9; }
    .alert { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; padding: 18px 20px; border-radius: 14px; background: var(--cc-forest); color: #fff;
      box-shadow: 0 14px 34px rgba(18,59,50,.18); animation: cd-in .45s cubic-bezier(.16,1,.3,1) both; }
    .alert.late { background: #7a2e29; }
    .alert-ic { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: rgba(215,237,154,.16); color: var(--cc-lime); }
    .alert.late .alert-ic { background: rgba(255,255,255,.14); color: #ffd1cc; }
    .alert-b { flex: 1 1 220px; min-width: 0; }
    .alert-b b { display: block; font-size: 15.5px; letter-spacing: -.02em; }
    .alert-b span { display: block; margin-top: 2px; font-size: 13.5px; color: #d6e2da; }
    .alert.late .alert-b span { color: #f6d8d5; }
    .metric-unit { font-size: 12.5px; color: var(--cm); font-weight: 650; }
    .metric-none { font-size: 15px; font-weight: 700; }
    .panel-head .text-link { white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; }
    .m { padding: 14px 19px; border-top: 1px solid var(--cc-line); animation: cd-in .4s cubic-bezier(.16,1,.3,1) both; }
    .m:first-of-type { border-top: 0; }
    .m-top { display: flex; gap: 12px; align-items: flex-start; }
    .m-ic { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); }
    .m-b { flex: 1; min-width: 0; }
    /* Titre d'abord ; le badge passe dessous quand la place manque (jamais de titre écrasé) */
    .m-t { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 10px; align-items: flex-start; }
    .m-t app-status-badge { flex: none; }
    .m-title { flex: 1 1 220px; min-width: 0; font-size: 14.5px; font-weight: 700; line-height: 1.35; color: var(--cc-ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .m-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; font-size: 13px; color: var(--cm); }
    .m-meta span { display: inline-flex; align-items: center; gap: 4px; }
    .m-meta a { color: var(--primary); font-weight: 700; text-decoration: none; }
    .m-due { margin-top: 6px; font-size: 13px; font-weight: 650; color: var(--cc-ink); display: inline-flex; align-items: center; gap: 5px; }
    .m-due.late { color: var(--cc-danger); }
    .m-act { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0 50px; }
    .m-act a, .m-act button { min-height: 40px; padding: 0 14px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 13.5px; font-weight: 700; text-decoration: none; cursor: pointer; }
    .a-main { background: var(--primary); color: #fff; border: 0; }
    .a-sec { background: var(--cc-white); color: var(--cc-ink); border: 1px solid var(--cc-line); }
    .more { position: relative; display: inline-flex; }
    .more-btn { width: 44px; padding: 0 !important; justify-content: center; }
    .menu { position: absolute; right: 0; bottom: calc(100% + 6px); z-index: 20; min-width: 220px; padding: 6px; border-radius: 12px;
      background: var(--cc-white); border: 1px solid var(--cc-line); box-shadow: 0 14px 34px rgba(18,59,50,.16); animation: menu-in .18s ease both; }
    .menu a { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 10px; border-radius: 8px; font-size: 14px; font-weight: 650;
      color: var(--cc-ink); text-decoration: none; white-space: nowrap; }
    .menu a:hover { background: var(--cc-paper-2); }
    .menu a.danger { color: var(--cc-danger); }
    @keyframes menu-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    :host-context([data-theme="dark"]) .menu { background: #1c2a24; }
    :host-context([data-theme="dark"]) .menu a { color: #F3F7F5; }
    :host-context([data-theme="dark"]) .menu a.danger { color: #F0A39C; }
    :host-context([data-theme="dark"]) .menu a:hover { background: rgba(255,255,255,.06); }
    @media (prefers-reduced-motion: reduce) { .menu { animation: none; } }
    .a-off { opacity: .5; }
    .kyc-note { margin: 0; padding: 10px 19px; border-top: 1px solid var(--cc-line); font-size: 13px; color: var(--cm); }
    .pay-steps { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 11px; counter-reset: st; }
    .pay-steps li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; font-size: 13px; line-height: 1.45; color: #d6e2da; }
    .pay-steps li::before { counter-increment: st; content: counter(st); width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center;
      background: rgba(215,237,154,.14); color: var(--cc-lime); font-weight: 800; font-size: 12px; }
    .pay-steps b { color: #fff; }
    .dark-card h3 { margin: 0; font-size: 16.5px; letter-spacing: -.03em; color: #fff; }
    .dark-card .link-lime { display: inline-flex; align-items: center; gap: 5px; margin-top: 14px; color: var(--cc-lime); font-weight: 700; text-decoration: none; min-height: 40px; }
    .rules { display: flex; gap: 10px; padding: 14px 16px; border-radius: 14px; border: 1px solid var(--cc-line); background: var(--cc-white); font-size: 13px; line-height: 1.5; color: var(--cc-ink); }
    .rules svg { flex: none; margin-top: 2px; color: var(--cc-warning); }
    .modal-overlay { display: none; }
    .modal-overlay.active { display: flex; }
    .rq-row { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--cc-line); font-size: 14px; }
    .rq-row svg { flex: none; margin-top: 2px; color: var(--primary); }
    .rq-row span { color: var(--cm); min-width: 70px; }
    .rq-row b { color: var(--cc-ink); font-weight: 600; line-height: 1.45; white-space: pre-line; }
    .rq-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
    .rq-actions > * { flex: 1 1 160px; min-height: 48px; justify-content: center; }
    .rq-kyc { margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: var(--cc-warning-bg); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    @keyframes cd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    :host-context([data-theme="dark"]) .kyc, :host-context([data-theme="dark"]) .rules, :host-context([data-theme="dark"]) .rq-kyc { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .kyc { background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .kyc.pending { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .kyc-ic { background: rgba(227,168,87,.16); color: #E3A857; }
    :host-context([data-theme="dark"]) .m-title, :host-context([data-theme="dark"]) .m-due, :host-context([data-theme="dark"]) .rq-row b { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .m-ic { background: rgba(255,255,255,.05); color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .m-due.late { color: #F0A39C !important; }
    :host-context([data-theme="dark"]) .a-main { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .m-meta a, :host-context([data-theme="dark"]) .rq-row svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .rq-kyc { background: rgba(227,168,87,.12); }
    @media (max-width: 767.98px) {
      .metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px; margin-bottom: 18px; }
      .metric-card { padding: 12px 10px; display: block; text-align: center; }
      .metric-card .metric-icon, .metric-card .metric-note { display: none; }
      .metric-card .metric-label { font-size: 12px; line-height: 1.25; }
      .metric-card .metric-value { font-size: 19px; margin-top: 4px; }
      .metric-none { font-size: 13px; }
      .m { padding: 14px 16px; }
      .kyc-note { padding: 10px 16px; }
      .m-act { margin-left: 0; }
      .m-act > * { flex: 1 1 auto; justify-content: center; }
      .alert .primary-action, .kyc .primary-action { width: 100%; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) { .kyc, .alert, .m { animation: none; } }
  `],
  template: `
      <section class="page-head head">
        <div>
          <h1>Bonjour {{ firstName }},</h1>
          <p>
            @if (missionsLoading()) { Chargement de vos missions… }
            @else if (urgent()) { Une mission attend votre action. }
            @else if (myMissions.length) { Voici où en sont vos missions. }
            @else { Proposez votre tarif sur les nouvelles demandes. }
          </p>
        </div>
      </section>

      @if (kycStatus() !== 'APPROVED') {
        <section class="kyc" [class.pending]="kycStatus() === 'PENDING'" role="status">
          <span class="kyc-ic"><svg lucideShieldAlert size="20"></svg></span>
          <div class="kyc-b">
            @if (kycStatus() === 'PENDING') {
              <b>Vérification d’identité en cours</b><span>Votre dossier est examiné par notre équipe. Vous pourrez proposer vos tarifs dès sa validation.</span>
            } @else if (kycStatus() === 'REJECTED') {
              <b>Dossier refusé : action requise</b><span>Envoyez un nouveau dossier pour pouvoir proposer vos tarifs.</span>
            } @else {
              <b>Vérifiez votre identité pour commencer</b><span>C’est obligatoire avant de proposer un tarif à un client.</span>
            }
          </div>
          <a class="primary-action" routerLink="/courier/kyc">
            {{ kycStatus() === 'PENDING' ? 'Voir mon dossier' : kycStatus() === 'REJECTED' ? 'Envoyer un nouveau dossier' : 'Vérifier mon identité' }}
            <svg lucideArrowRight size="14"></svg>
          </a>
        </section>
      }

      @if (urgent(); as u) {
        <section class="alert" [class.late]="u.status === 'OVERDUE'" aria-label="Action attendue">
          <span class="alert-ic">@if (u.status === 'OVERDUE') { <svg lucideAlertTriangle size="20"></svg> } @else { <svg lucideCamera size="20"></svg> }</span>
          <div class="alert-b">
            <b>{{ u.status === 'OVERDUE' ? 'En retard : envoyez vos preuves maintenant' : 'Preuves à envoyer avant le ' + (u.proofDeadline | date:'d MMM à HH:mm') }}</b>
            <span>« {{ u.description | slice:0:70 }}{{ u.description?.length > 70 ? '…' : '' }} » — vous êtes payé après validation des preuves.</span>
          </div>
          <a class="primary-action primary-action--lime" [routerLink]="['/courier/proofs', u.id]"><svg lucideCamera size="15"></svg> Envoyer les preuves</a>
        </section>
      }

      <section class="metrics-grid" aria-label="Résumé de votre activité">
        <article class="metric-card">
          <span class="metric-icon"><svg lucideWallet size="17"></svg></span>
          <div>
            <span class="metric-label">Gagné ce mois</span>
            <!-- TICK-078 : somme réelle des nets des courses terminées ce mois-ci (montants serveur) -->
            <strong class="metric-value">{{ fmt(monthEarnings()) }} <span class="metric-unit">XAF</span></strong>
            <div class="metric-note">Net après commission, hors achats remboursés</div>
          </div>
        </article>
        <article class="metric-card">
          <span class="metric-icon"><svg lucidePackageCheck size="17"></svg></span>
          <div>
            <span class="metric-label">Terminées</span>
            <strong class="metric-value">{{ completedCount }}</strong>
            <div class="metric-note">Depuis votre inscription</div>
          </div>
        </article>
        <article class="metric-card">
          <span class="metric-icon"><svg lucideStar size="17"></svg></span>
          <div>
            <span class="metric-label">Votre note</span>
            <strong class="metric-value">
              @if (reviewCount() > 0) { {{ rating() }} <span class="metric-unit">/ 5</span> } @else { <span class="metric-none">—</span> }
            </strong>
            <div class="metric-note">{{ reviewCount() > 0 ? 'Sur ' + reviewCount() + ' avis' : 'Pas encore d’avis' }}</div>
          </div>
        </article>
      </section>

      <div class="content-aside-grid">
        <div class="col-main">
          <section class="panel">
            <div class="panel-head">
              <!-- TICK-078 : pas encore de filtrage par zone — libellé fidèle -->
              <div><h2>Nouvelles demandes @if (publishedCourses.length > 0) { <span class="rq-count">{{ publishedCourses.length }}</span> }</h2>
                <p>Courses publiées par les clients, ouvertes à vos propositions@if (refreshedAt()) { · à jour à {{ refreshedAt() | date:'HH:mm' }} }</p></div>
              <button type="button" class="refresh" [class.spin]="refreshing()" (click)="loadPublished(true)" aria-label="Actualiser les demandes">
                <svg lucideRefreshCw size="16"></svg></button>
            </div>
            @if (myCity() && publishedCourses.length) {
              <div class="zone-tabs" role="tablist" aria-label="Filtrer les demandes">
                <button type="button" role="tab" [attr.aria-selected]="onlyMyCity()" [class.on]="onlyMyCity()" (click)="onlyMyCity.set(true)">
                  {{ myCity() }} <b>{{ inMyCity().length }}</b></button>
                <button type="button" role="tab" [attr.aria-selected]="!onlyMyCity()" [class.on]="!onlyMyCity()" (click)="onlyMyCity.set(false)">
                  Tout le Cameroun <b>{{ publishedCourses.length }}</b></button>
              </div>
            }
            @if (kycStatus() !== 'APPROVED' && publishedCourses.length) {
              <p class="kyc-note">Vous pourrez proposer un tarif une fois votre identité vérifiée.</p>
            }
            @if (publishedLoading()) {
              <app-skeleton [lines]="2" />
            } @else if (publishedError()) {
              <app-error-state message="Impossible de charger les nouvelles demandes." (retry)="loadPublished()" />
            } @else if (publishedCourses.length === 0) {
              <app-empty-state title="Aucune demande pour le moment" message="Les courses publiées par les clients apparaîtront ici." />
            } @else if (shownRequests().length === 0) {
              <div class="zone-empty">
                <p>Aucune demande à {{ myCity() }} pour le moment.</p>
                <button type="button" class="a-sec" (click)="onlyMyCity.set(false)">Voir tout le Cameroun ({{ publishedCourses.length }})</button>
              </div>
            }
            @for (course of shownRequests(); track course.id; let i = $index) {
              <article class="m" [class.fresh]="freshIds().has(course.id)" [style.animation-delay.ms]="i * 40">
                <div class="m-top">
                  <span class="m-ic" aria-hidden="true">
                    @switch (kind(course.description)) {
                      @case ('ACHAT') { <svg lucideShoppingBag size="17"></svg> }
                      @case ('LIVRAISON') { <svg lucideTruck size="17"></svg> }
                      @case ('RETRAIT') { <svg lucidePackage size="17"></svg> }
                      @default { <svg lucideMoreHorizontal size="17"></svg> }
                    }
                  </span>
                  <div class="m-b">
                    @if (freshIds().has(course.id)) { <span class="new-tag">Nouvelle</span> }
                    <span class="m-title">{{ course.description }}</span>
                    <div class="m-meta">
                      @if (course.zone) { <span><svg lucideMapPin size="13"></svg> {{ zone(course.zone) }}</span> }
                      @if (course.scheduledAt) { <span><svg lucideClock size="13"></svg> {{ course.scheduledAt | date:'d MMM, HH:mm' }}</span> }
                    </div>
                  </div>
                </div>
                <div class="m-act">
                  <button type="button" class="a-sec" (click)="openModal(course)">Voir la demande <svg lucideArrowUpRight size="14"></svg></button>
                </div>
              </article>
            }
          </section>

          <section class="panel">
            <div class="panel-head">
              <div><h2>Mes missions</h2><p>Les courses que vous réalisez ou négociez</p></div>
              <a class="text-link" routerLink="/courier/history">Historique <svg lucideArrowUpRight size="13"></svg></a>
            </div>
            @if (missionsLoading()) {
              <app-skeleton [lines]="2" />
            } @else if (missionsError()) {
              <app-error-state message="Impossible de charger vos missions." (retry)="loadMissions()" />
            } @else if (myMissions.length === 0) {
              <app-empty-state title="Aucune mission en cours" message="Choisissez une demande ci-dessus et proposez votre tarif au client." />
            }
            @for (mission of myMissions; track mission.id; let i = $index) {
              <article class="m" [class.declined]="mission.notRetained" [style.animation-delay.ms]="i * 40">
                <div class="m-top">
                  <span class="m-ic" aria-hidden="true">
                    @switch (kind(mission.description)) {
                      @case ('ACHAT') { <svg lucideShoppingBag size="17"></svg> }
                      @case ('LIVRAISON') { <svg lucideTruck size="17"></svg> }
                      @case ('RETRAIT') { <svg lucidePackage size="17"></svg> }
                      @default { <svg lucideMoreHorizontal size="17"></svg> }
                    }
                  </span>
                  <div class="m-b">
                    <div class="m-t"><span class="m-title">{{ mission.description }}</span><app-status-badge [status]="mission.status" role="COURIER" [notRetained]="mission.notRetained" /></div>
                    <div class="m-meta">
                      <span><svg lucideMapPin size="13"></svg> {{ zone(mission.zone) }}</span>
                      @if (mission.scheduledAt) { <span><svg lucideClock size="13"></svg> {{ mission.scheduledAt | date:'d MMM, HH:mm' }}</span> }
                      @if (mission.contactName || mission.contactPhone) {
                        <span><svg lucidePhone size="13"></svg> {{ mission.contactName }}
                          @if (mission.contactPhone) { <a [href]="'tel:' + mission.contactPhone">{{ mission.contactPhone }}</a> }</span>
                      }
                    </div>
                    <!-- TICK-065b : échéance de dépôt des preuves -->
                    @if (!mission.notRetained && mission.status === 'IN_PROGRESS' && mission.proofDeadline) {
                      <div class="m-due"><svg lucideClock size="13"></svg> Preuves avant le {{ mission.proofDeadline | date:'d MMM à HH:mm' }}</div>
                    }
                    @if (mission.notRetained) { <div class="m-note">Le client a choisi un autre coursier pour cette course.</div> }
                    @if (!mission.notRetained && mission.status === 'IN_PROGRESS' && !mission.startedAt) {
                      <div class="m-note">Le client peut encore annuler tant que vous n’avez pas démarré. Démarrez quand vous partez faire la course.</div>
                    }
                    @if (!mission.notRetained && mission.status === 'OVERDUE') { <div class="m-due late"><svg lucideAlertTriangle size="13"></svg> En retard : envoyez vos preuves au plus vite</div> }
                  </div>
                </div>
                <div class="m-act">
                  <!-- TICK-077 : action suivante issue de courseStatus() (preuves, notation…) -->
                  @if (!mission.notRetained && mission.status === 'IN_PROGRESS' && !mission.startedAt) {
                    <button type="button" class="a-main" [disabled]="startingId() === mission.id" (click)="start(mission)">
                      {{ startingId() === mission.id ? 'Démarrage…' : 'Je démarre la course' }}</button>
                  } @else if (nextAction(mission); as action) {
                    @if (action.link[0] !== '/chat') { <a [routerLink]="action.link" class="a-main">{{ action.label }}</a> }
                  }
                  @if (mission.chatRoomId) {
                    <a [routerLink]="['/chat', mission.chatRoomId]" class="a-sec has-dot"
                       [attr.aria-label]="unread.count(mission.chatRoomId) ? 'Chat : ' + unread.count(mission.chatRoomId) + ' message(s) non lu(s)' : 'Ouvrir le chat'">
                      <svg lucideMessageCircle size="15"></svg> Chat
                      @if (unread.count(mission.chatRoomId); as n) { <span class="chat-dot" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span> }
                    </a>
                  }
                  @if (!mission.notRetained && (canDispute(mission) || mission.clientId)) {
                    <span class="more">
                      <button type="button" class="a-sec more-btn" aria-haspopup="menu" [attr.aria-expanded]="menuFor() === mission.id"
                              aria-label="Plus d’actions" (click)="toggleMenu(mission.id, $event)"><svg lucideMoreHorizontal size="16"></svg></button>
                      @if (menuFor() === mission.id) {
                        <span class="menu" role="menu" (click)="$event.stopPropagation()">
                          @if (canDispute(mission)) {
                            <a role="menuitem" [routerLink]="['/courier/dispute-form', mission.id]"><svg lucideAlertTriangle size="15"></svg> Ouvrir un litige</a>
                          }
                          @if (mission.clientId) {
                            <a role="menuitem" class="danger" [routerLink]="['/report-user', mission.clientId]"
                               [queryParams]="{ name: mission.clientName || null, room: mission.chatRoomId || null }">
                              <svg lucideFlag size="15"></svg> Signaler {{ mission.clientName || 'le client' }}</a>
                          }
                        </span>
                      }
                    </span>
                  }
                </div>
              </article>
            }
          </section>
        </div>

        <aside class="card-stack">
          <article class="dark-card">
            <h3>Comment vous êtes payé</h3>
            <ol class="pay-steps">
              <li><span>Vous proposez votre tarif : le client paie, l’argent est <b>bloqué</b> pour vous.</span></li>
              <li><span>Vous réalisez la course et <b>envoyez les preuves</b> dans les délais.</span></li>
              <li><span>Le client valide (ou validation automatique) : <b>vous êtes payé</b>.</span></li>
            </ol>
            <a class="link-lime" routerLink="/courier/earnings">Voir mes gains <svg lucideArrowRight size="13"></svg></a>
          </article>
          <div class="rules">
            <svg lucideShieldCheck size="16"></svg>
            <span>Toute fraude (faux reçu, fausses preuves, paiement hors plateforme) entraîne la suspension définitive du compte et la perte des gains en attente.</span>
          </div>
        </aside>
      </div>

    <!-- ── Détail d'une demande ── -->
    @if (selectedCourse) {
      <div class="modal-overlay" [class.active]="modalOpen()" (click)="closeModal($event)">
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="rq-title">
          <div class="modal-header">
            <h2 id="rq-title">Demande de course</h2>
            <button class="modal-close" type="button" aria-label="Fermer" (click)="closeModalDirect()"><svg lucideX size="15"></svg></button>
          </div>
          <div class="rq-row"><svg lucidePackage size="16"></svg><span>Besoin</span><b>{{ selectedCourse.description }}</b></div>
          <div class="rq-row"><svg lucideMapPin size="16"></svg><span>Lieu</span><b>{{ zone(selectedCourse.zone) }}</b></div>
          <div class="rq-row"><svg lucideClock size="16"></svg><span>Quand</span><b>{{ selectedCourse.scheduledAt | date:'EEEE d MMMM à HH:mm' }}</b></div>
          @if (kycStatus() !== 'APPROVED') {
            <p class="rq-kyc">Vérifiez d’abord votre identité : c’est obligatoire pour contacter un client et proposer un tarif.</p>
          }
          <div class="rq-actions">
            <button class="btn btn-secondary" type="button" (click)="closeModalDirect()">Plus tard</button>
            @if (kycStatus() === 'APPROVED') {
              <button class="btn btn-primary" type="button" [disabled]="isAccepting" (click)="acceptMission()">
                <svg lucideMessageCircle size="15"></svg> {{ isAccepting ? 'Ouverture…' : 'Discuter et proposer mon tarif' }}
              </button>
            } @else {
              <a class="btn btn-primary" routerLink="/courier/kyc">Vérifier mon identité</a>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class CourierDashboardComponent implements OnInit {
  readonly unread = inject(ChatUnreadService);
  /** Pastilles de messages non lus : rafraîchies toutes les 30 s tant que l'écran est ouvert. */
  private readonly unreadTimer = (() => {
    const id = setInterval(() => this.unread.refresh(), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
    return id;
  })();

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

  /** TICK-078 : métriques réelles. */
  readonly monthEarnings = signal(0);
  readonly trustScore = signal(0);
  readonly reviewCount = signal(0);

  /** États des chargements principaux (TICK-077). */
  readonly missionsLoading = signal(true);
  readonly missionsError = signal(false);
  readonly publishedLoading = signal(true);
  readonly publishedError = signal(false);

  ngOnInit(): void {
    this.unread.refresh(true);
    // 1. Profil (secondaire) : statut KYC réel — en cas d'échec, la bannière KYC reste affichée par prudence
    this.http.get<any>('/api/users/me').subscribe({
      next: (profile) => {
        this.kycStatus.set(profile.kycStatus || 'NONE');
        this.trustScore.set(Number(profile.trustScore ?? 0));
        this.reviewCount.set(Number(profile.reviewCount ?? 0));
        this.myCity.set((profile.city ?? '').trim());
      },
      error: warnLoadFailed('profil coursier (statut KYC)', 'bannière KYC affichée'),
    });
    this.loadMissions();
    this.loadPublished();
  }

  /** 2. Missions du coursier (principal). */
  loadMissions(): void {
    this.missionsLoading.set(true);
    this.missionsError.set(false);
    this.courseService.getMyMissions().subscribe({
      next: (list: any[]) => {
        // Offres déclinées (un autre coursier a été retenu) : affichées en dernier tant que la course n'est pas
        // terminée, et jamais comptées comme ses missions (terminées, urgences, gains)
        const mine = list.filter(c => !c.notRetained);
        const declined = list.filter(c => c.notRetained && !['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(c.status));
        this.myMissions    = [...mine.filter(c => c.status !== 'COMPLETED' || c.reviewDue), ...declined];
        this.completedCount = mine.filter(c => c.status === 'COMPLETED').length;
        // Net réellement versé ce mois-ci (montants figés au paiement — TICK-070), hors remboursement d'achats
        const now = new Date();
        this.monthEarnings.set(mine
          .filter(c => c.status === 'COMPLETED' && c.courierAmount != null && c.completedAt)
          .filter(c => { const d = new Date(c.completedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
          .reduce((sum, c) => sum + Number(c.courierAmount) - Number(c.realCosts ?? 0), 0));
        this.missionsLoading.set(false);
      },
      error: () => { this.missionsLoading.set(false); this.missionsError.set(true); },
    });
  }

  /**
   * 3. Courses publiées disponibles (principal). {@code silent} : rafraîchissement sans squelette ni message
   * d'erreur (minuterie, retour sur l'onglet) ; les demandes apparues depuis le dernier chargement sont signalées.
   */
  /** TICK-089 : ville du coursier ; ses demandes d'abord (filtre « Ma ville » / « Tout le Cameroun »). */
  readonly myCity = signal('');
  readonly onlyMyCity = signal(true);
  inMyCity(): any[] {
    const mine = normalizeCity(this.myCity());
    return this.publishedCourses.filter((c) => normalizeCity(courseCity(c.zone)) === mine);
  }
  shownRequests(): any[] { return this.myCity() && this.onlyMyCity() ? this.inMyCity() : this.publishedCourses; }

  readonly refreshedAt = signal<Date | null>(null);
  readonly refreshing = signal(false);
  readonly freshIds = signal<Set<number>>(new Set());
  private knownIds: Set<number> | null = null;
  private readonly seenAt = new Map<number, number>();

  loadPublished(silent = false): void {
    if (silent) {
      if (this.refreshing()) return;
      this.refreshing.set(true);
    } else {
      this.publishedLoading.set(true);
      this.publishedError.set(false);
    }
    this.courseService.getPublishedCourses().subscribe({
      next: (list: any[]) => {
        const ids = new Set<number>(list.map((c) => c.id));
        const now = Date.now();
        // Apparues depuis le premier affichage : repère « Nouvelle » gardé 2 minutes (rien n'est nouveau au premier chargement)
        if (this.knownIds) for (const id of ids) if (!this.knownIds.has(id) && !this.seenAt.has(id)) this.seenAt.set(id, now);
        this.knownIds = new Set([...(this.knownIds ?? []), ...ids]);
        this.freshIds.set(new Set([...ids].filter((id) => now - (this.seenAt.get(id) ?? 0) < 120_000)));
        this.publishedCourses = list;
        this.publishedLoading.set(false);
        this.publishedError.set(false);
        this.refreshing.set(false);
        this.refreshedAt.set(new Date());
      },
      error: () => {
        this.refreshing.set(false);
        if (!silent) { this.publishedLoading.set(false); this.publishedError.set(true); }
      },
    });
  }

  /** Demandes rafraîchies toutes les 20 s quand l'onglet est visible, et dès le retour sur l'onglet. */
  private readonly requestsTimer = (() => {
    const tick = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') this.loadPublished(true); };
    const id = setInterval(tick, 20_000);
    const onVisible = () => { if (document.visibilityState === 'visible') this.loadPublished(true); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(id);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    });
    return id;
  })();

  /** Menu « ⋯ » d'une mission : litige (course en cours, en retard ou preuves envoyées) et signalement du client. */
  readonly menuFor = signal<number | null>(null);
  toggleMenu(id: number, e: Event): void {
    e.stopPropagation();
    this.menuFor.update((cur) => (cur === id ? null : id));
  }
  canDispute(m: any): boolean { return ['IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED'].includes(m.status); }
  @HostListener('document:click') closeMenu(): void { this.menuFor.set(null); }
  @HostListener('document:keydown.escape') closeMenuOnEscape(): void { this.menuFor.set(null); }

  /** Démarrage de la course : le client ne peut plus l'annuler librement ensuite. */
  readonly startingId = signal<number | null>(null);
  start(mission: any): void {
    if (!window.confirm('Démarrer la course ? Le client ne pourra plus l’annuler librement.')) return;
    this.startingId.set(mission.id);
    this.http.post<any>(`/api/courses/${mission.id}/start`, {}).subscribe({
      next: (c) => {
        this.startingId.set(null);
        mission.startedAt = c?.startedAt ?? new Date().toISOString();
        this.toast.success('Course démarrée : le client est prévenu. Pensez à vos preuves.');
      },
      error: (err) => {
        this.startingId.set(null);
        this.toast.error(err?.error?.message ?? 'Impossible de démarrer la course.');
        this.loadMissions();
      },
    });
  }

  /** Mission la plus urgente : en retard, sinon en cours avec l'échéance de preuves la plus proche. */
  urgent(): any | null {
    const mine = this.myMissions.filter((m) => !m.notRetained);
    const late = mine.find((m) => m.status === 'OVERDUE');
    if (late) return late;
    return mine.filter((m) => m.status === 'IN_PROGRESS' && m.proofDeadline)
      .sort((a, b) => new Date(a.proofDeadline).getTime() - new Date(b.proofDeadline).getTime())[0] ?? null;
  }

  /** Type de course lu en tête de la description (« Achat — … »). */
  kind(desc?: string): string {
    const m = /^(Achat|Livraison|Retrait) —/.exec(desc ?? '');
    return m ? m[1].toUpperCase() : 'AUTRE';
  }

  zone(z?: string): string { return String(z ?? '').replace(' - ', ' · '); }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n); }

  rating(): string { return this.trustScore().toFixed(1).replace('.', ','); }

  /** Action suivante attendue du coursier (TICK-077). */
  nextAction(mission: any) { return courseStatus(mission, 'COURIER').action; }


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

    // TICK-057 : ouvre la conversation sans créer d'offre fictive
    this.courseService.openConversation(this.selectedCourse.id).subscribe({
      next: (res) => {
        this.isAccepting = false;
        this.modalOpen.set(false);
        this.toast.success('Conversation ouverte. Proposez votre tarif au client.');
        if (res?.chatRoomId) {
          this.router.navigate(['/chat', res.chatRoomId]);
        }
      },
      error: (err: any) => {
        this.isAccepting = false;
        this.toast.error(err.error?.message || 'Impossible d\'ouvrir la conversation.');
      }
    });
  }
}
