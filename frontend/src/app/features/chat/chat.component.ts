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
  ],
  styles: [`
    /* ── Hôte : pleine hauteur ── */
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Shell : flex row (sidebar + main) ── */
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
      margin-top: 2px;
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

    /* Hamburger — masqué en desktop */
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
      background: #fffbea;
      border-bottom: 1px solid #fde68a;
      font-size: 0.78rem;
      color: #92400e;
      flex-shrink: 0;
    }

    /* ── Zone messages ── */
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--cc-paper, #f7f8f5);
    }

    .chat-date-divider {
      text-align: center;
      font-size: 0.8rem;
      color: var(--cc-muted, #6d7a71);
      margin: 8px 0;
      position: relative;
    }
    .chat-date-divider::before,
    .chat-date-divider::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 35%;
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
      line-height: 1.5;
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
      border: 1.5px solid var(--primary, #17634f);
      border-radius: var(--radius-md, 10px);
      padding: 16px;
      margin-top: 10px;
      width: 100%;
      max-width: 300px;
    }
    .offer-card h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--cc-ink, #18271f);
      margin: 0 0 10px;
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

    /* ── Panel offre (coursier) ── */
    .offer-panel {
      background: var(--cc-white, #fff);
      border: 1px solid var(--cc-line, #e2e8e2);
      border-radius: var(--radius-md, 10px);
      padding: 16px;
      margin: 0 24px 12px;
      flex-shrink: 0;
    }
    .offer-panel h5 {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--cc-ink, #18271f);
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .offer-panel-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    .offer-panel-row .fg { flex: 1; }
    .offer-panel-row label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--cc-muted, #6d7a71);
      margin-bottom: 4px;
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
    .send-btn:hover { background: var(--primary-hover, #104d3d); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .offer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1.5px solid var(--primary, #17634f);
      background: transparent;
      color: var(--primary, #17634f);
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .offer-btn:hover { background: var(--primary-light, #e4f1e8); }

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
      .offer-panel { margin: 0 12px 10px; }
    }
    @media (max-width: 640px) {
      .message-row { max-width: 92%; }
      .chat-header-actions .btn-label { display: none; }
      .chat-header-actions .btn { padding: 7px 9px; min-width: 34px; justify-content: center; }
      .chat-title { font-size: 0.88rem; }
    }

    /* ── Dark mode ── */
    [data-theme="dark"] .chat-header,
    [data-theme="dark"] .chat-input-bar,
    [data-theme="dark"] .offer-panel { background: #1F2C26; border-color: #2E4037; }
    [data-theme="dark"] .chat-body { background: #18221D; }
    [data-theme="dark"] .message-row.incoming .message-bubble {
      background: #1F2C26; border-color: #2E4037; color: #F3F7F5;
    }
    [data-theme="dark"] .chat-input { background: #1F2C26; border-color: #2E4037; color: #F3F7F5; }
    [data-theme="dark"] .offer-card { background: #1F2C26; }
    [data-theme="dark"] .chat-trace-banner { background: #2c2210; border-color: #7a5a1a; color: #f0c96a; }
  `],
  template: `
    <!-- Overlay mobile -->
    <div class="chat-overlay" [class.active]="sidebarOpen()" (click)="closeSidebar()"></div>

    <div class="chat-shell">

      <!-- ── Sidebar (reprise de la sidebar globale pour le layout chat) ── -->
      <aside class="app-sidebar" [class.open]="sidebarOpen()" id="chat-sidebar">
        <a class="sb-brand" routerLink="/client/dashboard">
          <span class="sb-brand-icon"><svg lucideBike size="17"></svg></span>
          confiancecoursier
        </a>
        <div class="sb-workspace">{{ isCOURIER ? 'Espace coursier' : 'Espace client' }}</div>
        <nav class="sb-nav" aria-label="Navigation">
          @if (isCOURIER) {
            <a routerLink="/courier/dashboard" routerLinkActive="active">
              <svg lucideLayoutDashboard size="16"></svg> Vue d'ensemble
            </a>
          } @else {
            <a routerLink="/client/dashboard" routerLinkActive="active">
              <svg lucideLayoutDashboard size="16"></svg> Vue d'ensemble
            </a>
            <a routerLink="/client/create-course" routerLinkActive="active">
              <svg lucidePlus size="16"></svg> Nouvelle course
            </a>
          }
          <a routerLink="/chat/{{ roomId }}" routerLinkActive="active">
            <svg lucideMessageSquare size="16"></svg> Chat actuel
          </a>
          <a routerLink="/client/history" routerLinkActive="active">
            <svg lucideClock size="16"></svg> Historique
          </a>
          <a routerLink="/client/profile" routerLinkActive="active">
            <svg lucideUser size="16"></svg> Mon profil
          </a>
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
            <!-- Hamburger mobile -->
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
            <button class="btn btn-secondary btn-sm" (click)="goBack()">
              <svg lucideArrowLeft size="16"></svg> <span class="btn-label">Retour</span>
            </button>
            <button class="btn btn-secondary btn-sm" disabled>
              <svg lucideInfo size="16"></svg> <span class="btn-label">Détails</span>
            </button>
            <button class="btn btn-danger btn-sm" disabled>
              <svg lucideFlag size="16"></svg> <span class="btn-label">Signaler</span>
            </button>
          </div>
        </header>

        <!-- Bandeau traçabilité -->
        <div class="chat-trace-banner">
          <svg lucideAlertTriangle size="14"></svg>
          Les échanges sont enregistrés et peuvent être consultés en cas de litige.
        </div>

        <!-- Messages -->
        <div class="chat-body" #chatBody>
          <div class="chat-date-divider">Aujourd'hui</div>

          @for (msg of messages; track $index) {
            @if (msg.messageType === 'OFFER') {
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
                      <button class="btn btn-primary" style="width:100%;" (click)="acceptOffer(msg)">
                        Accepter et payer <svg lucideArrowRight size="16" style="margin-left:4px;"></svg>
                      </button>
                    } @else {
                      <div style="font-size:0.78rem;color:var(--cc-muted);text-align:center;margin-top:4px;">
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

        <!-- Panel offre (COURIER) -->
        @if (isCOURIER && showOfferPanel()) {
          <div class="offer-panel">
            <h5><svg lucideReceipt size="15"></svg> Proposer un tarif</h5>
            <div class="offer-panel-row">
              <div class="fg">
                <label for="offerAmountInput">Montant (XAF)</label>
                <input id="offerAmountInput" type="number" class="form-input"
                  [(ngModel)]="offerAmountInput" placeholder="Ex : 5000" min="1"/>
              </div>
              <button class="btn btn-primary" [disabled]="!offerAmountInput || offerAmountInput <= 0" (click)="sendOffer()">
                Envoyer
              </button>
              <button class="btn btn-ghost btn-sm" (click)="showOfferPanel.set(false)">Annuler</button>
            </div>
          </div>
        }

        <!-- Barre de saisie -->
        <div class="chat-input-bar">
          @if (isCOURIER && !showOfferPanel()) {
            <button class="offer-btn" (click)="showOfferPanel.set(true)">
              <svg lucideReceipt size="15"></svg> Offre
            </button>
          }
          <input type="text" class="chat-input" [(ngModel)]="newMessage"
            (keyup.enter)="sendMessage()" placeholder="Écrivez votre message…"/>
          <button class="send-btn" [disabled]="!newMessage.trim()" (click)="sendMessage()">
            <svg lucideSend size="20" style="margin-left:-1px;"></svg>
          </button>
        </div>

      </main>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBody') private chatBodyRef!: ElementRef<HTMLDivElement>;

  roomId = 0;
  currentUserId = 0;
  userRole = '';
  messages: ChatMsg[] = [];
  newMessage = '';
  offerAmountInput: number | null = null;
  showOfferPanel = signal(false);
  sidebarOpen = signal(false);
  correspondentName = 'Correspondant';
  correspondentInitials = 'CC';

  private chatSubscription: Subscription | null = null;
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
    return this.authService.getCurrentUserFullName() || this.authService.getCurrentUserEmail().split('@')[0] || 'Mon compte';
  }

  get userInitials(): string {
    const name = this.authService.getCurrentUserFullName().trim();
    if (name) return name.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const email = this.authService.getCurrentUserEmail();
    return email ? email.substring(0, 2).toUpperCase() : 'CC';
  }

  ngOnInit(): void {
    this.roomId = Number(this.route.snapshot.paramMap.get('roomId'));
    this.currentUserId = this.authService.getCurrentUserId();
    this.userRole = this.authService.getCurrentUserRole();

    this.correspondentName = 'Correspondant';
    this.correspondentInitials = 'C';

    this.chatService.getMessages(this.roomId).subscribe({
      next: (history: any[]) => {
        this.messages = history.map(m => ({ ...m, messageType: m.messageType ?? 'TEXT' }));
        this.shouldScrollToBottom = true;
      },
      error: () => this.toast.error('Impossible de charger l\'historique du chat.')
    });

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
    this.chatService.disconnect();
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void  { this.sidebarOpen.set(false); }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content) return;
    this.chatService.sendMessage(this.roomId, this.currentUserId, content);
    this.newMessage = '';
  }

  sendOffer(): void {
    if (!this.offerAmountInput || this.offerAmountInput <= 0) return;
    const amount = this.offerAmountInput;
    this.chatService.sendOffer(this.roomId, this.currentUserId, amount,
      `Je vous propose un tarif de ${amount.toLocaleString('fr-FR')} XAF pour cette course.`);
    this.offerAmountInput = null;
    this.showOfferPanel.set(false);
    this.toast.success('Offre envoyée !');
  }

  acceptOffer(msg: ChatMsg): void {
    if (!msg.offerAmount) return;
    this.router.navigate(['/client/pay', this.roomId], { queryParams: { amount: msg.offerAmount } });
  }

  goBack(): void {
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
