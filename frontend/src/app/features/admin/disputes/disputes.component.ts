import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, DisputeDetail, DisputeProof, DisputeResponse } from '../../../core/services/admin.service';
import { ChatService } from '../../../core/services/chat.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import {
  LucideChevronDown, LucideCircleCheck, LucideFileText, LucideMessageSquare, LucidePlay, LucideScale,
} from '@lucide/angular';

type Tab = 'OPEN' | 'RESOLVED' | 'ALL';
type Decision = 'LIBERATION' | 'REMBOURSEMENT_TOTAL' | 'REMBOURSEMENT_PARTIEL';

/** Mêmes codes que le formulaire d'ouverture (dispute-form) + litige automatique de non-livraison. */
const MOTIFS: Record<string, string> = {
  'L-C1': 'La course n’a pas été faite', 'L-C2': 'La course est incomplète', 'L-C3': 'Les preuves ne sont pas conformes',
  'L-C4': 'Argent détourné', 'L-C5': 'Comportement irrespectueux du coursier', 'L-C6': 'Retard important',
  'L-F1': 'Le client ne valide pas', 'L-F2': 'Supplément légitime refusé', 'L-F3': 'Client injurieux ou menaçant',
  'L-F4': 'Fausse accusation', 'SYS-NL': 'Non-livraison (litige automatique)',
};

const DONE: Record<string, string> = {
  LIBERATION: 'Payé au coursier', REMBOURSEMENT_TOTAL: 'Client remboursé', REMBOURSEMENT_PARTIEL: 'Montant partagé', SANCTION: 'Payé au coursier (sanction)',
};

interface Msg { id: number; senderId: number; content: string | null; attachmentType: string | null; offerAmount: number | null; createdAt: string; }

/**
 * Litiges (admin, Impeccable, mode Operate).
 * Chaque litige ouvre son dossier : course, parties, preuves, discussion, puis la décision avec la répartition
 * exacte de l'argent bloqué (montants calculés par le serveur avec les règles du séquestre).
 */
