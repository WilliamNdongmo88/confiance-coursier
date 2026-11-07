import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminKycResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaViewerComponent, MediaItem } from '../../../shared/components/media-viewer/media-viewer.component';
import { LucideAlertTriangle, LucideCheck, LucideChevronDown, LucideFileText, LucideMaximize2, LucideShieldCheck, LucideTrash2, LucideX } from '@lucide/angular';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

/** Motifs de refus fréquents (le texte reste modifiable avant l'envoi). */
const REASONS = [
  'Photo floue ou illisible',
  'Pièce coupée ou incomplète',
  'Le selfie ne permet pas de reconnaître la personne',
  'Les informations ne correspondent pas à la pièce',
  'Pièce expirée',
];

/**
 * Examen des dossiers d'identité (admin), Impeccable, mode Operate.
 * Les dossiers à examiner d'abord ; pièces et selfie affichés côte à côte pour comparer sans ouvrir de fenêtre ;
 * points d'attention détectés automatiquement (âge, nom différent du compte) ; refus avec motif obligatoire.
 */
@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [DatePipe, FormsModule, MediaViewerComponent,
    LucideAlertTriangle, LucideCheck, LucideChevronDown, LucideFileText, LucideMaximize2, LucideShieldCheck, LucideTrash2, LucideX],
  styles: [`
    :host { display: block; --am: #56635c; }
    :host-context([data-theme="dark"]) { --am: #B0C0B7; }
    .a { max-width: 1100px; margin: 0 auto; }
    .a-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .a-head p { margin: 0 0 16px; font-size: 15px; color: var(--am); }
    .tabs { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; margin-bottom: 16px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); }
    .tabs button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 9px; background: none; color: var(--am); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; }
    .tabs button.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .tabs b { min-width: 22px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; background: var(--cc-line); color: var(--cc-ink); }
    .tabs button.on b.hot { background: #d93a32; color: #fff; }
    .kc { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; margin-bottom: 14px; overflow: hidden; animation: a-in .4s cubic-bezier(.16,1,.3,1) both; }
    .top { display: flex; align-items: center; gap: 12px; padding: 16px 18px; flex-wrap: wrap; }
    .av { flex: none; width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); font-weight: 800; }
    .who { flex: 1 1 220px; min-width: 0; }
    .who b { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 15.5px; color: var(--cc-ink); }
    .who span { display: block; margin-top: 2px; font-size: 13px; color: var(--am); overflow: hidden; text-overflow: ellipsis; }
    .st { padding: 2px 9px; border-radius: 99px; font-size: 12px; font-weight: 750; }
    .st.PENDING { background: var(--cc-warning-bg); color: #8a5a14; }
    .st.APPROVED { background: var(--cc-success-bg); color: var(--cc-success); }
    .st.REJECTED { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .toggle { min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .toggle svg { transition: transform .2s; }
    .toggle.open svg { transform: rotate(180deg); }
    .body { padding: 0 18px 18px; display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; }
    .docs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .doc { position: relative; display: block; padding: 0; border: 1px solid var(--cc-line); border-radius: 12px; overflow: hidden; background: #0f1a15; aspect-ratio: 3 / 4; cursor: zoom-in; }
    .doc img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .doc .lbl { position: absolute; left: 6px; bottom: 6px; padding: 3px 8px; border-radius: 7px; background: rgba(0,0,0,.65); color: #fff; font-size: 12px; font-weight: 750; }
    .doc .zoom { position: absolute; right: 6px; top: 6px; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: rgba(0,0,0,.55); color: #fff; }
    .doc .nofile { width: 100%; height: 100%; display: grid; place-items: center; align-content: center; gap: 4px; color: #cfdcd4; font-size: 12.5px; font-weight: 700; }
    .facts { margin: 0; display: grid; gap: 0; border: 1px solid var(--cc-line); border-radius: 12px; overflow: hidden; }
    .facts div { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; font-size: 13.5px; }
    .facts div + div { border-top: 1px solid var(--cc-line); }
    .facts dt { color: var(--am); }
    .facts dd { margin: 0; font-weight: 650; color: var(--cc-ink); text-align: right; }
    .warns { display: grid; gap: 6px; margin-top: 10px; }
    .warn { display: flex; gap: 8px; align-items: flex-start; padding: 9px 11px; border-radius: 10px; background: var(--cc-warning-bg); color: var(--cc-ink); font-size: 13px; line-height: 1.4; }
    .warn svg { flex: none; margin-top: 1px; color: var(--cc-warning); }
    .reason { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--cc-danger-bg); font-size: 13px; color: var(--cc-ink); }
    .acts { grid-column: 1 / -1; display: flex; gap: 10px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--cc-line); }
    .acts .ok, .acts .no { min-height: 46px; padding: 0 18px; border-radius: 11px; border: 0; font: inherit; font-size: 14.5px; font-weight: 750; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
    .ok { background: var(--primary); color: #fff; }
    .no { background: var(--cc-danger-bg); color: var(--cc-danger); border: 1px solid color-mix(in oklab, var(--cc-danger) 40%, transparent) !important; }
    .del { margin-left: auto; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 0; background: none; color: var(--am); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .del:hover { color: var(--cc-danger); }
    .rej { grid-column: 1 / -1; padding: 14px; border-radius: 12px; border: 1.5px solid color-mix(in oklab, var(--cc-danger) 45%, transparent); animation: a-in .3s cubic-bezier(.16,1,.3,1); }
    .rej h3 { margin: 0 0 8px; font-size: 14.5px; color: var(--cc-ink); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .chips button { min-height: 36px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-size: 13px; cursor: pointer; }
    .chips button.on { border-color: var(--cc-danger); color: var(--cc-danger); }
    .rej textarea { min-height: 80px; }
    .rej-acts { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
    .rej-acts button { min-height: 44px; padding: 0 16px; border-radius: 10px; font: inherit; font-weight: 750; cursor: pointer; }
    .b-plain { border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); }
    .b-danger { border: 0; background: var(--cc-danger); color: #fff; }
    .b-danger:disabled { opacity: .45; cursor: not-allowed; }
    .empty { padding: 34px 16px; text-align: center; border: 1px dashed var(--cc-line); border-radius: 16px; color: var(--am); }
    .empty svg { color: var(--cc-success); }
    .empty b { display: block; margin: 8px 0 4px; font-size: 16px; color: var(--cc-ink); }
    .sk { height: 120px; border-radius: 16px; margin-bottom: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: a-sk 1.2s linear infinite; }
    @keyframes a-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes a-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .a-head h1, :host-context([data-theme="dark"]) .who b, :host-context([data-theme="dark"]) .facts dd,
    :host-context([data-theme="dark"]) .warn, :host-context([data-theme="dark"]) .reason, :host-context([data-theme="dark"]) .rej h3,
    :host-context([data-theme="dark"]) .empty b { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .av, :host-context([data-theme="dark"]) .tabs { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .av { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .tabs button.on { background: #2B4A3E; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .ok { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .no, :host-context([data-theme="dark"]) .st.REJECTED { color: #F0A39C; }
    :host-context([data-theme="dark"]) .st.PENDING { color: #E3A857; }
    :host-context([data-theme="dark"]) .warn { background: rgba(227,168,87,.12); }
    :host-context([data-theme="dark"]) .b-danger { background: #c2413a; }
    @media (max-width: 860px) { .body { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .top, .body { padding-left: 14px; padding-right: 14px; }
      .acts .ok, .acts .no { flex: 1 1 140px; justify-content: center; }
      .del { margin-left: 0; }
      .tabs { display: grid; grid-template-columns: repeat(4, auto); width: 100%; }
      .tabs button { justify-content: center; padding: 0 6px; font-size: 13px; gap: 4px; }
      .tabs b { min-width: 18px; padding: 0 4px; }
      .doc .lbl { font-size: 11px; padding: 2px 6px; }
    }
    @media (prefers-reduced-motion: reduce) { .kc, .rej, .sk { animation: none; } }
  `],
  template: `
    <div class="a">
      <section class="a-head">
        <h1>Vérifications d’identité</h1>
        <p>@if (pendingCount()) { {{ pendingCount() }} dossier{{ pendingCount() > 1 ? 's' : '' }} à examiner : les coursiers ne peuvent pas travailler avant votre décision. } @else { Aucun dossier en attente. }</p>
      </section>

      <div class="tabs" role="tablist" aria-label="Filtrer les dossiers">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" [class.on]="tab() === t.key" (click)="tab.set(t.key)">
            {{ t.label }} <b [class.hot]="t.key === 'PENDING' && pendingCount() > 0">{{ count(t.key) }}</b>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else if (list().length === 0) {
        <div class="empty" role="status">
          <svg lucideShieldCheck size="30"></svg>
          <b>{{ tab() === 'PENDING' ? 'Tout est à jour' : 'Aucun dossier' }}</b>
          <span>{{ tab() === 'PENDING' ? 'Les nouveaux dossiers des coursiers apparaîtront ici.' : 'Aucun dossier dans cette catégorie.' }}</span>
        </div>
      } @else {
        @for (k of list(); track k.id; let i = $index) {
          <article class="kc" [style.animation-delay.ms]="i * 40">
            <div class="top">
              <span class="av" aria-hidden="true">{{ initials(k) }}</span>
              <div class="who">
                <b>{{ k.userFullName || ((k.firstName || '') + ' ' + (k.lastName || '')) }} <span class="st" [class]="'st ' + k.status">{{ statusLabel(k.status) }}</span></b>
                <span>{{ k.documentType === 'PASSPORT' ? 'Passeport' : 'Carte d’identité' }} · envoyé le {{ k.submittedAt | date:'d MMM yyyy à HH:mm' }} · {{ k.userEmail }}</span>
              </div>
              @if (k.status !== 'PENDING') {
                <button type="button" class="toggle" [class.open]="isOpen(k)" [attr.aria-expanded]="isOpen(k)" (click)="toggle(k)">
                  {{ isOpen(k) ? 'Masquer' : 'Voir le dossier' }} <svg lucideChevronDown size="15"></svg>
                </button>
              }
            </div>

            @if (isOpen(k)) {
              <div class="body">
                <div class="docs">
                  @for (d of docsOf(k); track d.label; let j = $index) {
                    <button type="button" class="doc" (click)="openViewer(k, j)" [attr.aria-label]="'Agrandir : ' + d.label">
                      @if (d.url && !failed().has(d.url)) { <img [src]="d.url" [alt]="d.label" loading="lazy" (error)="markFailed(d.url)"> }
                      @else { <span class="nofile"><svg lucideFileText size="26"></svg>{{ d.url ? 'Ouvrir' : 'Absent' }}</span> }
                      <span class="lbl">{{ d.label }}</span>
                      <span class="zoom"><svg lucideMaximize2 size="14"></svg></span>
                    </button>
                  }
                </div>
                <div>
                  <dl class="facts">
                    <div><dt>Prénom</dt><dd>{{ k.firstName || '—' }}</dd></div>
                    <div><dt>Nom</dt><dd>{{ k.lastName || '—' }}</dd></div>
                    <div><dt>Naissance</dt><dd>{{ k.birthDate ? (k.birthDate | date:'d MMMM yyyy') : '—' }}@if (age(k) !== null && age(k)! >= 0) { · {{ age(k) }} ans }</dd></div>
                    <div><dt>Nationalité</dt><dd>{{ k.nationality || '—' }}</dd></div>
                  </dl>
                  @if (warnings(k).length) {
                    <div class="warns">@for (w of warnings(k); track w) { <div class="warn"><svg lucideAlertTriangle size="15"></svg><span>{{ w }}</span></div> }</div>
                  }
                  @if (k.status === 'REJECTED' && k.rejectionReason) { <div class="reason"><strong>Motif du refus :</strong> {{ k.rejectionReason }}</div> }
                </div>

                @if (rejectingId() === k.id) {
                  <div class="rej" role="group" aria-label="Refuser le dossier">
                    <h3>Pourquoi refuser ce dossier ? Le coursier recevra ce motif.</h3>
                    <div class="chips">
                      @for (r of reasons; track r) { <button type="button" [class.on]="rejectReason() === r" (click)="rejectReason.set(r)">{{ r }}</button> }
                    </div>
                    <textarea class="form-input" [ngModel]="rejectReason()" (ngModelChange)="rejectReason.set($event)" maxlength="500"
                              placeholder="Précisez si besoin ce qu’il faut corriger"></textarea>
                    <div class="rej-acts">
                      <button type="button" class="b-plain" (click)="cancelReject()">Annuler</button>
                      <button type="button" class="b-danger" [disabled]="!rejectReason().trim() || acting()" (click)="confirmReject(k)">Refuser le dossier</button>
                    </div>
                  </div>
                } @else {
                  <div class="acts">
                    @if (k.status === 'PENDING') {
                      <button type="button" class="ok" [disabled]="acting()" (click)="approve(k)"><svg lucideCheck size="16"></svg> Approuver</button>
                      <button type="button" class="no" [disabled]="acting()" (click)="startReject(k)"><svg lucideX size="16"></svg> Refuser</button>
                    }
                    <button type="button" class="del" [disabled]="deletingId() === k.id" (click)="deleteKyc(k)"><svg lucideTrash2 size="14"></svg> Supprimer le dossier</button>
                  </div>
                }
              </div>
            }
          </article>
        }
      }
    </div>

    <app-media-viewer [items]="viewerItems()" [activeIndex]="viewerIndex()" [open]="viewerOpen()" (close)="viewerOpen.set(false)" />
  `,
})
export class AdminKycComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly reasons = REASONS;
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'PENDING', label: 'À voir' }, { key: 'APPROVED', label: 'Approuvés' }, { key: 'REJECTED', label: 'Refusés' }, { key: 'ALL', label: 'Tous' },
  ];
  readonly tab = signal<Tab>('PENDING');
  readonly allList = signal<AdminKycResponse[]>([]);
  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly rejectingId = signal<number | null>(null);
  readonly rejectReason = signal('');
  readonly deletingId = signal<number | null>(null);
  readonly failed = signal<Set<string>>(new Set());
  private readonly opened = signal<Set<number>>(new Set());

  readonly pendingCount = computed(() => this.count('PENDING'));
  readonly list = computed(() => {
    const t = this.tab();
    return this.allList()
      .filter((k) => t === 'ALL' || k.status === t)
      .sort((a, b) => new Date(t === 'PENDING' ? a.submittedAt ?? 0 : b.submittedAt ?? 0).getTime()
        - new Date(t === 'PENDING' ? b.submittedAt ?? 0 : a.submittedAt ?? 0).getTime());
  });

  readonly viewerOpen = signal(false);
  readonly viewerItems = signal<MediaItem[]>([]);
  readonly viewerIndex = signal(0);

  ngOnInit(): void {
    this.loading.set(true);
    this.adminService.getKycList().subscribe({
      next: (data) => { this.allList.set(data); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des dossiers.'); this.loading.set(false); },
    });
  }

  count(t: Tab): number { return t === 'ALL' ? this.allList().length : this.allList().filter((k) => k.status === t).length; }

  /** Les dossiers à examiner sont toujours ouverts ; les autres se déplient à la demande. */
  isOpen(k: AdminKycResponse): boolean { return k.status === 'PENDING' || this.opened().has(k.id); }
  toggle(k: AdminKycResponse): void {
    this.opened.update((s) => { const n = new Set(s); n.has(k.id) ? n.delete(k.id) : n.add(k.id); return n; });
  }

  docsOf(k: AdminKycResponse): { label: string; url: string | null }[] {
    return [
      { label: k.documentType === 'PASSPORT' ? 'Page 1' : 'Recto', url: k.frontFileUrl },
      { label: k.documentType === 'PASSPORT' ? 'Page 2' : 'Verso', url: k.backFileUrl },
      { label: 'Selfie', url: k.selfieFileUrl },
    ];
  }

  markFailed(url: string): void { this.failed.update((s) => new Set(s).add(url)); }

  openViewer(k: AdminKycResponse, start: number): void {
    const items: MediaItem[] = this.docsOf(k).filter((d) => !!d.url)
      .map((d) => ({ url: d.url!, type: this.failed().has(d.url!) ? 'pdf' : 'image', label: d.label }));
    if (!items.length) return;
    this.viewerItems.set(items);
    this.viewerIndex.set(Math.min(start, items.length - 1));
    this.viewerOpen.set(true);
  }

  age(k: AdminKycResponse): number | null {
    if (!k.birthDate) return null;
    const b = new Date(k.birthDate);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a;
  }

  /** Points d'attention détectés automatiquement (aide à la décision, jamais bloquants). */
  warnings(k: AdminKycResponse): string[] {
    const w: string[] = [];
    const a = this.age(k);
    if (a !== null && a < 0) w.push('La date de naissance est dans le futur.');
    else if (a !== null && a < 18) w.push(`Personne mineure (${a} ans) : la plateforme exige 18 ans.`);
    const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const declared = norm(`${k.firstName ?? ''} ${k.lastName ?? ''}`);
    const account = norm(k.userFullName ?? '');
    if (declared && account) {
      const words = declared.split(' ');
      if (!words.every((x) => account.includes(x))) w.push(`Le nom déclaré diffère du nom du compte (« ${k.userFullName} »).`);
    }
    if (!k.frontFileUrl || !k.backFileUrl || !k.selfieFileUrl) w.push('Un document est manquant.');
    return w;
  }

  initials(k: AdminKycResponse): string {
    const name = k.userFullName || `${k.firstName ?? ''} ${k.lastName ?? ''}`;
    return name.trim().split(/\s+/).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('') || '?';
  }

  statusLabel(s: string): string { return s === 'APPROVED' ? 'Approuvé' : s === 'REJECTED' ? 'Refusé' : 'À examiner'; }

  approve(k: AdminKycResponse): void {
    this.acting.set(true);
    this.adminService.approveKyc(k.id).subscribe({
      next: (u) => { this.acting.set(false); this.allList.update((l) => l.map((x) => (x.id === u.id ? u : x))); this.toast.success(`${k.userFullName || 'Coursier'} vérifié : il peut maintenant proposer ses services.`); },
      error: () => { this.acting.set(false); this.toast.error('Erreur lors de l’approbation.'); },
    });
  }

  startReject(k: AdminKycResponse): void { this.rejectingId.set(k.id); this.rejectReason.set(''); }
  cancelReject(): void { this.rejectingId.set(null); this.rejectReason.set(''); }

  confirmReject(k: AdminKycResponse): void {
    if (!this.rejectReason().trim()) return;
    this.acting.set(true);
    this.adminService.rejectKyc(k.id, this.rejectReason().trim()).subscribe({
      next: (u) => { this.acting.set(false); this.allList.update((l) => l.map((x) => (x.id === u.id ? u : x))); this.toast.success(`Dossier de ${k.userFullName || 'coursier'} refusé : il a été prévenu.`); this.cancelReject(); },
      error: () => { this.acting.set(false); this.toast.error('Erreur lors du refus.'); },
    });
  }

  deleteKyc(k: AdminKycResponse): void {
    if (!confirm(`Supprimer définitivement le dossier de ${k.userFullName || 'cet utilisateur'} et ses fichiers ? Cette action est irréversible.`)) return;
    this.deletingId.set(k.id);
    this.adminService.deleteKyc(k.id).subscribe({
      next: () => { this.allList.update((l) => l.filter((x) => x.id !== k.id)); this.deletingId.set(null); this.toast.success('Dossier supprimé.'); },
      error: (err) => { this.deletingId.set(null); this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression.'); },
    });
  }
}
