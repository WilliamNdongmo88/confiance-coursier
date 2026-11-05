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
import { Subscription } from 'rxjs';

interface ChatMsg {
  id?: number;
  roomId: number;
  senderId: number;
  content: string;
  messageType: string;  // TEXT | OFFER | SYSTEM
  offerAmount?: number | null;
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
      overflow: hidden;
    }

    /* ── Shell : sidebar + main ── */
    .chat-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--cc-paper, #f7f8f5);
    }

    /* ── Zone principale ── */
    .chat-main {
      flex: 1;
      margin-left: var(--sidebar-width, 242px);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      transition: margin-left 0.22s ease;
      min-width: 0;
    }

    /* ── En-tête ── */
    .chat-header {
      background: var(--cc-white, #fff);
      border-bottom: 1px solid var(--cc-line, #e2e8e2);
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
      background: var(--primary-light, #e4f1e8);
      color: var(--primary, #17634f);
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
      color: var(--cc-ink, #18271f);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      line-height: 1.3;
    }

    .chat-subtitle {
      font-size: 0.8rem;
      color: var(--cc-muted, #6d7a71);
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
      background: var(--cc-success-bg, #e4f3e9);
      color: var(--cc-success, #26845d);
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
      border: 1px solid var(--cc-line, #e2e8e2);
      border-radius: 9px;
      background: var(--cc-white, #fff);
      color: var(--cc-forest, #123b32);
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
      background: var(--bg-card, #fff);
      border-bottom: 1px solid var(--cc-line, #e2e8e2);
      font-size: 0.75rem;
      color: var(--cc-muted, #6d7a71);
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
      background: var(--cc-paper, #f7f8f5);
    }

    .chat-date-divider {
      text-align: center;
      font-size: 0.8rem;
      color: var(--cc-muted, #6d7a71);
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
      background: var(--cc-line, #e2e8e2);
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
      background: var(--cc-white, #fff);
      color: var(--cc-ink, #18271f);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--cc-line, #e2e8e2);
    }
    .message-row.outgoing .message-bubble {
      background: var(--primary, #17634f);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .message-time {
      font-size: 0.75rem;
      color: var(--cc-muted, #6d7a71);
      margin-top: 4px;
    }

    /* ── Carte d'offre ── */
    .offer-card {
      background: var(--cc-paper, #f7f8f5);
      border: 1px solid var(--primary, #17634f);
      border-radius: var(--radius-md, 10px);
      padding: 16px;
      margin-top: 8px;
      width: 100%;
      max-width: 300px;
    }
    .offer-card h4 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--cc-ink, #18271f);
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
      color: var(--cc-muted, #6d7a71);
    }
    .offer-total {
      display: flex;
      justify-content: space-between;
      font-size: 1rem;
      font-weight: 700;
      color: var(--cc-ink, #18271f);
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed var(--cc-line, #e2e8e2);
    }
    .offer-note {
      font-size: 0.75rem;
      color: var(--cc-success, #26845d);
      margin: 8px 0 12px;
      line-height: 1.4;
    }

    /* ── Barre de saisie ── */
    .chat-input-bar {
      background: var(--cc-white, #fff);
      border-top: 1px solid var(--cc-line, #e2e8e2);
      padding: 12px 24px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }

    .chat-input {
      flex: 1;
      min-width: 0;
      padding: 12px 16px;
      border: 1px solid var(--cc-line, #e2e8e2);
      border-radius: 999px;
      background: var(--cc-paper, #f7f8f5);
      color: var(--cc-ink, #18271f);
      font-family: inherit;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: var(--primary, #17634f); }

    .send-btn {
      background: var(--primary, #17634f);
      color: #fff;
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
    .send-btn:hover  { background: var(--primary-hover, #104d3d); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Bouton "Proposer une offre" dans la barre de saisie (coursier) */
    .offer-trigger-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 999px;
      border: none;
      background: var(--primary, #17634f);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .offer-trigger-btn:hover { background: var(--primary-hover, #104d3d); }

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
      background: var(--cc-white, #fff);
      border: 1px solid var(--cc-line, #e2e8e2);
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
      color: var(--cc-ink, #18271f);
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--cc-muted, #6d7a71);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .modal-close:hover { background: var(--cc-paper, #f7f8f5); }

    .offer-input-wrap {
      position: relative;
    }
    .offer-input-wrap .currency-suffix {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--cc-muted, #6d7a71);
      font-size: 0.9rem;
      pointer-events: none;
    }
    .offer-input-wrap .form-input {
      padding-right: 50px;
    }

    .form-hint {
      margin-top: 6px;
      font-size: 0.8rem;
      color: var(--danger, #dc2626);
    }

    .offer-preview {
      background: var(--cc-paper, #f7f8f5);
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
    .offer-preview-row .label { color: var(--cc-muted, #6d7a71); }
    .offer-preview-row .value { font-weight: 700; }
    .offer-preview-divider {
      border: none;
      border-top: 1px dashed var(--cc-line, #e2e8e2);
      margin: 8px 0;
    }
    .offer-preview-net .label,
    .offer-preview-net .value { color: var(--cc-success, #26845d); font-weight: 700; }

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
    :host-context([data-theme="dark"]) .chat-input-bar { background: #1F2C26; border-color: #2E4037; }
    :host-context([data-theme="dark"]) .chat-trace-banner { background: #1a2e28; border-color: #2E4037; color: #a8bfb4; }
    :host-context([data-theme="dark"]) .chat-body { background: #18221D; }
    :host-context([data-theme="dark"]) .chat-title { color: #e8f0ec; }
    :host-context([data-theme="dark"]) .chat-subtitle { color: #7fa898; }
    :host-context([data-theme="dark"]) .chat-date-divider { color: #7fa898; }
    :host-context([data-theme="dark"]) .chat-date-divider::before,
    :host-context([data-theme="dark"]) .chat-date-divider::after { background: #2E4037; }
    :host-context([data-theme="dark"]) .message-row.incoming .message-bubble {
      background: #1F2C26; border-color: #2E4037; color: #e8f0ec;
    }
    :host-context([data-theme="dark"]) .message-row.outgoing .message-bubble {
      background: #17634f; color: #fff;
    }
    :host-context([data-theme="dark"]) .message-time { color: #7fa898; }
    :host-context([data-theme="dark"]) .chat-input {
      background: #1a2e28; border-color: #2E4037; color: #e8f0ec;
    }
    :host-context([data-theme="dark"]) .chat-input::placeholder { color: #5a7a6e; }
    :host-context([data-theme="dark"]) .offer-card {
      background: #1a2e28; border-color: #d7ed9a;
    }
    :host-context([data-theme="dark"]) .offer-card h4 { color: #e8f0ec; }
    :host-context([data-theme="dark"]) .offer-total { color: #e8f0ec; border-color: #2E4037; }
    :host-context([data-theme="dark"]) .offer-detail { color: #a8bfb4; }
    :host-context([data-theme="dark"]) .modal-content { background: #1F2C26; border-color: #2E4037; }
    :host-context([data-theme="dark"]) .modal-title { color: #e8f0ec; }
    :host-context([data-theme="dark"]) .offer-preview { background: #18221D; }
    :host-context([data-theme="dark"]) .offer-preview-row .label { color: #7fa898; }
    :host-context([data-theme="dark"]) .offer-preview-row .value { color: #e8f0ec; }
    :host-context([data-theme="dark"]) .badge-verified { background: #1a3d2e; color: #6fcf97; }
    :host-context([data-theme="dark"]) .chat-header-info .chat-avatar { background: #1a3d2e; color: #d7ed9a; }
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
                <span class="badge-verified">
                  <svg lucideShieldCheck size="10"></svg> Vérifié
                </span>
              </div>
              <div class="chat-subtitle">Salle #{{ roomId }}</div>
            </div>
          </div>

          <div class="chat-header-actions">
            <!-- Retour -->
            <button class="btn btn-secondary btn-sm" (click)="goBack()">
              <svg lucideArrowLeft size="16"></svg> <span class="btn-label">Retour</span>
            </button>

            @if (isCLIENT) {
              <!-- Détails (client) -->
              <button class="btn btn-secondary btn-sm" (click)="goToCourseDetail()">
                <svg lucideInfo size="16"></svg> <span class="btn-label">Détails</span>
              </button>
            }

            <!-- Signaler -->
            <button class="btn btn-danger btn-sm" (click)="goToReport()">
              <svg lucideFlag size="16"></svg> <span class="btn-label">Signaler</span>
            </button>

            @if (isCOURIER) {
              <!-- Litige (coursier) -->
              <button class="btn btn-danger btn-sm" (click)="goToDispute()">
                <svg lucideAlertTriangle size="16"></svg> <span class="btn-label">Litige</span>
              </button>
            }
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
                      <span style="font-weight:700;">{{ msg.offerAmount | number:'1.0-0' }} XAF</span>
                    </div>
                    <div class="offer-total">
                      <span>Tarif proposé :</span>
                      <span>{{ msg.offerAmount | number:'1.0-0' }} XAF</span>
                    </div>
                    <p class="offer-note">🔒 Le coût des achats sera ajouté sur la page de paiement sécurisée.</p>
                    @if (isCLIENT) {
                      <button class="btn btn-primary" style="width:100%;margin-top:4px;" (click)="acceptOffer(msg)">
                        Accepter et payer <svg lucideArrowRight size="16" style="margin-left:4px;"></svg>
                      </button>
                    } @else {
                      <div style="font-size:0.78rem;color:var(--cc-muted);text-align:center;padding:4px 0;">
                        En attente de réponse du client
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

        <!-- Barre de saisie -->
        <div class="chat-input-bar">
          @if (isCOURIER) {
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
            <svg lucideSend size="20" style="margin-left:-1px;"></svg>
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

        <p style="font-size:.88rem;color:var(--cc-muted);margin-bottom:16px;">
          Saisissez votre tarif pour cette course. Les frais de service (20%) seront déduits de ce montant.
        </p>

        <div class="form-group">
          <label class="form-label">Votre tarif (salaire) *</label>
          <div class="offer-input-wrap">
            <input type="number" class="form-input"
              [(ngModel)]="offerAmountInput"
              (ngModelChange)="updateOfferPreview()"
              placeholder="Ex : 10000"
              min="5000" required>
            <span class="currency-suffix">XAF</span>
          </div>
          <p class="form-hint">Le tarif minimum autorisé est de 5 000 XAF.</p>
        </div>

        <!-- Récapitulatif financier en temps réel -->
        <div class="offer-preview">
          <div class="offer-preview-row">
            <span class="label">Total facturé (votre tarif) :</span>
            <span class="value">{{ previewTarif | number:'1.0-0' }} XAF</span>
          </div>
          <div class="offer-preview-row">
            <span class="label">Frais plateforme déduits (20%) :</span>
            <span class="value" style="color:var(--danger,#dc2626);">- {{ previewFrais | number:'1.0-0' }} XAF</span>
          </div>
          <hr class="offer-preview-divider">
          <div class="offer-preview-row offer-preview-net">
            <span class="label">Vous recevrez :</span>
            <span class="value">{{ previewNet | number:'1.0-0' }} XAF</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block"
          [disabled]="!offerAmountInput || offerAmountInput < 5000"
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

  // Signaux UI
  showOfferModal  = signal(false);
  sidebarOpen     = signal(false);

  // Prévisualisation financière modale
  previewTarif = 0;
  previewFrais = 0;
  previewNet   = 0;

  correspondentName     = 'Correspondant';
  correspondentInitials = 'C';

  private chatSubscription: Subscription | null = null;
  private chatErrorsSubscription: Subscription | null = null;
  private shouldScrollToBottom = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private toast: ToastService,
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
        // Le correspondant = l'autre participant (pas soi-même)
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
    this.chatService.connect();

    this.chatSubscription = this.chatService.subscribeToRoom(this.roomId).subscribe({
      next: (msg: any) => {
        const chatMsg: ChatMsg = { ...msg, messageType: msg.messageType ?? 'TEXT' };
        if (!this.messages.find(m => m.id === chatMsg.id)) {
          this.messages.push(chatMsg);
          this.shouldScrollToBottom = true;
        }
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
    this.chatService.disconnect();
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
    const frais = tarif * 0.20;
    this.previewTarif = tarif;
    this.previewFrais = frais;
    this.previewNet   = tarif - frais;
  }

  sendOffer(): void {
    if (!this.offerAmountInput || this.offerAmountInput < 5000) return;
    const amount = this.offerAmountInput;
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
  acceptOffer(msg: ChatMsg): void {
    if (!msg.offerAmount) return;
    this.router.navigate(['/client/pay', this.roomId], {
      queryParams: { amount: msg.offerAmount, courseId: this.courseId }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate([this.isCOURIER ? '/courier/dashboard' : '/client/dashboard']);
  }

  goToCourseDetail(): void {
    // Le courseId n'est pas dans la route chat — on revient au dashboard
    this.router.navigate(['/client/dashboard']);
  }

  goToReport(): void {
    // On signale le correspondant — sans son userId on redirige vers le dashboard
    this.router.navigate([this.isCOURIER ? '/courier/dashboard' : '/client/dashboard']);
  }

  goToDispute(): void {
    this.router.navigate([this.isCOURIER ? '/courier/dashboard' : '/client/dashboard']);
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