@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [DatePipe, FormsModule, MediaViewerComponent,
    LucideChevronDown, LucideCircleCheck, LucideFileText, LucideMessageSquare, LucidePlay, LucideScale],
  styles: [`
    :host { display: block; min-width: 0; --lm: #56635c; }
    :host-context([data-theme="dark"]) { --lm: #B0C0B7; }
    .l { max-width: 1000px; margin: 0 auto; }
    .l-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .l-head p { margin: 0 0 16px; font-size: 15px; color: var(--lm); }
    .tabs { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); }
    .tabs button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 9px; background: none; color: var(--lm); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .tabs button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .tabs b { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; background: var(--cc-line); color: var(--cc-ink); }
    .tabs button.on b.hot { background: #d93a32; color: #fff; }
    .lc { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; margin-bottom: 14px; overflow: hidden; animation: l-in .4s cubic-bezier(.16,1,.3,1) both; }
    .lc-h { width: 100%; min-width: 0; display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    .lc-ic { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-danger-bg); color: var(--cc-danger); }
    .lc.done .lc-ic { background: var(--cc-paper-2); color: var(--lm); }
    .lc-t { flex: 1; min-width: 0; }
    .lc-t b { display: block; font-size: 16px; font-weight: 750; color: var(--cc-ink); }
    .lc-t span { display: block; margin-top: 2px; font-size: 13px; color: var(--lm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chip { flex: none; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 750; white-space: nowrap; background: var(--cc-paper-2); color: var(--lm); }
    .chip.old { background: var(--cc-warning-bg); color: #8a5a14; }
    .chip.ok { background: var(--cc-success-bg); color: var(--cc-success); }
    .caret { flex: none; margin-top: 10px; color: var(--lm); transition: transform .2s; }
    .lc.open .caret { transform: rotate(180deg); }
    .body { padding: 0 18px 18px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
    .sec h3 { margin: 0 0 8px; font-size: 13px; font-weight: 750; color: var(--lm); }
    .who { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
    .p { padding: 12px; border-radius: 12px; border: 1px solid var(--cc-line); min-width: 0; }
    .p small { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--lm); margin-bottom: 4px; }
    .p small i { font-style: normal; padding: 1px 7px; border-radius: 7px; background: var(--cc-warning-bg); color: #8a5a14; }
    .p b { display: block; font-size: 14.5px; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .p span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--lm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .course { padding: 12px 14px; border-radius: 12px; background: var(--cc-paper-2); }
    .course b { display: block; overflow-wrap: anywhere; font-size: 14.5px; line-height: 1.4; color: var(--cc-ink); }
    .course span { display: block; margin-top: 4px; font-size: 12.5px; color: var(--lm); }
    .quote { margin: 0; padding: 12px 14px; border-radius: 12px; border-left: 3px solid var(--cc-danger); background: var(--cc-paper-2); font-size: 14px; line-height: 1.55; color: var(--cc-ink); white-space: pre-line; overflow-wrap: anywhere; }
    .quote small { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700; color: var(--lm); }
    .proofs { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
    .pf { position: relative; aspect-ratio: 1; padding: 0; border: 1px solid var(--cc-line); border-radius: 11px; overflow: hidden; background: #0f1a15; cursor: zoom-in; }
    .pf img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pf .ph { width: 100%; height: 100%; display: grid; place-items: center; align-content: center; gap: 4px; color: #cfdcd4; font-size: 12px; font-weight: 700; }
    .pf .tag { position: absolute; left: 5px; bottom: 5px; padding: 2px 7px; border-radius: 7px; background: rgba(0,0,0,.65); color: #fff; font-size: 11px; font-weight: 750; }
    .muted { margin: 0; font-size: 13.5px; color: var(--lm); }
    .chat-btn { min-height: 42px; padding: 0 14px; border-radius: 11px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
    .chat { max-height: 340px; overflow: auto; display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--cc-line); background: var(--cc-paper-2); margin-top: 8px; }
    .m { max-width: 82%; padding: 8px 11px; border-radius: 12px; background: var(--cc-white); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); overflow-wrap: anywhere; }
    .m.cour { justify-self: end; background: var(--cc-success-bg); }
    .m small { display: block; margin-bottom: 2px; font-size: 11.5px; font-weight: 700; color: var(--lm); }
    .dec { padding: 16px; border-radius: 14px; border: 1.5px solid var(--cc-line); }
    .dec h3 { margin: 0 0 4px; font-size: 15.5px; font-weight: 750; color: var(--cc-ink); }
    .dec > p { margin: 0 0 12px; font-size: 13.5px; color: var(--lm); }
    .opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
    .opt { padding: 12px; border-radius: 12px; border: 1.5px solid var(--cc-line); background: var(--cc-white); text-align: left; font: inherit; color: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
    .opt:hover { border-color: var(--primary); }
    .opt.on { border-color: var(--primary); background: var(--cc-success-bg); }
    .opt b { display: block; font-size: 14px; color: var(--cc-ink); }
    .opt span { display: block; margin-top: 3px; font-size: 12.5px; line-height: 1.4; color: var(--lm); }
    .split { display: grid; gap: 6px; padding: 12px 14px; border-radius: 12px; background: var(--cc-paper-2); font-size: 14px; margin-bottom: 12px; }
    .split div { display: flex; justify-content: space-between; gap: 10px; color: var(--lm); }
    .split b { color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .amt { display: grid; gap: 6px; margin-bottom: 12px; }
    .amt label { font-size: 13.5px; font-weight: 700; color: var(--cc-ink); }
    .amt .err { font-size: 12.5px; color: var(--cc-danger); }
    .go { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .go button { min-height: 46px; padding: 0 18px; border-radius: 11px; border: 0; background: var(--primary); color: #fff; font: inherit; font-size: 14.5px; font-weight: 750; cursor: pointer; }
    .go button:disabled { opacity: .45; cursor: not-allowed; }
    .go .plain { background: var(--cc-white); color: var(--cc-ink); border: 1px solid var(--cc-line); }
    .note { margin: 8px 0 0; font-size: 12.5px; color: var(--lm); text-align: right; }
    .empty { padding: 34px 16px; text-align: center; border: 1px dashed var(--cc-line); border-radius: 16px; color: var(--lm); }
    .empty svg { color: var(--cc-success); }
    .empty b { display: block; margin: 8px 0 4px; font-size: 16px; color: var(--cc-ink); }
    .sk { height: 160px; border-radius: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: l-sk 1.2s linear infinite; }
    @keyframes l-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes l-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .l-head h1, :host-context([data-theme="dark"]) .lc-t b, :host-context([data-theme="dark"]) .p b,
    :host-context([data-theme="dark"]) .course b, :host-context([data-theme="dark"]) .quote, :host-context([data-theme="dark"]) .m,
    :host-context([data-theme="dark"]) .dec h3, :host-context([data-theme="dark"]) .opt b, :host-context([data-theme="dark"]) .split b,
    :host-context([data-theme="dark"]) .amt label, :host-context([data-theme="dark"]) .empty b, :host-context([data-theme="dark"]) .chat-btn { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .tabs, :host-context([data-theme="dark"]) .course, :host-context([data-theme="dark"]) .quote,
    :host-context([data-theme="dark"]) .split, :host-context([data-theme="dark"]) .chat, :host-context([data-theme="dark"]) .chip,
    :host-context([data-theme="dark"]) .lc.done .lc-ic { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .tabs button.on { background: #2B4A3E; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .lc-ic { color: #F0A39C; }
    :host-context([data-theme="dark"]) .chip.old, :host-context([data-theme="dark"]) .p small i { color: #E3A857; background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .m { background: #22382f; }
    :host-context([data-theme="dark"]) .m.cour { background: #2B4A3E; }
    :host-context([data-theme="dark"]) .opt.on { background: rgba(214,240,140,.08); border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .opt:hover { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .go button:not(.plain) { background: var(--cc-lime); color: #123b32; }
    @media (max-width: 720px) { .opts { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .lc-h { padding: 14px; } .body { padding: 0 14px 14px; }
      .who { grid-template-columns: 1fr; }
      .tabs { display: flex; width: 100%; } .tabs button { flex: 1 1 auto; justify-content: center; padding: 0 6px; font-size: 13.5px; }
      .go button { flex: 1 1 100%; }
    }
    @media (prefers-reduced-motion: reduce) { .lc, .sk { animation: none; } .caret { transition: none; } }
  `],
  template: `
    <div class="l">
      <section class="l-head">
        <h1>Litiges</h1>
        <p>@if (openCount()) { {{ openCount() }} litige{{ openCount() > 1 ? 's' : '' }} à arbitrer : l’argent de la course reste bloqué jusqu’à votre décision. } @else { Aucun litige à arbitrer. }</p>
      </section>

      <div class="tabs" role="tablist" aria-label="Filtrer les litiges">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" [class.on]="tab() === t.key" (click)="tab.set(t.key)">
            {{ t.label }} <b [class.hot]="t.key === 'OPEN' && openCount() > 0">{{ count(t.key) }}</b>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="sk"></div>
      } @else if (list().length === 0) {
        <div class="empty" role="status"><svg lucideCircleCheck size="30"></svg>
          <b>{{ tab() === 'OPEN' ? 'Tout est à jour' : 'Aucun litige' }}</b>
          <span>{{ tab() === 'OPEN' ? 'Les litiges ouverts par les clients ou les coursiers apparaîtront ici.' : 'Rien dans cette catégorie.' }}</span></div>
      } @else {
        @for (d of list(); track d.id; let i = $index) {
          <article class="lc" [class.done]="d.status !== 'OPEN'" [class.open]="isOpen(d.id)" [style.animation-delay.ms]="i * 40">
            <button type="button" class="lc-h" [attr.aria-expanded]="isOpen(d.id)" (click)="toggle(d)">
              <span class="lc-ic" aria-hidden="true"><svg lucideScale size="18"></svg></span>
              <span class="lc-t">
                <b>{{ motif(d.motifCode) }}</b>
                <span>{{ detail(d.id)?.course?.description || ('Course n° ' + d.courseId) }} · ouvert le {{ d.createdAt | date:'d MMM yyyy' }}</span>
              </span>
              @if (d.status === 'OPEN') { <span class="chip" [class.old]="ageH(d) >= 24">{{ since(d) }}</span> }
              @else { <span class="chip ok">{{ done(d.decision) }}</span> }
              <svg class="caret" lucideChevronDown size="16"></svg>
            </button>

            @if (isOpen(d.id)) {
              @if (detail(d.id); as x) {
                <div class="body">
                  <div class="who">
                    <div class="p"><small>Client @if (x.openedByRole === 'CLIENT') { <i>a ouvert le litige</i> }</small>
                      <b>{{ x.client?.fullName || 'Client' }}</b><span>{{ x.client?.email }}</span></div>
                    <div class="p"><small>Coursier @if (x.openedByRole === 'COURIER') { <i>a ouvert le litige</i> }</small>
                      <b>{{ x.courier?.fullName || 'Aucun coursier' }}</b><span>{{ x.courier?.email }}</span></div>
                  </div>

                  <div class="course">
                    <b>{{ x.course.description }}</b>
                    <span>Course n° {{ x.course.id }}@if (x.course.zone) { · {{ zone(x.course.zone) }} }@if (x.course.paidAt) { · payée le {{ x.course.paidAt | date:'d MMM à HH:mm' }} }@if (x.course.proofDeadline) { · preuves attendues avant le {{ x.course.proofDeadline | date:'d MMM à HH:mm' }} }</span>
                  </div>

                  <p class="quote"><small>Ce que dit {{ x.openedByRole === 'COURIER' ? 'le coursier' : 'le client' }}</small>{{ d.description || 'Aucune précision donnée.' }}</p>

                  <section class="sec" aria-label="Preuves envoyées">
                    <h3>Preuves envoyées ({{ x.proofs.length }})</h3>
                    @if (x.proofs.length) {
                      <div class="proofs">
                        @for (p of x.proofs; track p.id; let j = $index) {
                          <button type="button" class="pf" (click)="openViewer(x, j)" [attr.aria-label]="'Agrandir : ' + proofLabel(p)">
                            @if (kind(p) === 'image') { <img [src]="p.presignedUrl" [alt]="proofLabel(p)" loading="lazy"> }
                            @else { <span class="ph">@if (kind(p) === 'video') { <svg lucidePlay size="22"></svg> } @else { <svg lucideFileText size="22"></svg> }</span> }
                            <span class="tag">{{ proofLabel(p) }}</span>
                          </button>
                        }
                      </div>
                    } @else { <p class="muted">Le coursier n’a envoyé aucune preuve.</p> }
                  </section>

                  @if (x.chatRoomId) {
                    <section class="sec" aria-label="Discussion">
                      <button type="button" class="chat-btn" [attr.aria-expanded]="!!chat()[d.id]" (click)="toggleChat(d.id, x.chatRoomId)">
                        <svg lucideMessageSquare size="16"></svg> {{ chat()[d.id] ? 'Masquer la discussion' : 'Lire la discussion client – coursier' }}
                      </button>
                      @if (chat()[d.id]; as msgs) {
                        <div class="chat">
                          @for (m of msgs; track m.id) {
                            <div class="m" [class.cour]="m.senderId === x.courier?.id">
                              <small>{{ m.senderId === x.courier?.id ? (x.courier?.fullName || 'Coursier') : m.senderId === x.client?.id ? (x.client?.fullName || 'Client') : 'Système' }} · {{ m.createdAt | date:'d MMM HH:mm' }}</small>
                              @if (m.offerAmount) { Proposition de tarif : {{ xaf(m.offerAmount) }} }
                              @else if (m.attachmentType) { Pièce jointe envoyée }
                              @else { {{ m.content }} }
                            </div>
                          } @empty { <p class="muted">Aucun message échangé.</p> }
                        </div>
                      }
                    </section>
                  }

                  @if (d.status === 'OPEN' && x.amounts.courierOnRelease !== null) {
                    <section class="dec" aria-label="Décision">
                      <h3>Votre décision</h3>
                      <p>{{ xaf(x.amounts.held) }} sont bloqués pour cette course. Choisissez qui les reçoit.</p>
                      <div class="opts" role="radiogroup">
                        <button type="button" role="radio" class="opt" [attr.aria-checked]="choice() === 'LIBERATION'" [class.on]="choice() === 'LIBERATION'" (click)="choose('LIBERATION')">
                          <b>Payer le coursier</b><span>La course est considérée comme faite.</span></button>
                        <button type="button" role="radio" class="opt" [attr.aria-checked]="choice() === 'REMBOURSEMENT_TOTAL'" [class.on]="choice() === 'REMBOURSEMENT_TOTAL'" (click)="choose('REMBOURSEMENT_TOTAL')">
                          <b>Rembourser le client</b><span>Le coursier ne reçoit rien.</span></button>
                        <button type="button" role="radio" class="opt" [attr.aria-checked]="choice() === 'REMBOURSEMENT_PARTIEL'" [class.on]="choice() === 'REMBOURSEMENT_PARTIEL'" (click)="choose('REMBOURSEMENT_PARTIEL')">
                          <b>Partager</b><span>Une partie au client, le reste au coursier.</span></button>
                      </div>

                      @if (choice() === 'REMBOURSEMENT_PARTIEL') {
                        <div class="amt">
                          <label [for]="'refund-' + d.id">Montant rendu au client (XAF)</label>
                          <input class="form-input" [id]="'refund-' + d.id" type="number" inputmode="numeric" min="1" [max]="x.amounts.held - 1"
                                 [ngModel]="refund()" (ngModelChange)="refund.set($event)" placeholder="Ex. 5000">
                          @if (refund() !== null && !refundValid(x)) { <span class="err">Entre 1 et {{ xaf(x.amounts.held - 1) }}.</span> }
                        </div>
                      }

                      @if (choice()) {
                        <div class="split" aria-live="polite">
                          <div><span>Client reçoit</span><b>{{ xaf(share(x).client) }}</b></div>
                          <div><span>Coursier reçoit</span><b>{{ xaf(share(x).courier) }}</b></div>
                          <div><span>Frais plateforme</span><b>{{ xaf(share(x).platform) }}</b></div>
                        </div>
                        <div class="go">
                          <button type="button" class="plain" (click)="choice.set(null)">Annuler</button>
                          <button type="button" [disabled]="acting() || (choice() === 'REMBOURSEMENT_PARTIEL' && !refundValid(x))" (click)="resolve(d, x)">Confirmer la décision</button>
                        </div>
                        <p class="note">Décision définitive. Le client et le coursier sont prévenus par e-mail.</p>
                      }
                    </section>
                  } @else if (d.status === 'OPEN') {
                    <p class="muted">Plus aucun montant n’est bloqué pour cette course : rien à répartir.</p>
                  }
                </div>
              } @else {
                <div class="body"><div class="sk"></div></div>
              }
            }
          </article>
        }
      }
    </div>

    <app-media-viewer [items]="viewerItems()" [activeIndex]="viewerIndex()" [open]="viewerOpen()" (close)="viewerOpen.set(false)" />
  `,
})
export class AdminDisputesComponent implements OnInit {
  private adminService = inject(AdminService);
  private chatService = inject(ChatService);
  private toast = inject(ToastService);

