import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminCourseDetail, AdminService, DisputeProof } from '../../../core/services/admin.service';
import { ChatService } from '../../../core/services/chat.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import { DISPUTE_DONE, DISPUTE_MOTIFS } from '../disputes/dispute-labels';
import {
  LucideAlertTriangle, LucideArrowLeft, LucideChevronRight, LucideFileText, LucideMessageSquare, LucidePlay, LucideScale,
} from '@lucide/angular';

interface Msg { id: number; senderId: number; content: string | null; attachmentType: string | null; offerAmount: number | null; createdAt: string; }

const LEDGER: Record<string, string> = {
  HOLD: 'Paiement reçu, bloqué en séquestre',
  COURIER_PAYOUT: 'Versé au coursier',
  PLATFORM_FEE: 'Gardé par la plateforme',
  REFUND_CLIENT: 'Remboursé au client',
};

/**
 * Dossier d'une course pour l'admin (TICK-091) : parties, montants, chronologie, registre du séquestre,
 * preuves, discussions en lecture, litiges, et annulation avec motif obligatoire.
 */
@Component({
  selector: 'app-admin-course-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StatusBadgeComponent, MediaViewerComponent,
    LucideAlertTriangle, LucideArrowLeft, LucideChevronRight, LucideFileText, LucideMessageSquare, LucidePlay, LucideScale],
  styles: [`
    :host { display: block; min-width: 0; --dm: #56635c; }
    :host-context([data-theme="dark"]) { --dm: #B0C0B7; }
    .d { max-width: 1100px; margin: 0 auto; }
    .back { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; margin-bottom: 8px; color: var(--primary); font-weight: 700; font-size: 14px; text-decoration: none; }
    .head h1 { margin: 0 0 8px; font-size: clamp(22px, 3.4vw, 28px); line-height: 1.2; letter-spacing: -.03em; font-weight: 800; color: var(--cc-ink); overflow-wrap: anywhere; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-bottom: 14px; font-size: 13.5px; color: var(--dm); }
    .alert { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 14px; border-radius: 12px; background: var(--cc-danger-bg); color: var(--cc-ink); font-size: 13.5px; line-height: 1.45; }
    .alert svg { flex: none; margin-top: 1px; color: var(--cc-danger); }
    .alert.info { background: var(--cc-paper-2); }
    .alert.info svg { color: var(--dm); }
    .grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 14px; align-items: start; }
    .col { display: grid; gap: 14px; min-width: 0; }
    .box { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; padding: 16px 18px; min-width: 0; animation: d-in .4s cubic-bezier(.16,1,.3,1) both; }
    .box h2 { margin: 0 0 10px; font-size: 15.5px; font-weight: 750; color: var(--cc-ink); display: flex; align-items: center; gap: 8px; }
    .who { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
    .p { padding: 12px; border-radius: 12px; border: 1px solid var(--cc-line); min-width: 0; }
    .p small { display: block; font-size: 12px; font-weight: 700; color: var(--dm); margin-bottom: 4px; }
    .p b { display: block; font-size: 14.5px; color: var(--cc-ink); overflow-wrap: anywhere; }
    .p span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--dm); overflow-wrap: anywhere; }
    .p a { color: var(--primary); text-decoration: none; font-weight: 650; }
    .lines div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 13.5px; color: var(--dm); border-top: 1px solid var(--cc-line); }
    .lines div:first-child { border-top: 0; }
    .lines b { color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .lines .tot { font-size: 14.5px; }
    .tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
    .tl li { position: relative; padding: 0 0 12px 18px; font-size: 13.5px; color: var(--cc-ink); }
    .tl li::before { content: ''; position: absolute; left: 3px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
    .tl li::after { content: ''; position: absolute; left: 6.5px; top: 15px; bottom: 0; width: 1px; background: var(--cc-line); }
    .tl li:last-child::after { display: none; }
    .tl span { display: block; font-size: 12px; color: var(--dm); }
    .led { display: grid; gap: 6px; }
    .led div { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--cc-paper-2); font-size: 13px; }
    .led b { display: block; color: var(--cc-ink); font-size: 13.5px; }
    .led span { color: var(--dm); }
    .led .amt { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--cc-ink); }
    .led .in { color: var(--cc-success); }
    .muted { margin: 0; font-size: 13.5px; color: var(--dm); }
    .proofs { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
    .pf { position: relative; aspect-ratio: 1; padding: 0; border: 1px solid var(--cc-line); border-radius: 11px; overflow: hidden; background: #0f1a15; cursor: zoom-in; }
    .pf img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pf .ph { width: 100%; height: 100%; display: grid; place-items: center; color: #cfdcd4; }
    .pf .tag { position: absolute; left: 5px; bottom: 5px; padding: 2px 7px; border-radius: 7px; background: rgba(0,0,0,.65); color: #fff; font-size: 11px; font-weight: 750; }
    .room { border-top: 1px solid var(--cc-line); }
    .room:first-of-type { border-top: 0; }
    .room button { width: 100%; min-height: 46px; display: flex; align-items: center; gap: 8px; padding: 8px 0; border: 0; background: none; text-align: left; font: inherit; color: var(--cc-ink); cursor: pointer; }
    .room button b { flex: 1; font-size: 14px; }
    .room button small { font-size: 12px; color: var(--dm); }
    .chat { max-height: 320px; overflow: auto; display: grid; gap: 8px; padding: 10px; margin-bottom: 10px; border-radius: 12px; background: var(--cc-paper-2); }
    .m { max-width: 85%; padding: 8px 11px; border-radius: 12px; background: var(--cc-white); border: 1px solid var(--cc-line); font-size: 13px; line-height: 1.45; color: var(--cc-ink); overflow-wrap: anywhere; }
    .m.cour { justify-self: end; background: var(--cc-success-bg); }
    .m small { display: block; margin-bottom: 2px; font-size: 11.5px; font-weight: 700; color: var(--dm); }
    .dl { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--cc-line); color: inherit; text-decoration: none; }
    .dl:first-of-type { border-top: 0; }
    .dl b { flex: 1; min-width: 0; font-size: 13.5px; color: var(--cc-ink); }
    .chip { padding: 2px 9px; border-radius: 99px; font-size: 12px; font-weight: 750; background: var(--cc-paper-2); color: var(--dm); white-space: nowrap; }
    .chip.open { background: var(--cc-warning-bg); color: #8a5a14; }
    .cancel { border-color: color-mix(in oklab, var(--cc-danger) 35%, var(--cc-line)); }
    .cancel p { margin: 0 0 10px; font-size: 13.5px; line-height: 1.5; color: var(--dm); }
    .cancel textarea { width: 100%; min-height: 90px; }
    .cancel .hint { display: block; margin-top: 4px; font-size: 12px; color: var(--dm); }
    .cancel .acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .btn-d { min-height: 46px; padding: 0 16px; border-radius: 11px; border: 0; background: var(--cc-danger); color: #fff; font: inherit; font-weight: 750; cursor: pointer; }
    .btn-d.soft { background: var(--cc-danger-bg); color: var(--cc-danger); border: 1px solid color-mix(in oklab, var(--cc-danger) 40%, transparent); }
    .btn-p { min-height: 46px; padding: 0 16px; border-radius: 11px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-weight: 700; cursor: pointer; }
    .btn-d:disabled { opacity: .45; cursor: not-allowed; }
    .sk { height: 160px; border-radius: 16px; margin-bottom: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: d-sk 1.2s linear infinite; }
    @keyframes d-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes d-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .head h1, :host-context([data-theme="dark"]) .box h2, :host-context([data-theme="dark"]) .p b,
    :host-context([data-theme="dark"]) .lines b, :host-context([data-theme="dark"]) .tl li, :host-context([data-theme="dark"]) .led b,
    :host-context([data-theme="dark"]) .led .amt, :host-context([data-theme="dark"]) .m, :host-context([data-theme="dark"]) .dl b,
    :host-context([data-theme="dark"]) .room button, :host-context([data-theme="dark"]) .alert { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .led div, :host-context([data-theme="dark"]) .chat, :host-context([data-theme="dark"]) .chip,
    :host-context([data-theme="dark"]) .alert.info { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .alert:not(.info) { background: rgba(240,163,156,.12); }
    :host-context([data-theme="dark"]) .m { background: #22382f; }
    :host-context([data-theme="dark"]) .m.cour { background: #2B4A3E; }
    :host-context([data-theme="dark"]) .back, :host-context([data-theme="dark"]) .p a { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .led .in { color: #9FDDB4 !important; }
    :host-context([data-theme="dark"]) .chip.open { color: #E3A857; background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .btn-p { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .btn-d.soft { color: #F0A39C; background: rgba(240,163,156,.12); }
    @media (max-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr); } }
    @media (max-width: 640px) {
      .box { padding: 14px; }
      .who { grid-template-columns: minmax(0, 1fr); }
      .cancel .acts button { flex: 1 1 100%; }
    }
    @media (prefers-reduced-motion: reduce) { .box, .sk { animation: none; } }
  `],
  template: `
    <div class="d">
      <a class="back" routerLink="/admin/courses"><svg lucideArrowLeft size="16"></svg> Toutes les courses</a>

      @if (loading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else if (x(); as x) {
        <section class="head">
          <h1>{{ x.course.description }}</h1>
          <div class="sub">
            <app-status-badge [status]="x.course.status" role="ADMIN" />
            <span>N° {{ x.course.id }}</span>
            @if (x.course.zone) { <span>{{ zone(x.course.zone) }}</span> }
            @if (x.course.scheduledAt) { <span>Prévue le {{ x.course.scheduledAt | date:'d MMM yyyy à HH:mm' }}</span> }
          </div>
        </section>

        @if (x.blocked) {
          <div class="alert" role="note"><svg lucideAlertTriangle size="16"></svg>
            <span>{{ x.course.status === 'OVERDUE' ? 'Le coursier est en retard sur ses preuves : le client peut prolonger, annuler ou ouvrir un litige.' : 'L’argent est bloqué depuis plus de 72 h sans que la course soit terminée.' }}</span></div>
        }
        @if (x.cancelReason) {
          <div class="alert info" role="note"><svg lucideAlertTriangle size="16"></svg>
            <span>Annulée par l’administration le {{ x.cancelledAt | date:'d MMM yyyy à HH:mm' }}. Motif : « {{ x.cancelReason }} »</span></div>
        }

        <div class="grid">
          <div class="col">
            <section class="box" aria-label="Parties">
              <h2>Client et coursier</h2>
              <div class="who">
                <div class="p"><small>Client</small>
                  <b>{{ x.client?.fullName || x.client?.email || 'Client' }}</b>
                  @if (x.client?.email) { <span>{{ x.client!.email }}</span> }
                  @if (x.client?.phone) { <span><a [href]="'tel:' + x.client!.phone">{{ x.client!.phone }}</a></span> }
                </div>
                <div class="p"><small>Coursier</small>
                  @if (x.courier) {
                    <b>{{ x.courier.fullName || x.courier.email }}</b>
                    @if (x.courier.email) { <span>{{ x.courier.email }}</span> }
                    @if (x.courier.phone) { <span><a [href]="'tel:' + x.courier.phone">{{ x.courier.phone }}</a></span> }
                  } @else { <b>Pas encore choisi</b> }
                </div>
              </div>
            </section>

            <section class="box" aria-label="Preuves">
              <h2>Preuves ({{ x.proofs.length }})</h2>
              @if (x.proofs.length) {
                <div class="proofs">
                  @for (p of x.proofs; track p.id; let j = $index) {
                    <button type="button" class="pf" (click)="openViewer(j)" [attr.aria-label]="'Agrandir : ' + proofLabel(p)">
                      @if (kind(p) === 'image') { <img [src]="p.presignedUrl" [alt]="proofLabel(p)" loading="lazy"> }
                      @else { <span class="ph">@if (kind(p) === 'video') { <svg lucidePlay size="22"></svg> } @else { <svg lucideFileText size="22"></svg> }</span> }
                      <span class="tag">{{ proofLabel(p) }}</span>
                    </button>
                  }
                </div>
              } @else { <p class="muted">Aucune preuve envoyée.</p> }
            </section>

            <section class="box" aria-label="Discussions">
              <h2><svg lucideMessageSquare size="16"></svg> Discussions ({{ x.rooms.length }})</h2>
              @for (r of x.rooms; track r.chatRoomId) {
                <div class="room">
                  <button type="button" [attr.aria-expanded]="!!chat()[r.chatRoomId]" (click)="toggleChat(r.chatRoomId)">
                    <b>{{ r.courierName }}</b>
                    <small>{{ r.retained ? 'coursier retenu' : r.archived ? 'fermée' : 'en négociation' }}</small>
                    <svg lucideChevronRight size="15"></svg>
                  </button>
                  @if (chat()[r.chatRoomId]; as msgs) {
                    <div class="chat">
                      @for (m of msgs; track m.id) {
                        <div class="m" [class.cour]="m.senderId === r.courierId">
                          <small>{{ m.senderId === r.courierId ? r.courierName : (x.client?.fullName || 'Client') }} · {{ m.createdAt | date:'d MMM HH:mm' }}</small>
                          @if (m.offerAmount) { Proposition de tarif : {{ xaf(m.offerAmount) }} }
                          @else if (m.attachmentType) { Pièce jointe envoyée }
                          @else { {{ m.content }} }
                        </div>
                      } @empty { <p class="muted">Aucun message.</p> }
                    </div>
                  }
                </div>
              } @empty { <p class="muted">Aucun coursier n’a écrit sur cette course.</p> }
            </section>
          </div>

          <div class="col">
            <section class="box" aria-label="Montants">
              <h2>Montants</h2>
              <div class="lines">
                @if (x.course.courseAmount != null) { <div><span>Tarif du coursier</span><b>{{ xaf(x.course.courseAmount) }}</b></div> }
                @if (x.course.realCosts) { <div><span>Achats avancés</span><b>{{ xaf(x.course.realCosts) }}</b></div> }
                @if (x.course.commissionAmount) { <div><span>Frais de service client</span><b>{{ xaf(x.course.commissionAmount) }}</b></div> }
                @if (x.course.totalAmount) { <div class="tot"><span>Payé par le client</span><b>{{ xaf(x.course.totalAmount) }}</b></div> }
                @if (x.course.courierAmount != null) { <div><span>Prévu pour le coursier</span><b>{{ xaf(x.course.courierAmount) }}</b></div> }
                @if (x.course.platformFeeAmount != null) { <div><span>Prévu pour la plateforme</span><b>{{ xaf(x.course.platformFeeAmount) }}</b></div> }
                <div class="tot"><span>Encore bloqué en séquestre</span><b>{{ xaf(x.held) }}</b></div>
              </div>
            </section>

            <section class="box" aria-label="Registre du séquestre">
              <h2>Registre du séquestre</h2>
              @if (x.ledger.length) {
                <div class="led">
                  @for (l of x.ledger; track l.id) {
                    <div><span><b>{{ ledgerLabel(l.entryType) }}</b>{{ l.createdAt | date:'d MMM yyyy à HH:mm' }}@if (l.provider) { · {{ l.provider }} }</span>
                      <span class="amt" [class.in]="l.entryType === 'HOLD'">{{ l.entryType === 'HOLD' ? '+ ' : '− ' }}{{ xaf(abs(l.amount)) }}</span></div>
                  }
                </div>
              } @else { <p class="muted">Aucun mouvement : la course n’a pas été payée.</p> }
            </section>

            <section class="box" aria-label="Chronologie">
              <h2>Chronologie</h2>
              <ul class="tl">
                @for (e of x.timeline; track e.label + e.at) { <li>{{ e.label }}<span>{{ e.at | date:'d MMM yyyy à HH:mm' }}</span></li> }
              </ul>
            </section>

            @if (x.disputes.length) {
              <section class="box" aria-label="Litiges">
                <h2><svg lucideScale size="16"></svg> Litiges</h2>
                @for (d of x.disputes; track d.id) {
                  <a class="dl" routerLink="/admin/disputes" [queryParams]="{ id: d.id }">
                    <b>{{ motif(d.motifCode) }}</b>
                    <span class="chip" [class.open]="d.status === 'OPEN'">{{ d.status === 'OPEN' ? 'À arbitrer' : done(d.decision) }}</span>
                    <svg lucideChevronRight size="15"></svg>
                  </a>
                }
              </section>
            }

            @if (x.cancelAction) {
              <section class="box cancel" aria-label="Annuler la course">
                <h2>Annuler la course</h2>
                <p>{{ x.cancelAction === 'REFUND'
                  ? 'Le client est remboursé intégralement (' + xaf(x.held) + ', frais de service compris). Le coursier ne reçoit rien. Les discussions sont fermées.'
                  : 'La course n’a pas été payée : elle est annulée, les offres sont refusées et les discussions fermées.' }}
                  Le client et le coursier reçoivent le motif par e-mail.</p>
                @if (confirming()) {
                  <textarea id="reason" class="form-input" aria-label="Motif de l’annulation" maxlength="500" placeholder="Motif envoyé au client et au coursier (10 caractères minimum)"
                            [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
                  <span class="hint">{{ reason().trim().length }} / 500</span>
                  <div class="acts">
                    <button type="button" class="btn-p" [disabled]="acting()" (click)="confirming.set(false)">Ne pas annuler</button>
                    <button type="button" class="btn-d" [disabled]="acting() || reason().trim().length < 10" (click)="cancel()">
                      {{ acting() ? 'Annulation…' : x.cancelAction === 'REFUND' ? 'Annuler et rembourser' : 'Annuler la course' }}</button>
                  </div>
                } @else {
                  <div class="acts"><button type="button" class="btn-d soft" (click)="confirming.set(true)">{{ x.cancelAction === 'REFUND' ? 'Annuler et rembourser le client' : 'Annuler la course' }}</button></div>
                }
              </section>
            } @else if (x.course.status === 'DISPUTED') {
              <div class="alert info" role="note"><svg lucideScale size="16"></svg><span>Un litige est en cours : la décision se prend depuis l’écran des litiges.</span></div>
            }
          </div>
        </div>
      } @else {
        <p class="muted">Course introuvable.</p>
      }
    </div>

    <app-media-viewer [items]="viewerItems()" [activeIndex]="viewerIndex()" [open]="viewerOpen()" (close)="viewerOpen.set(false)" />
  `,
})
export class AdminCourseDetailComponent implements OnInit {
  private adminService = inject(AdminService);
  private chatService = inject(ChatService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly x = signal<AdminCourseDetail | null>(null);
  readonly chat = signal<Record<number, Msg[]>>({});
  readonly confirming = signal(false);
  readonly reason = signal('');
  readonly acting = signal(false);
  readonly viewerOpen = signal(false);
  readonly viewerIndex = signal(0);
  readonly viewerItems = computed<MediaItem[]>(() =>
    (this.x()?.proofs ?? []).map((p) => ({ url: p.presignedUrl, type: this.kind(p), label: this.proofLabel(p) })));
  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.adminService.getCourseDetail(this.id).subscribe({
      next: (d) => { this.x.set(this.normalize(d)); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger cette course.'); },
    });
  }

  toggleChat(roomId: number): void {
    if (this.chat()[roomId]) { this.chat.update((m) => { const n = { ...m }; delete n[roomId]; return n; }); return; }
    this.chatService.getMessages(roomId).subscribe({
      next: (msgs) => this.chat.update((m) => ({ ...m, [roomId]: msgs as Msg[] })),
      error: () => this.toast.error('Impossible de charger la discussion.'),
    });
  }

  cancel(): void {
    const r = this.reason().trim();
    if (r.length < 10) return;
    this.acting.set(true);
    this.adminService.cancelCourse(this.id, r).subscribe({
      next: (d) => {
        const refunded = this.x()?.cancelAction === 'REFUND';
        this.x.set(this.normalize(d));
        this.acting.set(false);
        this.confirming.set(false);
        this.toast.success(refunded ? 'Course annulée : le client est remboursé et les deux parties sont prévenues.' : 'Course annulée : le client et le coursier sont prévenus.');
      },
      error: (e) => { this.acting.set(false); this.toast.error(e?.error?.message ?? 'Impossible d’annuler la course.'); },
    });
  }

  openViewer(i: number): void { this.viewerIndex.set(i); this.viewerOpen.set(true); }

  private normalize(d: AdminCourseDetail): AdminCourseDetail { return { ...d, held: Number(d.held ?? 0) }; }

  kind(p: DisputeProof): 'image' | 'video' | 'pdf' {
    const m = p.mimeType ?? '';
    if (p.proofType === 'VIDEO' || m.startsWith('video/')) return 'video';
    if (m === 'application/pdf') return 'pdf';
    return 'image';
  }
  proofLabel(p: DisputeProof): string { return p.proofType === 'VIDEO' ? 'Vidéo' : p.proofType === 'RECEIPT' ? 'Reçu' : 'Photo'; }
  ledgerLabel(t: string): string { return LEDGER[t] ?? t; }
  motif(code: string): string { return DISPUTE_MOTIFS[code] ?? code; }
  done(dec: string | null): string { return (dec && DISPUTE_DONE[dec]) || 'Résolu'; }
  zone(z: string): string { return z.replace(' - ', ' · '); }
  abs(v: number): number { return Math.abs(Number(v) || 0); }
  xaf(v: number | null | undefined): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/ /g, ' ')} XAF`;
  }
}
