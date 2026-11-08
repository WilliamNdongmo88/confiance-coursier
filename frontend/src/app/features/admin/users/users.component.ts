import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, UserActivitySummary, UserProfileResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideChevronRight, LucideScale, LucideSearch, LucideStar, LucideX } from '@lucide/angular';
import { DISPUTE_DONE, DISPUTE_MOTIFS } from '../disputes/dispute-labels';

type Tab = 'ALL' | 'CLIENT' | 'COURIER' | 'SUSPENDED';

/**
 * Utilisateurs (admin, Impeccable, mode Operate).
 * Liste lisible à toutes les largeurs (sans tableau qui défile), fiche latérale avec l'activité réelle du compte,
 * suspension confirmée et jamais proposée sur un compte administrateur (refusée aussi par le serveur).
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, LucideChevronRight, LucideScale, LucideSearch, LucideStar, LucideX],
  styles: [`
    :host { display: block; min-width: 0; --um: #56635c; }
    :host-context([data-theme="dark"]) { --um: #B0C0B7; }
    .u { max-width: 1100px; margin: 0 auto; }
    .u-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .u-head p { margin: 0 0 16px; font-size: 15px; color: var(--um); }
    .tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
    .tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); }
    .tabs button { min-height: 40px; padding: 0 12px; border: 0; border-radius: 9px; background: none; color: var(--um); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .tabs button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .tabs b { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; background: var(--cc-line); color: var(--cc-ink); }
    .search { flex: 1 1 240px; position: relative; }
    .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--um); pointer-events: none; }
    .search input { width: 100%; min-height: 46px; padding-left: 38px; }
    .list { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; overflow: hidden; }
    .row { width: 100%; display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, .9fr) 120px; align-items: center; gap: 12px;
      padding: 12px 16px; border: 0; border-top: 1px solid var(--cc-line); background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; transition: background .15s;
      animation: u-in .35s cubic-bezier(.16,1,.3,1) both; }
    .row:first-child { border-top: 0; }
    .row:hover, .row.sel { background: var(--cc-paper-2); }
    .who { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .av { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); font-weight: 800; font-size: 13px; }
    .row.off .av { opacity: .55; }
    .nm { min-width: 0; }
    .nm b { display: block; font-size: 14.5px; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nm span { display: block; font-size: 12.5px; color: var(--um); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cell { min-width: 0; font-size: 13px; color: var(--um); }
    .chip { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 12px; font-weight: 750; white-space: nowrap; background: var(--cc-paper-2); color: var(--um); }
    .chip.client { background: var(--cc-success-bg); color: var(--cc-success); }
    .chip.courier { background: #e6eefb; color: #2b4f8a; }
    .chip.admin { background: var(--cc-warning-bg); color: #8a5a14; }
    .chip.ok { background: var(--cc-success-bg); color: var(--cc-success); }
    .chip.wait { background: var(--cc-warning-bg); color: #8a5a14; }
    .chip.bad { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .end { display: flex; align-items: center; gap: 8px; justify-content: flex-end; color: var(--um); }
    .empty { padding: 30px 16px; text-align: center; color: var(--um); font-size: 14px; }
    .sk { height: 62px; border-top: 1px solid var(--cc-line); background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: u-sk 1.2s linear infinite; }
    /* ── Fiche ── */
    .ov { position: fixed; inset: 0; z-index: 9100; background: rgba(16,38,29,.45); animation: u-fade .2s ease; }
    .sheet { position: fixed; z-index: 9101; top: 0; right: 0; bottom: 0; width: min(440px, 100%); overflow-y: auto; background: var(--cc-white); box-shadow: -18px 0 48px rgba(16,38,29,.18);
      padding: 22px 22px 28px; animation: u-slide .28s cubic-bezier(.16,1,.3,1); }
    .x { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; border-radius: 10px; border: 0; background: none; color: var(--um); cursor: pointer; display: grid; place-items: center; }
    .x:hover { background: var(--cc-paper-2); }
    .s-head { display: flex; gap: 12px; align-items: center; margin: 4px 40px 16px 0; }
    .s-head .av { width: 52px; height: 52px; border-radius: 15px; font-size: 17px; }
    .s-head > div > b { display: block; font-size: 18px; font-weight: 800; color: var(--cc-ink); overflow-wrap: anywhere; }
    .s-head > div > span { display: block; margin-top: 2px; font-size: 13px; color: var(--um); overflow-wrap: anywhere; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .facts { margin: 0 0 16px; border: 1px solid var(--cc-line); border-radius: 12px; overflow: hidden; }
    .facts div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; font-size: 13.5px; }
    .facts div + div { border-top: 1px solid var(--cc-line); }
    .facts dt { color: var(--um); }
    .facts dd { margin: 0; font-weight: 650; color: var(--cc-ink); text-align: right; overflow-wrap: anywhere; display: inline-flex; align-items: center; gap: 4px; }
    .facts dd svg { color: #c98a16; }
    h3 { margin: 0 0 8px; font-size: 13px; font-weight: 750; color: var(--um); }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
    .st { padding: 12px; border-radius: 12px; background: var(--cc-paper-2); text-decoration: none; color: inherit; }
    a.st:hover { outline: 1.5px solid var(--primary); }
    .st strong { display: block; font-size: 22px; font-weight: 800; color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .st span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--um); }
    .st.warn strong { color: var(--cc-danger); }
    .disp { display: grid; gap: 6px; margin-bottom: 16px; }
    .dl { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--cc-line); text-decoration: none; color: inherit; transition: border-color .15s, background .15s; }
    .dl:hover { border-color: var(--primary); background: var(--cc-paper-2); }
    .dl-ic { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--cc-danger-bg); color: var(--cc-danger); }
    .dl.done .dl-ic { background: var(--cc-paper-2); color: var(--um); }
    .dl-t { flex: 1; min-width: 0; }
    .dl-t b { display: block; font-size: 13.5px; color: var(--cc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dl-t span { display: block; margin-top: 1px; font-size: 12px; color: var(--um); }
    .dl > svg { flex: none; color: var(--um); }
    .note { margin: 0 0 12px; font-size: 13px; line-height: 1.45; color: var(--um); }
    .cf { padding: 14px; border-radius: 12px; border: 1.5px solid color-mix(in oklab, var(--cc-danger) 45%, transparent); animation: u-in .25s ease; }
    .cf b { display: block; font-size: 14.5px; color: var(--cc-ink); }
    .cf p { margin: 4px 0 12px; font-size: 13px; line-height: 1.45; color: var(--um); }
    .cf .reason { width: 100%; min-height: 84px; }
    .cf .count { display: block; margin: 4px 0 10px; font-size: 12px; color: var(--um); }
    .why { margin: -4px 0 12px; padding: 10px 12px; border-radius: 12px; background: var(--cc-danger-bg); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); overflow-wrap: anywhere; }
    .why small { display: block; margin-bottom: 2px; font-size: 12px; font-weight: 700; color: var(--um); }
    :host-context([data-theme="dark"]) .why { background: rgba(240,163,156,.12); color: #F3F7F5; }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; }
    .acts button { flex: 1 1 140px; min-height: 46px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
    .b-plain { border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); }
    .b-danger { border: 1px solid color-mix(in oklab, var(--cc-danger) 40%, transparent); background: var(--cc-danger-bg); color: var(--cc-danger); }
    .b-danger.solid { border: 0; background: var(--cc-danger); color: #fff; }
    .b-ok { border: 0; background: var(--primary); color: #fff; }
    .acts button:disabled { opacity: .5; cursor: not-allowed; }
    @keyframes u-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes u-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes u-slide { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes u-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .u-head h1, :host-context([data-theme="dark"]) .nm b, :host-context([data-theme="dark"]) .s-head b,
    :host-context([data-theme="dark"]) .facts dd, :host-context([data-theme="dark"]) .st strong, :host-context([data-theme="dark"]) .dl-t b, :host-context([data-theme="dark"]) .cf b { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .tabs, :host-context([data-theme="dark"]) .av, :host-context([data-theme="dark"]) .st,
    :host-context([data-theme="dark"]) .row:hover, :host-context([data-theme="dark"]) .row.sel, :host-context([data-theme="dark"]) .chip { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .tabs button.on { background: #2B4A3E; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .av { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .chip.client, :host-context([data-theme="dark"]) .chip.ok { color: #9FDDB4; background: rgba(159,221,180,.1); }
    :host-context([data-theme="dark"]) .chip.courier { color: #A9C4F0; background: rgba(169,196,240,.1); }
    :host-context([data-theme="dark"]) .chip.admin, :host-context([data-theme="dark"]) .chip.wait { color: #E3A857; background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .dl-ic, :host-context([data-theme="dark"]) .chip.bad, :host-context([data-theme="dark"]) .st.warn strong, :host-context([data-theme="dark"]) .b-danger:not(.solid) { color: #F0A39C !important; }
    :host-context([data-theme="dark"]) .sheet { background: #1c2a24; }
    :host-context([data-theme="dark"]) .b-ok { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .b-danger.solid { background: #c2413a; }
    @media (max-width: 900px) {
      .row { grid-template-columns: minmax(0, 1fr) auto; }
      .end { min-width: 0; }
      .row .cell { display: none; }
      .row .end .chip.role { display: inline-block; }
    }
    @media (min-width: 901px) { .row .end .chip.role { display: none; } }
    @media (max-width: 640px) {
      .tabs { display: grid; grid-template-columns: repeat(4, auto); width: 100%; } .tabs button { justify-content: center; padding: 0 4px; gap: 4px; font-size: 13px; }
      .tabs b { min-width: 18px; padding: 0 4px; }
      .row { padding: 12px 14px; }
      .sheet { top: auto; left: 0; width: 100%; max-height: 88vh; border-radius: 20px 20px 0 0; padding: 22px 16px 28px; animation-name: u-up; }
      @keyframes u-up { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
    }
    @media (prefers-reduced-motion: reduce) { .row, .ov, .sheet, .cf, .sk { animation: none; } }
  `],
  template: `
    <div class="u">
      <section class="u-head">
        <h1>Utilisateurs</h1>
        <p>{{ all().length }} compte{{ all().length > 1 ? 's' : '' }} : {{ count('CLIENT') }} client{{ count('CLIENT') > 1 ? 's' : '' }}, {{ count('COURIER') }} coursier{{ count('COURIER') > 1 ? 's' : '' }}{{ count('SUSPENDED') ? ', dont ' + count('SUSPENDED') + (count('SUSPENDED') > 1 ? ' suspendus' : ' suspendu') : '' }}.</p>
      </section>

      <div class="tools">
        <div class="tabs" role="tablist" aria-label="Filtrer les comptes">
          @for (t of tabs; track t.key) {
            <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" [class.on]="tab() === t.key" (click)="tab.set(t.key)">{{ t.label }} <b>{{ count(t.key) }}</b></button>
          }
        </div>
        <label class="search"><svg lucideSearch size="16"></svg>
          <input class="form-input" type="search" placeholder="Nom, e-mail ou téléphone" aria-label="Rechercher un utilisateur" [ngModel]="q()" (ngModelChange)="q.set($event)"></label>
      </div>

      <div class="list" role="list">
        @if (loading()) {
          <div class="sk"></div><div class="sk"></div><div class="sk"></div>
        } @else {
          @for (u of filtered(); track u.id; let i = $index) {
            <button type="button" role="listitem" class="row" [class.off]="u.status !== 'ACTIVE'" [class.sel]="selected()?.id === u.id"
                    [style.animation-delay.ms]="i < 12 ? i * 25 : 0" (click)="open(u)" [attr.aria-label]="'Ouvrir la fiche de ' + (u.fullName || u.email)">
              <span class="who"><span class="av" aria-hidden="true">{{ u.initials }}</span>
                <span class="nm"><b>{{ u.fullName || u.email }}</b><span>{{ u.email }}</span></span></span>
              <span class="cell"><span class="chip" [class]="'chip ' + roleClass(u.role)">{{ roleLabel(u.role) }}</span></span>
              <span class="cell">@if (u.role === 'COURIER') { <span class="chip" [class]="'chip ' + kycClass(u.kycStatus)">{{ kycLabel(u.kycStatus) }}</span> } @else { — }</span>
              <span class="cell">{{ u.createdAt | date:'d MMM yyyy' }}</span>
              <span class="end">
                <span class="chip role" [class]="'chip role ' + roleClass(u.role)">{{ roleLabel(u.role) }}</span>
                @if (u.status !== 'ACTIVE') { <span class="chip bad">Suspendu</span> }
                <svg lucideChevronRight size="16"></svg>
              </span>
            </button>
          } @empty {
            <div class="empty" role="status">Aucun compte ne correspond.</div>
          }
        }
      </div>
    </div>

    @if (selected(); as s) {
      <div class="ov" (click)="close()"></div>
      <aside class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="'Fiche de ' + (s.fullName || s.email)">
        <button type="button" class="x" aria-label="Fermer" (click)="close()"><svg lucideX size="18"></svg></button>
        <div class="s-head"><span class="av" aria-hidden="true">{{ s.initials }}</span>
          <div><b>{{ s.fullName || s.email }}</b><span>{{ s.email }}</span></div></div>
        <div class="chips">
          <span class="chip" [class]="'chip ' + roleClass(s.role)">{{ roleLabel(s.role) }}</span>
          <span class="chip" [class.ok]="s.status === 'ACTIVE'" [class.bad]="s.status !== 'ACTIVE'">{{ s.status === 'ACTIVE' ? 'Actif' : 'Suspendu' }}</span>
          @if (s.role === 'COURIER') { <span class="chip" [class]="'chip ' + kycClass(s.kycStatus)">{{ kycLabel(s.kycStatus) }}</span> }
        </div>

        <dl class="facts">
          <div><dt>Téléphone</dt><dd>{{ s.phone || '—' }}</dd></div>
          <div><dt>Ville</dt><dd>{{ place(s) }}</dd></div>
          <div><dt>Inscrit le</dt><dd>{{ s.createdAt | date:'d MMMM yyyy' }}</dd></div>
          @if (s.role !== 'ADMIN') {
            <div><dt>Note reçue</dt><dd>@if (s.trustScore > 0) { <svg lucideStar size="13"></svg> {{ rating(s.trustScore) }} / 5 } @else { Pas encore d’avis }</dd></div>
          }
        </dl>

        @if (s.role !== 'ADMIN') {
          <h3>Activité</h3>
          @if (summary(); as a) {
            <div class="stats">
              @if (s.role === 'COURIER') {
                <div class="st"><strong>{{ a.coursesAsCourier }}</strong><span>mission{{ a.coursesAsCourier > 1 ? 's' : '' }} acceptée{{ a.coursesAsCourier > 1 ? 's' : '' }}</span></div>
                <div class="st"><strong>{{ a.completedAsCourier }}</strong><span>terminée{{ a.completedAsCourier > 1 ? 's' : '' }}</span></div>
              } @else {
                <div class="st"><strong>{{ a.coursesAsClient }}</strong><span>course{{ a.coursesAsClient > 1 ? 's' : '' }} créée{{ a.coursesAsClient > 1 ? 's' : '' }}</span></div>
              }
              <a class="st" [class.warn]="openLinked(a) > 0" href="#litiges-lies" (click)="goLinked($event)"><strong>{{ a.disputes.length }}</strong>
                <span>litige{{ a.disputes.length > 1 ? 's' : '' }} lié{{ a.disputes.length > 1 ? 's' : '' }}@if (a.disputes.length) { : {{ openLinked(a) }} à arbitrer, {{ a.disputesOpened }} ouvert{{ a.disputesOpened > 1 ? 's' : '' }} par ce compte }</span></a>
              <a class="st" [class.warn]="a.reportsReceived > 0" routerLink="/admin/reports" (click)="close()"><strong>{{ a.reportsReceived }}</strong><span>signalement{{ a.reportsReceived > 1 ? 's' : '' }} reçu{{ a.reportsReceived > 1 ? 's' : '' }}</span></a>
            </div>
            @if (a.disputes.length) {
              <h3 id="litiges-lies">Litiges liés à ce compte ({{ a.disputes.length }})</h3>
              <div class="disp">
                @for (d of a.disputes; track d.id) {
                  <a class="dl" [class.done]="d.status !== 'OPEN'" routerLink="/admin/disputes" [queryParams]="{ id: d.id }" (click)="close()"
                     [attr.aria-label]="'Voir le litige : ' + motif(d.motifCode)">
                    <span class="dl-ic" aria-hidden="true"><svg lucideScale size="15"></svg></span>
                    <span class="dl-t"><b>{{ motif(d.motifCode) }}</b>
                      <span>Course n° {{ d.courseId }} · {{ d.createdAt | date:'d MMM yyyy' }} · {{ d.openedByThisUser ? 'ouvert par ce compte' : 'ouvert contre ce compte' }}</span></span>
                    <span class="chip" [class.wait]="d.status === 'OPEN'" [class.ok]="d.status !== 'OPEN'">{{ d.status === 'OPEN' ? 'À arbitrer' : doneLabel(d.decision) }}</span>
                    <svg lucideChevronRight size="15"></svg>
                  </a>
                }
              </div>
            }
          } @else if (summaryFailed()) {
            <p class="note">Activité indisponible pour le moment.</p>
          } @else {
            <div class="stats"><div class="st sk"></div><div class="st sk"></div></div>
          }
        }

        @if (s.role === 'ADMIN') {
          <p class="note">Les comptes administrateurs ne peuvent pas être suspendus.</p>
        } @else if (s.status === 'ACTIVE') {
          @if (confirming()) {
            <div class="cf" role="group" aria-label="Confirmer la suspension">
              <b>Suspendre {{ s.fullName || s.email }} ?</b>
              <p>La personne est déconnectée tout de suite et ne peut plus se connecter tant que le compte reste suspendu. Elle reçoit le motif par e-mail. Vous pourrez réactiver le compte à tout moment.</p>
              <textarea class="form-input reason" maxlength="500" aria-label="Motif de la suspension"
                        placeholder="Motif envoyé à la personne (10 caractères minimum)"
                        [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
              <span class="count">{{ reason().trim().length }} / 500</span>
              <div class="acts">
                <button type="button" class="b-plain" (click)="confirming.set(false)">Annuler</button>
                <button type="button" class="b-danger solid" [disabled]="acting() || reason().trim().length < 10" (click)="suspend(s)">Suspendre</button>
              </div>
            </div>
          } @else {
            <div class="acts"><button type="button" class="b-danger" (click)="confirming.set(true)">Suspendre le compte</button></div>
          }
        } @else {
          <p class="note">Ce compte est suspendu : la personne ne peut pas se connecter.</p>
          @if (s.suspensionReason) {
            <div class="why"><small>Motif@if (s.suspendedAt) { · le {{ s.suspendedAt | date:'d MMM yyyy à HH:mm' }} }</small>« {{ s.suspensionReason }} »</div>
          }
          <div class="acts"><button type="button" class="b-ok" [disabled]="acting()" (click)="activate(s)">Réactiver le compte</button></div>
        }
      </aside>
    }
  `,
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'ALL', label: 'Tous' }, { key: 'CLIENT', label: 'Clients' }, { key: 'COURIER', label: 'Coursiers' }, { key: 'SUSPENDED', label: 'Suspendus' },
  ];
  readonly tab = signal<Tab>('ALL');
  readonly q = signal('');
  readonly all = signal<UserProfileResponse[]>([]);
  readonly loading = signal(true);
  readonly selected = signal<UserProfileResponse | null>(null);
  readonly summary = signal<UserActivitySummary | null>(null);
  readonly summaryFailed = signal(false);
  readonly confirming = signal(false);
  readonly acting = signal(false);

  readonly filtered = computed(() => {
    const t = this.tab();
    const q = this.norm(this.q());
    return this.all()
      .filter((u) => (t === 'ALL' ? true : t === 'SUSPENDED' ? u.status !== 'ACTIVE' : u.role === t))
      .filter((u) => !q || this.norm(`${u.fullName ?? ''} ${u.email} ${u.phone ?? ''}`).includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ngOnInit(): void {
    this.adminService.getUsers().subscribe({
      next: (data) => { this.all.set(data); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des utilisateurs.'); this.loading.set(false); },
    });
  }

  count(t: Tab): number {
    return t === 'ALL' ? this.all().length : this.all().filter((u) => (t === 'SUSPENDED' ? u.status !== 'ACTIVE' : u.role === t)).length;
  }

  readonly reason = signal('');

  open(u: UserProfileResponse): void {
    this.selected.set(u);
    this.confirming.set(false);
    this.reason.set('');
    this.summary.set(null);
    this.summaryFailed.set(false);
    if (u.role === 'ADMIN') return;
    this.adminService.getUserSummary(u.id).subscribe({
      next: (a) => { if (this.selected()?.id === u.id) this.summary.set(a); },
      error: () => { if (this.selected()?.id === u.id) this.summaryFailed.set(true); },
    });
  }

  @HostListener('document:keydown.escape')
  close(): void { this.selected.set(null); this.confirming.set(false); }

  suspend(u: UserProfileResponse): void {
    this.acting.set(true);
    const r = this.reason().trim();
    if (r.length < 10) return;
    this.adminService.suspendUser(u.id, r).subscribe({
      next: (x) => { this.replace(x); this.acting.set(false); this.confirming.set(false); this.reason.set(''); this.toast.success(`Compte suspendu : ${x.fullName || x.email} a été déconnecté.`); },
      error: (err) => { this.acting.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors de la suspension.'); },
    });
  }

  activate(u: UserProfileResponse): void {
    this.acting.set(true);
    this.adminService.activateUser(u.id).subscribe({
      next: (x) => { this.replace(x); this.acting.set(false); this.toast.success(`Compte réactivé : ${x.fullName || x.email} peut se reconnecter.`); },
      error: (err) => { this.acting.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors de la réactivation.'); },
    });
  }

  private replace(x: UserProfileResponse): void {
    this.all.update((l) => l.map((u) => (u.id === x.id ? x : u)));
    if (this.selected()?.id === x.id) this.selected.set(x);
  }

  roleLabel(r: string): string { return r === 'CLIENT' ? 'Client' : r === 'COURIER' ? 'Coursier' : r === 'ADMIN' ? 'Administrateur' : r; }
  roleClass(r: string): string { return r === 'CLIENT' ? 'client' : r === 'COURIER' ? 'courier' : 'admin'; }
  kycLabel(k: string): string { return k === 'APPROVED' ? 'Identité vérifiée' : k === 'PENDING' ? 'Identité à vérifier' : k === 'REJECTED' ? 'Identité refusée' : 'Identité non envoyée'; }
  kycClass(k: string): string { return k === 'APPROVED' ? 'ok' : k === 'PENDING' ? 'wait' : k === 'REJECTED' ? 'bad' : ''; }
  openLinked(a: UserActivitySummary): number { return a.disputes.filter((d) => d.status === 'OPEN').length; }
  goLinked(e: Event): void { e.preventDefault(); document.getElementById('litiges-lies')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  motif(code: string): string { return DISPUTE_MOTIFS[code] ?? code; }
  doneLabel(dec: string | null): string { return (dec && DISPUTE_DONE[dec]) || 'Résolu'; }
  place(u: UserProfileResponse): string { return [u.city, u.country].filter(Boolean).join(', ') || '—'; }
  rating(v: number): string { return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v); }
  private norm(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
}