  readonly tabs: { key: Tab; label: string }[] = [{ key: 'OPEN', label: 'À arbitrer' }, { key: 'RESOLVED', label: 'Résolus' }, { key: 'ALL', label: 'Tous' }];
  readonly tab = signal<Tab>('OPEN');
  readonly allList = signal<DisputeResponse[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly choice = signal<Decision | null>(null);
  readonly refund = signal<number | null>(null);
  readonly chat = signal<Record<number, Msg[]>>({});
  private readonly details = signal<Record<number, DisputeDetail>>({});
  private readonly opened = signal<number | null>(null);

  readonly viewerOpen = signal(false);
  readonly viewerItems = signal<MediaItem[]>([]);
  readonly viewerIndex = signal(0);

  readonly openCount = computed(() => this.count('OPEN'));
  readonly list = computed(() => {
    const t = this.tab();
    const l = this.allList().filter((d) => t === 'ALL' || (t === 'OPEN' ? d.status === 'OPEN' : d.status !== 'OPEN'));
    return [...l].sort((a, b) => (t === 'OPEN' ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  ngOnInit(): void {
    this.adminService.getDisputes().subscribe({
      next: (data) => {
        this.allList.set(data);
        this.loading.set(false);
        // Le plus ancien litige à arbitrer s'ouvre d'office
        const first = this.list()[0];
        if (first && first.status === 'OPEN') this.toggle(first);
      },
      error: () => { this.toast.error('Erreur lors du chargement des litiges.'); this.loading.set(false); },
    });
  }

  count(t: Tab): number {
    return t === 'ALL' ? this.allList().length : this.allList().filter((d) => (t === 'OPEN' ? d.status === 'OPEN' : d.status !== 'OPEN')).length;
  }

  isOpen(id: number): boolean { return this.opened() === id; }
  detail(id: number): DisputeDetail | undefined { return this.details()[id]; }

  /** Un seul dossier ouvert à la fois : la décision en cours ne peut pas viser le mauvais litige. */
  toggle(d: DisputeResponse): void {
    const next = this.opened() === d.id ? null : d.id;
    this.opened.set(next);
    this.choice.set(null);
    this.refund.set(null);
    if (next !== null && !this.details()[d.id]) {
      this.adminService.getDisputeDetail(d.id).subscribe({
        next: (x) => this.details.update((m) => ({ ...m, [d.id]: x })),
        error: () => { this.toast.error('Impossible de charger le dossier de ce litige.'); this.opened.set(null); },
      });
    }
  }

  toggleChat(id: number, roomId: number): void {
    if (this.chat()[id]) { this.chat.update((m) => { const n = { ...m }; delete n[id]; return n; }); return; }
    this.chatService.getMessages(roomId).subscribe({
      next: (msgs) => this.chat.update((m) => ({ ...m, [id]: msgs as Msg[] })),
      error: () => this.toast.error('Impossible de charger la discussion.'),
    });
  }

  choose(c: Decision): void { this.choice.set(c); if (c !== 'REMBOURSEMENT_PARTIEL') this.refund.set(null); }

  refundValid(x: DisputeDetail): boolean {
    const r = Number(this.refund());
    return Number.isInteger(r) && r > 0 && r < x.amounts.held;
  }

  /** Répartition affichée avant confirmation, mêmes formules qu'EscrowService (release / refundTotal / split). */
  share(x: DisputeDetail): { client: number; courier: number; platform: number } {
    const a = x.amounts;
    switch (this.choice()) {
      case 'LIBERATION': return { client: 0, courier: a.courierOnRelease ?? 0, platform: a.platformOnRelease ?? 0 };
      case 'REMBOURSEMENT_TOTAL': return { client: a.clientOnFullRefund ?? 0, courier: 0, platform: a.platformOnFullRefund ?? 0 };
      case 'REMBOURSEMENT_PARTIEL': {
        const held = a.held;
        const cl = this.refundValid(x) ? Number(this.refund()) : 0;
        const fee = Math.min(a.platformOnRelease ?? 0, held - cl);
        return { client: cl, courier: held - cl - fee, platform: fee };
      }
      default: return { client: 0, courier: 0, platform: 0 };
    }
  }

  resolve(d: DisputeResponse, x: DisputeDetail): void {
    const c = this.choice();
    if (!c) return;
    const amount = c === 'REMBOURSEMENT_PARTIEL' ? Number(this.refund()) : undefined;
    this.acting.set(true);
    this.adminService.resolveDispute(d.id, c, amount).subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.choice.set(null);
        this.allList.update((l) => l.map((y) => (y.id === updated.id ? updated : y)));
        this.details.update((m) => ({ ...m, [d.id]: { ...x, dispute: updated } }));
        this.toast.success(`${DONE[c]}. Le client et le coursier ont été prévenus par e-mail.`);
      },
      error: (err) => { this.acting.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors de la résolution.'); },
    });
  }

  kind(p: DisputeProof): 'image' | 'video' | 'pdf' {
    const m = p.mimeType ?? '';
    if (p.proofType === 'VIDEO' || m.startsWith('video/')) return 'video';
    if (m === 'application/pdf') return 'pdf';
    return 'image';
  }
  proofLabel(p: DisputeProof): string { return p.proofType === 'VIDEO' ? 'Vidéo' : p.proofType === 'RECEIPT' ? 'Reçu' : 'Photo'; }

  openViewer(x: DisputeDetail, start: number): void {
    this.viewerItems.set(x.proofs.map((p) => ({ url: p.presignedUrl, type: this.kind(p), label: this.proofLabel(p) })));
    this.viewerIndex.set(start);
    this.viewerOpen.set(true);
  }

  motif(code: string): string { return MOTIFS[code] ?? code; }
  done(dec: string | null): string { return (dec && DONE[dec]) || 'Résolu'; }
  zone(z: string): string { return z.replace(' - ', ' · '); }
  ageH(d: DisputeResponse): number { return Math.max(0, (Date.now() - new Date(d.createdAt).getTime()) / 3_600_000); }
  since(d: DisputeResponse): string { const h = this.ageH(d); return h < 1 ? 'à l’instant' : h < 24 ? `depuis ${Math.floor(h)} h` : `depuis ${Math.floor(h / 24)} j`; }
  xaf(n: number | null | undefined): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))} XAF`; }
}
