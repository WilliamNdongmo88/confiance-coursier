import { warnLoadFailed } from '../../shared/state/load-error';
import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  LucideSend,
  LucideArrowLeft,
  LucideInfo,
  LucideFlag,
  LucideShieldCheck,
  LucideReceipt,
  LucideArrowRight,
  LucideAlertTriangle,
  LucideMenu,
  LucideBike,
  LucideLayoutDashboard,
  LucidePlus,
  LucideClock,
  LucideUser,
  LucideLifeBuoy,
  LucideLogOut,
  LucideMessageSquare,
  LucideFileText,
  LucideX,
  LucideHistory,
  LucideWallet,
  LucidePlusCircle,
} from '@lucide/angular';
import { CourseService } from '../../core/services/course.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

interface ChatMsg {
  id?: number;
  roomId: number;
  senderId: number;
  content: string;
  messageType: string;  // TEXT | OFFER | SYSTEM
  offerAmount?: number | null;
  offerId?: number | null;  // TICK-059 : ID de la CourseOffer associée (pour acceptation)
  offerStatus?: string | null; // ACTIVE | SUPERSEDED | ACCEPTED | REJECTED (lu du serveur)
  createdAt?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    RouterLinkActive,
    LucideSend,
    LucideArrowLeft,
    LucideInfo,
    LucideFlag,
    LucideShieldCheck,
    LucideReceipt,
    LucideArrowRight,
    LucideAlertTriangle,
    LucideMenu,
    LucideBike,
    LucideLayoutDashboard,
    LucidePlus,
    LucideClock,
    LucideUser,
    LucideLifeBuoy,
    LucideLogOut,
    LucideMessageSquare,
    LucideFileText,
    LucideX,
    LucideHistory,
    LucideWallet,
    LucidePlusCircle,
  ],
  styles: [`
    /* ── Hôte : pleine hauteur ── */
    :host {
      display: block;
      height: 100vh;
      height: 100dvh; /* TICK-071 : hauteur visible réelle (clavier mobile iOS/Android) */
      overflow: hidden;
    }

    /* ── Shell : sidebar + main ── */
    .chat-shell {
      display: flex;
      height: 100%;
      overflow: hidden;
      background: var(--cc-paper);
    }

    /* ── Zone principale ── */
    .chat-main {
      flex: 1;
      margin-left: var(--sidebar-width, 242px);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      transition: margin-left 0.22s ease;
      min-width: 0;
    }

    /* ── En-tête ── */
    .chat-header {
      background: var(--cc-white);
      border-bottom: 1px solid var(--cc-line);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .chat-avatar {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .chat-title-wrapper {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .chat-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--cc-ink);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      line-height: 1.3;
    }

    .chat-subtitle {
      font-size: 0.8rem;
      color: var(--cc-muted);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      line-height: 1.3;
    }

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

    .chat-header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    /* Hamburger mobile */
    .chat-menu-btn {
      display: none;
      height: 38px; width: 38px;
      border: 1px solid var(--cc-line);
      border-radius: 9px;
      background: var(--cc-white);
      color: var(--cc-forest);
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* ── Bandeau traçabilité ── */
    .chat-trace-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 24px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--cc-line);
      font-size: 0.75rem;
      color: var(--cc-muted);
      flex-shrink: 0;
    }

    /* ── Zone messages ── */
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: var(--cc-paper);
    }

    .chat-date-divider {
      text-align: center;
      font-size: 0.8rem;
      color: var(--cc-muted);
      margin: 16px 0;
      position: relative;
    }
    .chat-date-divider::before,
    .chat-date-divider::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 30%;
      height: 1px;
      background: var(--cc-line);
    }
    .chat-date-divider::before { left: 0; }
    .chat-date-divider::after  { right: 0; }

    /* ── Bulles ── */
    .message-row {
      display: flex;
      flex-direction: column;
      max-width: 80%;
    }
    .message-row.incoming {
      align-self: flex-start;
      align-items: flex-start;
    }
    .message-row.outgoing {
      align-self: flex-end;
      align-items: flex-end;
    }
    .message-bubble {
      padding: 12px 16px;
      border-radius: var(--radius-lg, 16px);
      font-size: 0.95rem;
      line-height: 1.4;
    }
    .message-row.incoming .message-bubble {
      background: var(--cc-white);
      color: var(--cc-ink);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--cc-line);
    }
    .message-row.outgoing .message-bubble {
      background: var(--primary);
      color: var(--on-primary);
      border-bottom-right-radius: 4px;
    }
    .message-time {
      font-size: 0.75rem;
      color: var(--cc-muted);
      margin-top: 4px;
    }

    /* ── Carte d'offre ── */
    .offer-card {
      background: var(--cc-paper);
      border: 1px solid var(--primary);
      border-radius: var(--radius-md, 10px);
      padding: 16px;
      margin-top: 8px;
      width: 100%;
      max-width: 300px;
    }
    .offer-card h4 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--cc-ink);
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .offer-detail {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 4px;
      color: var(--cc-muted);
    }
    .offer-total {
      display: flex;
      justify-content: space-between;
      font-size: 1rem;
      font-weight: 700;
      color: var(--cc-ink);
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--cc-line);
    }
    .offer-note {
      font-size: 0.75rem;
      color: var(--cc-success);
      margin: 8px 0 12px;
      line-height: 1.4;
    }

    /* ── Barre de saisie ── */
    .chat-input-bar {
      background: var(--cc-white);
      border-top: 1px solid var(--cc-line);
      padding: 12px 24px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
      position: sticky;
      bottom: 0;
    }
    .chat-offline { background: var(--cc-warning-bg); color: var(--cc-warning);
      font-size: .8rem; text-align: center; padding: 6px 12px; flex-shrink: 0; }
    .chat-more { position: relative; }
    .chat-more-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; min-width: 190px;
      background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 6px; display: flex; flex-direction: column; }
    .chat-more-menu button { min-height: 44px; text-align: left; background: none; border: 0; border-radius: 8px;
      padding: 0 12px; font: inherit; color: var(--cc-ink); cursor: pointer; display: flex; gap: 8px; align-items: center; }
    .chat-more-menu button:hover { background: var(--cc-paper); }
    .chat-more-menu .danger { color: var(--danger); }

    .chat-input {
      flex: 1;
      min-width: 0;
      padding: 12px 16px;
      border: 1px solid var(--cc-line);
      border-radius: 999px;
      background: var(--cc-paper);
      color: var(--cc-ink);
      font-family: inherit;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: var(--primary); }

    .send-btn {
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      width: 44px; height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .send-btn:hover  { background: var(--primary-hover); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Bouton "Proposer une offre" dans la barre de saisie (coursier) */
    .offer-trigger-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 999px;
      border: none;
      background: var(--primary);
      color: var(--on-primary);
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .offer-trigger-btn:hover { background: var(--primary-hover); }

    /* ── Modale offre (coursier) — identique à la maquette ── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.70);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-overlay.active { display: flex; }

    .modal-content {
      background: var(--cc-white);
      border: 1px solid var(--cc-line);
      border-radius: 13px;
      width: 100%;
      max-width: 400px;
      padding: 24px;
      box-shadow: 0 28px 80px rgba(16, 38, 29, 0.22);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--cc-ink);
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--cc-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .modal-close:hover { background: var(--cc-paper); }

    .offer-input-wrap {
      position: relative;
    }
    .offer-input-wrap .currency-suffix {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--cc-muted);
      font-size: 0.9rem;
      pointer-events: none;
    }
    .offer-input-wrap .form-input {
      padding-right: 50px;
    }

    .form-hint {
      margin-top: 6px;
      font-size: 0.8rem;
      color: var(--danger);
    }

    .offer-preview {
      background: var(--cc-paper);
      padding: 12px;
      border-radius: 9px;
      margin-top: 16px;
      margin-bottom: 24px;
    }
    .offer-preview-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 0.85rem;
    }
    .offer-preview-row:last-child { margin-bottom: 0; }
    .offer-preview-row .label { color: var(--cc-muted); }
    .offer-preview-row .value { font-weight: 700; }
    .offer-preview-divider {
      border: none;
      border-top: 1px dashed var(--cc-line);
      margin: 8px 0;
    }
    .offer-preview-net .label,
    .offer-preview-net .value { color: var(--cc-success); font-weight: 700; }

    /* ── Overlay mobile ── */
    .chat-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(16,38,29,.5);
      z-index: 35;
    }
    .chat-overlay.active { display: block; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .chat-main { margin-left: 0; }
      .chat-menu-btn { display: flex; }
      .chat-header { padding: 10px 12px; gap: 8px; }
      .chat-body { padding: 16px; }
      .chat-input-bar { padding: 10px 12px; gap: 8px; }
      .chat-trace-banner { padding: 8px 12px; }
    }
    @media (max-width: 640px) {
      .message-row { max-width: 92%; }
      .chat-header-actions .btn-label { display: none; }
      .chat-header-actions .btn { padding: 7px 9px; min-width: 34px; justify-content: center; }
      .chat-title { font-size: 0.88rem; }
      .offer-trigger-btn span { display: none; }
      .offer-trigger-btn { padding: 10px 12px; }
    }

    /* ── Dark mode ── */
    :host-context([data-theme="dark"]) .chat-header,
    :host-context([data-theme="dark"]) .chat-input-bar { background: var(--surface); border-color: var(--cc-line); }
    :host-context([data-theme="dark"]) .chat-trace-banner { background: var(--surface); border-color: var(--cc-line); color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .chat-body { background: var(--cc-paper); }
    :host-context([data-theme="dark"]) .chat-title { color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .chat-subtitle { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .chat-date-divider { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .chat-date-divider::before,
    :host-context([data-theme="dark"]) .chat-date-divider::after { background: var(--cc-line); }
    :host-context([data-theme="dark"]) .message-row.incoming .message-bubble {
      background: var(--surface); border-color: var(--cc-line); color: var(--cc-ink);
    }
    :host-context([data-theme="dark"]) .message-row.outgoing .message-bubble {
      background: var(--primary); color: var(--on-primary);
    }
    :host-context([data-theme="dark"]) .message-time { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .chat-input {
      background: var(--surface); border-color: var(--cc-line); color: var(--cc-ink);
    }
    :host-context([data-theme="dark"]) .chat-input::placeholder { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .offer-card {
      background: var(--surface); border-color: var(--cc-lime);
    }
    :host-context([data-theme="dark"]) .offer-card h4 { color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .offer-total { color: var(--cc-ink); border-color: var(--cc-line); }
    :host-context([data-theme="dark"]) .offer-detail { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .modal-content { background: var(--surface); border-color: var(--cc-line); }
    :host-context([data-theme="dark"]) .modal-title { color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .offer-preview { background: var(--cc-paper); }
    :host-context([data-theme="dark"]) .offer-preview-row .label { color: var(--cc-muted); }
    :host-context([data-theme="dark"]) .offer-preview-row .value { color: var(--cc-ink); }
    :host-context([data-theme="dark"]) .badge-verified { background: var(--cc-forest); color: var(--cc-success); }
    :host-context([data-theme="dark"]) .chat-header-info .chat-avatar { background: var(--cc-forest); color: var(--cc-lime); }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-min-44px-mh-44px { min-width: 44px; min-height: 44px; }
    .st-fw-700 { font-weight: 700; }
    .st-w-100-mt-4px { width: 100%; margin-top: 4px; }
    .st-marg-4px { margin-left: 4px; }
    .st-fs-0-78rem-c-success-ta-center { font-size: 0.78rem; color: var(--cc-success); text-align: center; padding: 4px 0; font-weight: 600; }
    .st-fs-0-78rem-c-muted-ta-center { font-size: 0.78rem; color: var(--cc-muted); text-align: center; padding: 4px 0; }
    .st-marg-1px { margin-left: -1px; }
    .st-fs-88rem-c-muted-mb-16px { font-size: .88rem; color: var(--cc-muted); margin-bottom: 16px; }
    .st-c-danger-mb-12px { color: var(--danger); margin-bottom: 12px; }
    .st-c-danger { color: var(--danger); }
  `],
  template: `
    <!-- Overlay mobile sidebar -->
    <div class="chat-overlay" [class.active]="sidebarOpen()" (click)="closeSidebar()"></div>

    <div class="chat-shell">

      <!-- ── Sidebar ── -->
      <aside class="app-sidebar" [class.open]="sidebarOpen()">
        <a class="sb-brand" [routerLink]="isCOURIER ? '/courier/dashboard' : '/client/dashboard'">
          <span class="sb-brand-icon"><svg lucideBike size="17"></svg></span>
          confiancecoursier
        </a>
        <div class="sb-workspace">{{ isCOURIER ? 'Espace coursier' : 'Espace client' }}</div>
        <nav class="sb-nav" aria-label="Navigation">
          @if (isCOURIER) {
            <a routerLink="/courier/dashboard" routerLinkActive="active">
              <svg lucideLayoutDashboard size="16"></svg> Tableau de bord
            </a>
            <a routerLink="/courier/earnings" routerLinkActive="active">
              <svg lucideWallet size="16"></svg> Mes gains
            </a>
            <a routerLink="/courier/history" routerLinkActive="active">
              <svg lucideHistory size="16"></svg> Historique
            </a>
            <a routerLink="/courier/kyc" routerLinkActive="active">
              <svg lucideShieldCheck size="16"></svg> Vérification (KYC)
            </a>
            <a routerLink="/courier/profile" routerLinkActive="active">
              <svg lucideUser size="16"></svg> Mon profil
            </a>
          } @else {
            <a routerLink="/client/dashboard" routerLinkActive="active">
              <svg lucideLayoutDashboard size="16"></svg> Tableau de bord
            </a>
            <a routerLink="/client/create-course" routerLinkActive="active">
              <svg lucidePlusCircle size="16"></svg> Créer une course
            </a>
            <a routerLink="/client/history" routerLinkActive="active">
              <svg lucideHistory size="16"></svg> Historique
            </a>
            <a routerLink="/client/profile" routerLinkActive="active">
              <svg lucideUser size="16"></svg> Mon profil
            </a>
          }
        </nav>
        <div class="sb-bottom">
          <a class="sb-support-link" routerLink="/support">
            <svg lucideLifeBuoy size="15"></svg> Centre d'aide
          </a>
          <div class="sb-account">
            <span class="sb-avatar">{{ userInitials }}</span>
            <div class="sb-account-info">
              <span class="sb-account-name">{{ userName }}</span>
              <span class="sb-account-role">{{ isCOURIER ? 'Coursier' : 'Client' }}</span>
            </div>
            <button class="sb-logout-btn" type="button" aria-label="Déconnexion" (click)="logout()">
              <svg lucideLogOut size="15"></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- ── Zone principale ── -->
      <main class="chat-main">

        <!-- En-tête -->
        <header class="chat-header">
          <div class="chat-header-info">
            <button class="chat-menu-btn" type="button" aria-label="Ouvrir le menu" (click)="toggleSidebar()">
              <svg lucideMenu size="17"></svg>
            </button>
            <div class="chat-avatar">{{ correspondentInitials }}</div>
            <div class="chat-title-wrapper">
              <div class="chat-title">
                {{ correspondentName }}
                @if (isCLIENT && courierVerified) {
                  <span class="badge-verified"><svg lucideShieldCheck size="10"></svg> Vérifié</span>
                }
              </div>
              <div class="chat-subtitle">Salle #{{ roomId }}</div>
            </div>
          </div>

          <div class="chat-header-actions">
            <!-- Retour -->
            <button class="btn btn-secondary btn-sm" (click)="goBack()">
              <svg lucideArrowLeft size="16"></svg> <span class="btn-label">Retour</span>
            </button>

            <!-- TICK-071 : menu ⋮ — Détails / Signaler / Litige vers les bons écrans -->
            <div class="chat-more">
              <button class="btn btn-secondary btn-sm st-min-44px-mh-44px" type="button" aria-label="Plus d'actions"
                      [attr.aria-expanded]="moreOpen()" (click)="moreOpen.set(!moreOpen())">
                ⋮
              </button>
              @if (moreOpen()) {
                <div class="chat-more-menu" role="menu">
                  @if (isCLIENT && courseId) {
                    <button type="button" role="menuitem" (click)="goToCourseDetail()">
                      <svg lucideInfo size="16"></svg> Détails de la course
                    </button>
                  }
                  @if (otherUserId) {
                    <button type="button" role="menuitem" class="danger" (click)="goToReport()">
                      <svg lucideFlag size="16"></svg> Signaler {{ correspondentName }}
                    </button>
                  }
                  @if (courseId) {
                    <button type="button" role="menuitem" class="danger" (click)="goToDispute()">
                      <svg lucideAlertTriangle size="16"></svg> Ouvrir un litige
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Bandeau traçabilité — identique à la maquette coursier -->
        <div class="chat-trace-banner">
          <svg lucideShieldCheck size="14"></svg>
          Toutes les conversations sont enregistrées et vérifiables par l'administration en cas de litige.
        </div>

        <!-- Messages -->
        <div class="chat-body" #chatBody>
          <div class="chat-date-divider">Aujourd'hui</div>

          @for (msg of messages; track $index) {
            @if (msg.messageType === 'OFFER') {
              <!-- Bulle + carte offre -->
              <div class="message-row" [class.incoming]="msg.senderId !== currentUserId" [class.outgoing]="msg.senderId === currentUserId">
                <div class="message-bubble">
                  <span>{{ msg.content }}</span>
                  <div class="offer-card">
                    <h4><svg lucideReceipt size="16"></svg> Détail de l'offre</h4>
                    <div class="offer-detail">
                      <span>Tarif du coursier :</span>
                      <span class="st-fw-700">{{ msg.offerAmount | number:'1.0-0' }} XAF</span>
                    </div>
                    <div class="offer-total">
                      <span>Tarif proposé :</span>
                      <span>{{ msg.offerAmount | number:'1.0-0' }} XAF</span>
                    </div>
                    <p class="offer-note">🔒 Le coût des achats sera ajouté sur la page de paiement sécurisée.</p>
                    @if (canAccept(msg)) {
                      <button class="btn btn-primary st-w-100-mt-4px" (click)="acceptOffer(msg)" [disabled]="accepting">
                        Accepter et payer <svg class="st-marg-4px" lucideArrowRight size="16"></svg>
                      </button>
                    } @else if (msg.offerStatus === 'ACCEPTED') {
                      <div class="st-fs-0-78rem-c-success-ta-center">
                        ✓ Offre acceptée{{ courseStatus === 'ASSIGNED' ? ' — en attente de paiement' : '' }}
                      </div>
                      @if (isCLIENT && courseStatus === 'ASSIGNED') {
                        <button class="btn btn-primary st-w-100-mt-4px" (click)="goToPayment()">
                          Payer maintenant <svg class="st-marg-4px" lucideArrowRight size="16"></svg>
                        </button>
                      }
                    } @else {
                      <div class="st-fs-0-78rem-c-muted-ta-center">
                        {{ offerStatusLabel(msg) }}
                      </div>
                    }
                  </div>
                </div>
                <span class="message-time">{{ msg.createdAt | date:'HH:mm' }}</span>
              </div>
            } @else {
              <div class="message-row" [class.incoming]="msg.senderId !== currentUserId" [class.outgoing]="msg.senderId === currentUserId">
                <div class="message-bubble">{{ msg.content }}</div>
                <span class="message-time">{{ msg.createdAt | date:'HH:mm' }}</span>
              </div>
            }
          }
        </div>

        @if (!connected()) {
          <!-- TICK-071 : connexion coupée — le texte saisi est conservé -->
          <div class="chat-offline" role="status">Reconnexion au chat… vos messages non envoyés restent dans la zone de saisie.</div>
        }

        <!-- Barre de saisie -->
        <div class="chat-input-bar">
          @if (isCOURIER && courseStatus === 'PUBLISHED') {
            <!-- Bouton "Proposer une offre" identique à la maquette coursier -->
            <button class="offer-trigger-btn" type="button" (click)="openOfferModal()">
              <svg lucideFileText size="18"></svg>
              <span>Proposer une offre</span>
            </button>
          }
          <input type="text" class="chat-input" [(ngModel)]="newMessage"
            (keyup.enter)="sendMessage()"
            placeholder="Écrivez votre message…"/>
          <button class="send-btn" [disabled]="!newMessage.trim()" (click)="sendMessage()">
            <svg class="st-marg-1px" lucideSend size="20"></svg>
          </button>
        </div>

      </main>
    </div>

    <!-- ── Modale offre (coursier) — identique à la maquette ── -->
    <div class="modal-overlay" [class.active]="showOfferModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Créer une offre</h3>
          <button class="modal-close" type="button" (click)="closeOfferModal()">
            <svg lucideX size="20"></svg>
          </button>
        </div>

        <p class="st-fs-88rem-c-muted-mb-16px">
          Saisissez votre tarif pour cette course. Les frais de service ({{ commissionRateCourier ?? '…' }}%) seront déduits de ce montant.
        </p>

        <div class="form-group">
          <label class="form-label">Votre tarif (salaire) *</label>
          <div class="offer-input-wrap">
            <input type="number" class="form-input"
              [(ngModel)]="offerAmountInput"
              (ngModelChange)="updateOfferPreview()"
              placeholder="Ex : 10000"
              [min]="tarifMinimum ?? 0" required>
            <span class="currency-suffix">XAF</span>
          </div>
          @if (tarifMinimum !== null) {
            <p class="form-hint">Le tarif minimum autorisé est de {{ tarifMinimum | number:'1.0-0' }} XAF.</p>
          }
        </div>

        @if (pendingReviewCourseId) {
          <!-- TICK-073 : notation obligatoire avant une nouvelle offre -->
          <p class="form-hint st-c-danger-mb-12px" role="alert">
            Notez d'abord votre course terminée avant de proposer un tarif.
            <a [routerLink]="['/courier/rate-client', pendingReviewCourseId]">Noter maintenant</a>
          </p>
        }

        <!-- Récapitulatif financier en temps réel -->
        <div class="offer-preview">
          <div class="offer-preview-row">
            <span class="label">Total facturé (votre tarif) :</span>
            <span class="value">{{ previewTarif | number:'1.0-0' }} XAF</span>
          </div>
          <div class="offer-preview-row">
            <span class="label">Frais plateforme déduits ({{ commissionRateCourier ?? '…' }}%) :</span>
            <span class="value st-c-danger">- {{ previewFrais | number:'1.0-0' }} XAF</span>
          </div>
          <hr class="offer-preview-divider">
          <div class="offer-preview-row offer-preview-net">
            <span class="label">Vous recevrez :</span>
            <span class="value">{{ previewNet | number:'1.0-0' }} XAF</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block"
          [disabled]="!canSendOffer()"
          (click)="sendOffer()">
          Envoyer l'offre dans le chat
        </button>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBody') private chatBodyRef!: ElementRef<HTMLDivElement>;

  roomId = 0;
  courseId = 0;
  currentUserId = 0;
  userRole = '';
  messages: ChatMsg[] = [];
  newMessage = '';
  offerAmountInput: number | null = null;

  // Paramètres de commission chargés depuis l'API (TICK-058 : plus de valeurs en dur)
  tarifMinimum: number | null = null;          // null tant que /api/commissions/public n'a pas répondu
  commissionRateCourier: number | null = null; // idem — aucune valeur métier codée en dur
  accepting = false;

  // Signaux UI
  showOfferModal  = signal(false);
  sidebarOpen     = signal(false);

  // Prévisualisation financière modale
  previewTarif = 0;
  previewFrais = 0;
  previewNet   = 0;

  correspondentName     = 'Correspondant';
  correspondentInitials = 'C';
  courseStatus = ''; // chargé depuis getRoomInfo, pilote la visibilité des boutons (vide = inconnu)

  /** Autre participant du salon (cible d'un signalement) — TICK-071. */
  otherUserId: number | null = null;
  /** KYC du coursier du salon validé (TICK-078). */
  courierVerified = false;
  readonly moreOpen = signal(false);
  /** TICK-073 : course terminée que le coursier doit noter avant toute nouvelle offre. */
  pendingReviewCourseId: number | null = null;
  readonly connected = signal(false);

  private chatSubscription: Subscription | null = null;
  private chatErrorsSubscription: Subscription | null = null;
  private connectionSubscription: Subscription | null = null;
  private shouldScrollToBottom = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private toast: ToastService,
    private http: HttpClient,
    private courseService: CourseService,
  ) {}

  get isCLIENT(): boolean  { return this.userRole === 'CLIENT'; }
  get isCOURIER(): boolean { return this.userRole === 'COURIER'; }

  get userName(): string {
    return this.authService.getCurrentUserFullName()
      || this.authService.getCurrentUserEmail().split('@')[0]
      || 'Mon compte';
  }

  get userInitials(): string {
    const name = this.authService.getCurrentUserFullName().trim();
    if (name) return name.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const email = this.authService.getCurrentUserEmail();
    return email ? email.substring(0, 2).toUpperCase() : 'CC';
  }

  ngOnInit(): void {
    this.roomId        = Number(this.route.snapshot.paramMap.get('roomId'));
    this.currentUserId = this.authService.getCurrentUserId();
    this.userRole      = this.authService.getCurrentUserRole();

    // ── 1. Charger les infos de la room pour afficher le nom du correspondant ──
    this.chatService.getRoomInfo(this.roomId).subscribe({
      next: (room: any) => {
        // Stocker le courseId — nécessaire pour la navigation vers /client/pay
        this.courseId = room.courseId ?? 0;
        // Stocker le statut de la course (pilote la visibilité des boutons TICK-059)
        this.courseStatus = room.courseStatus ?? '';
        // TICK-078 : « Vérifié » uniquement si le KYC du coursier est réellement validé
        this.courierVerified = room.courierVerified === true;
        // Le correspondant = l'autre participant (pas soi-même)
        this.otherUserId = (this.isCOURIER ? room.clientId : room.courierId) ?? null;
        if (this.isCOURIER) {
          // Côté coursier → le correspondant est le client
          this.correspondentName = room.clientName ?? 'Client';
        } else {
          // Côté client → le correspondant est le coursier
          this.correspondentName = room.courierName ?? 'Coursier';
        }
        // Calcul des initiales (2 premières lettres des mots)
        this.correspondentInitials = this.correspondentName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w: string) => w.charAt(0).toUpperCase())
          .join('');
      },
      error: () => {
        // Pas bloquant : on reste sur la valeur par défaut
      }
    });

    // ── 2. Charger l'historique des messages ──
    this.chatService.getMessages(this.roomId).subscribe({
      next: (history: any[]) => {
        this.messages = history.map(m => ({ ...m, messageType: m.messageType ?? 'TEXT' }));
        this.shouldScrollToBottom = true;
      },
      error: () => this.toast.error('Impossible de charger l\'historique du chat.')
    });

    // ── 3. Connexion WebSocket et abonnement à la room ──
    // Refus du serveur (non participant, offre non autorisée…) — TICK-055
    this.chatErrorsSubscription = this.chatService.errors$.subscribe(msg => this.toast.error(msg));
    this.connectionSubscription = this.chatService.connected$.subscribe(ok => this.connected.set(ok));
    this.chatService.connect();

    this.chatSubscription = this.chatService.subscribeToRoom(this.roomId).subscribe({
      next: (msg: any) => {
        const chatMsg: ChatMsg = { ...msg, messageType: msg.messageType ?? 'TEXT' };
        if (chatMsg.messageType === 'OFFER' && chatMsg.offerId) {
          // Une nouvelle offre du coursier remplace la précédente (un seul coursier par salon)
          this.messages.forEach(m => {
            if (m.offerId && m.offerStatus === 'ACTIVE') m.offerStatus = 'SUPERSEDED';
          });
        }
        if (!this.messages.find(m => m.id === chatMsg.id)) {
          this.messages.push(chatMsg);
          this.shouldScrollToBottom = true;
        }
      }
    });
    // ── 3 bis. TICK-073 : un avis dû bloque les nouvelles offres du coursier ──
    if (this.isCOURIER) {
      this.courseService.getPendingReviews().subscribe({
        next: (list) => this.pendingReviewCourseId = list[0]?.courseId ?? null,
        error: warnLoadFailed('avis en attente du coursier', 'offres non bloquées côté écran (le serveur revérifie)'),
      });
    }

    // ── 4. Charger le tarif minimum et la commission coursier (TICK-058) ──
    this.http.get<any>('/api/commissions/public').subscribe({
      next: (data) => {
        this.tarifMinimum          = data.tarifMinimumCoursier  ?? null;
        this.commissionRateCourier = data.commissionRateCourier ?? null;
      },
      error: () => {
        // Sans paramètres serveur, l'envoi d'offre reste désactivé (le serveur revérifie de toute façon)
        this.toast.error('Impossible de charger le tarif minimum. Réessayez plus tard.');
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
    this.chatErrorsSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
    this.chatService.disconnect(); // libère l'abonnement STOMP et ferme la socket
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar():  void { this.sidebarOpen.set(false); }

  // ── Messages ───────────────────────────────────────────────────────────────
  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content) return;
    // Le texte n'est effacé que si l'envoi a bien été transmis (sinon un toast s'affiche).
    if (this.chatService.sendMessage(this.roomId, content)) {
      this.newMessage = '';
    }
  }

  // ── Modale offre (coursier) ────────────────────────────────────────────────
  openOfferModal(): void {
    this.offerAmountInput = null;
    this.previewTarif = 0;
    this.previewFrais = 0;
    this.previewNet   = 0;
    this.showOfferModal.set(true);
  }

  closeOfferModal(): void {
    this.showOfferModal.set(false);
  }

  /** Mise à jour temps réel du récapitulatif financier */
  updateOfferPreview(): void {
    const tarif = this.offerAmountInput ?? 0;
    const frais = Math.round(tarif * ((this.commissionRateCourier ?? 0) / 100));
    this.previewTarif = tarif;
    this.previewFrais = frais;
    this.previewNet   = tarif - frais;
  }

  sendOffer(): void {
    if (!this.canSendOffer()) return;
    const amount = this.offerAmountInput!;
    const sent = this.chatService.sendOffer(
      this.roomId,
      amount,
      `Je vous propose un tarif de ${amount.toLocaleString('fr-FR')} XAF pour cette course.`
    );
    if (!sent) return;
    this.closeOfferModal();
    this.toast.success('Offre envoyée ! En attente du paiement du client.');
  }

  // ── Accepter l'offre (client) ──────────────────────────────────────────────
  /** « Accepter » : client, offre ACTIVE, course encore PUBLISHED (TICK-059). */
  canAccept(msg: ChatMsg): boolean {
    return this.isCLIENT && this.courseStatus === 'PUBLISHED'
        && !!msg.offerId && msg.offerStatus === 'ACTIVE';
  }

  offerStatusLabel(msg: ChatMsg): string {
    switch (msg.offerStatus) {
      case 'ACTIVE':     return this.isCLIENT ? 'Offre en cours' : 'En attente de réponse du client';
      case 'SUPERSEDED': return 'Offre remplacée';
      case 'REJECTED':   return 'Offre non retenue';
      default:           return 'Offre expirée';
    }
  }

  canSendOffer(): boolean {
    return this.tarifMinimum !== null
        && !this.pendingReviewCourseId
        && !!this.offerAmountInput
        && this.offerAmountInput >= this.tarifMinimum;
  }

  acceptOffer(msg: ChatMsg): void {
    if (!this.canAccept(msg) || this.accepting) return;
    this.accepting = true;
    this.courseService.acceptOffer(this.courseId, msg.offerId!).subscribe({
      next: () => {
        this.courseStatus = 'ASSIGNED'; // bloquer tout nouveau "Accepter"
        this.messages.forEach(m => {
          if (m.offerId && m.offerStatus === 'ACTIVE') m.offerStatus = 'SUPERSEDED';
        });
        msg.offerStatus = 'ACCEPTED';
        this.toast.success('Offre acceptée ! Vous allez être redirigé vers le paiement.');
        setTimeout(() => this.goToPayment(), 1200);
      },
      error: (err) => {
        this.accepting = false;
        this.toast.error(err?.error?.message ?? "Impossible d'accepter cette offre.");
      }
    });
  }

  goToPayment(): void {
    this.router.navigate(['/client/pay', this.courseId]);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate([this.isCOURIER ? '/courier/dashboard' : '/client/dashboard']);
  }

  goToCourseDetail(): void {
    this.moreOpen.set(false);
    this.router.navigate(['/client/course-detail', this.courseId]);
  }

  goToReport(): void {
    this.moreOpen.set(false);
    if (this.otherUserId) this.router.navigate(['/report-user', this.otherUserId]);
  }

  goToDispute(): void {
    this.moreOpen.set(false);
    this.router.navigate([this.isCOURIER ? '/courier/dispute-form' : '/client/dispute-form', this.courseId]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatBodyRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
