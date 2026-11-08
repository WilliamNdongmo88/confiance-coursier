import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCourseRow, AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../shared/status/status-badge.component';
import { LucideAlertTriangle, LucideCalendar, LucideChevronRight, LucideMapPin, LucidePackage, LucideSearch } from '@lucide/angular';

interface Filter { key: string; label: string; }

/**
 * Gestion des courses (admin, TICK-091) : toutes les courses, filtrables par état et recherchables
 * (numéro, description, lieu, nom / email / téléphone du client ou du coursier), paginées.
 * « Bloquées » : en retard, ou argent bloqué depuis plus de 72 h sans clôture.
 */
@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StatusBadgeComponent,
    LucideAlertTriangle, LucideCalendar, LucideChevronRight, LucideMapPin, LucidePackage, LucideSearch],
  styles: [`
    :host { display: block; min-width: 0; --km: #56635c; }
    :host-context([data-theme="dark"]) { --km: #B0C0B7; }
    .k { max-width: 1100px; margin: 0 auto; }
    .k-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .k-head p { margin: 0 0 16px; font-size: 15px; color: var(--km); }
    .tools { display: grid; gap: 10px; margin-bottom: 14px; }
    .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
    .chips::-webkit-scrollbar { display: none; }
    .chips button { flex: none; min-height: 40px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--cc-line); background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-size: 13.5px; font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .chips button.on { border-color: transparent; background: var(--cc-forest); color: #fff; }
    .chips button.warn:not(.on) { border-color: color-mix(in oklab, var(--cc-danger) 40%, var(--cc-line)); color: var(--cc-danger); }
    .search { position: relative; }
    .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--km); pointer-events: none; }
    .search input { width: 100%; min-height: 46px; padding-left: 38px; }
    .count { margin: 0 0 8px; font-size: 13px; color: var(--km); }
    .list { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-top: 1px solid var(--cc-line); color: inherit; text-decoration: none;
      transition: background .15s; animation: k-in .3s cubic-bezier(.16,1,.3,1) both; }
    .row:first-child { border-top: 0; }
    .row:hover { background: var(--cc-paper-2); }
    .ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-paper-2); color: var(--primary); }
    .row.blocked .ic { background: var(--cc-danger-bg); color: var(--cc-danger); }
    .body { flex: 1; min-width: 0; }
    .top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 4px 10px; }
    .title { flex: 1 1 240px; min-width: 0; margin: 0; font-size: 14.5px; font-weight: 700; line-height: 1.35; color: var(--cc-ink);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { display: flex; flex-wrap: wrap; gap: 3px 14px; margin-top: 4px; font-size: 12.5px; color: var(--km); }
    .meta span { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
    .flag { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; padding: 2px 9px; border-radius: 99px; font-size: 12px; font-weight: 700;
      background: var(--cc-danger-bg); color: var(--cc-danger); }
    .amt { flex: none; text-align: right; font-size: 14px; font-weight: 800; color: var(--cc-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .go { flex: none; color: var(--km); }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; font-size: 13.5px; color: var(--km); }
    .pager button { min-height: 42px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-weight: 700; cursor: pointer; }
    .pager button:disabled { opacity: .45; cursor: default; }
    .empty { padding: 30px 16px; text-align: center; color: var(--km); font-size: 14px; }
    .sk { height: 70px; border-top: 1px solid var(--cc-line); background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: k-sk 1.2s linear infinite; }
    @keyframes k-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
    @keyframes k-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .k-head h1, :host-context([data-theme="dark"]) .title, :host-context([data-theme="dark"]) .amt { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .ic, :host-context([data-theme="dark"]) .row:hover { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .ic { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .chips button, :host-context([data-theme="dark"]) .pager button { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .chips button.on { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .row.blocked .ic, :host-context([data-theme="dark"]) .flag { background: rgba(240,163,156,.12); color: #F0A39C; }
    :host-context([data-theme="dark"]) .chips button.warn:not(.on) { color: #F0A39C; }
    @media (max-width: 640px) {
      .row { padding: 12px 14px; align-items: flex-start; }
      .title { flex-basis: 100%; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .amt { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { .row, .sk { animation: none; } }
  `],
  template: `
    <div class="k">
      <section class="k-head">
        <h1>Courses</h1>
        <p>Toutes les courses de la plateforme : retrouvez-en une, suivez son argent et intervenez si besoin.</p>
      </section>

      <div class="tools">
        <div class="chips" role="tablist" aria-label="Filtrer les courses">
          @for (f of filters; track f.key) {
            <button type="button" role="tab" [attr.aria-selected]="status() === f.key" [class.on]="status() === f.key" [class.warn]="f.key === 'BLOCKED'"
                    (click)="setStatus(f.key)">
              @if (f.key === 'BLOCKED') { <svg lucideAlertTriangle size="14"></svg> }
              {{ f.label }}
            </button>
          }
        </div>
        <label class="search"><svg lucideSearch size="16"></svg>
          <input class="form-input" type="search" placeholder="N° de course, description, lieu, client ou coursier" aria-label="Rechercher une course"
                 [ngModel]="q()" (ngModelChange)="onSearch($event)"></label>
      </div>

      @if (!loading()) {
        <p class="count" role="status">{{ total() }} course{{ total() > 1 ? 's' : '' }}{{ status() === 'BLOCKED' ? ' bloquée' + (total() > 1 ? 's' : '') : '' }}</p>
      }

      <div class="list">
        @if (loading()) {
          <div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div>
        } @else {
          @for (c of items(); track c.id; let i = $index) {
            <a class="row" [class.blocked]="c.blocked" [routerLink]="['/admin/courses', c.id]" [style.animation-delay.ms]="i < 12 ? i * 25 : 0"
               [attr.aria-label]="'Ouvrir la course n° ' + c.id">
              <span class="ic" aria-hidden="true">@if (c.blocked) { <svg lucideAlertTriangle size="17"></svg> } @else { <svg lucidePackage size="17"></svg> }</span>
              <div class="body">
                <div class="top">
                  <h3 class="title">{{ c.description }}</h3>
                  <app-status-badge [status]="c.status" role="ADMIN" />
                </div>
                <div class="meta">
                  <span>N° {{ c.id }}</span>
                  @if (c.zone) { <span><svg lucideMapPin size="12"></svg> {{ zone(c.zone) }}</span> }
                  <span><svg lucideCalendar size="12"></svg> {{ c.createdAt | date:'d MMM yyyy' }}</span>
                  <span>{{ c.clientName || 'Client' }}@if (c.courierName) { → {{ c.courierName }} }</span>
                </div>
                @if (c.blocked) { <span class="flag"><svg lucideAlertTriangle size="12"></svg> {{ c.status === 'OVERDUE' ? 'En retard sur les preuves' : 'Argent bloqué depuis plus de 72 h' }}</span> }
              </div>
              @if (c.totalAmount) { <span class="amt">{{ xaf(c.totalAmount) }}</span> }
              <svg class="go" lucideChevronRight size="16"></svg>
            </a>
          } @empty {
            <div class="empty" role="status">{{ q() ? 'Aucune course ne correspond à la recherche.' : status() === 'BLOCKED' ? 'Aucune course bloquée : tout suit son cours.' : 'Aucune course dans cette catégorie.' }}</div>
          }
        }
      </div>

      @if (!loading() && total() > size) {
        <nav class="pager" aria-label="Pages">
          <button type="button" [disabled]="page() === 0" (click)="go(page() - 1)">Précédentes</button>
          <span>Page {{ page() + 1 }} sur {{ pages() }}</span>
          <button type="button" [disabled]="page() + 1 >= pages()" (click)="go(page() + 1)">Suivantes</button>
        </nav>
      }
    </div>
  `,
})
export class AdminCoursesComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly filters: Filter[] = [
    { key: '', label: 'Toutes' }, { key: 'BLOCKED', label: 'Bloquées' }, { key: 'PUBLISHED', label: 'En attente d’offres' },
    { key: 'ASSIGNED', label: 'À payer' }, { key: 'IN_PROGRESS', label: 'En cours' }, { key: 'PROOFS_SUBMITTED', label: 'Preuves à valider' },
    { key: 'DISPUTED', label: 'En litige' }, { key: 'COMPLETED', label: 'Terminées' }, { key: 'REFUNDED', label: 'Remboursées' },
    { key: 'CANCELLED', label: 'Annulées' },
  ];
  readonly size = 20;
  readonly status = signal('');
  readonly q = signal('');
  readonly page = signal(0);
  readonly items = signal<AdminCourseRow[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  ngOnInit(): void {
    // Filtre initial depuis l'adresse (ex. /admin/courses?status=BLOCKED depuis le tableau de bord)
    const qp = this.route.snapshot.queryParamMap;
    this.status.set((qp.get('status') ?? '').toUpperCase());
    this.q.set(qp.get('q') ?? '');
    this.load();
    this.destroyRef.onDestroy(() => { if (this.timer) clearTimeout(this.timer); });
  }

  pages(): number { return Math.max(1, Math.ceil(this.total() / this.size)); }

  setStatus(key: string): void {
    this.status.set(key);
    this.page.set(0);
    this.syncUrl();
    this.load();
  }

  onSearch(v: string): void {
    this.q.set(v);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page.set(0); this.syncUrl(); this.load(); }, 300);
  }

  go(p: number): void {
    this.page.set(p);
    this.load();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private syncUrl(): void {
    this.router.navigate([], { queryParams: { status: this.status() || null, q: this.q().trim() || null }, replaceUrl: true });
  }

  private load(): void {
    const mine = ++this.seq;
    this.loading.set(true);
    this.adminService.getCourses(this.status(), this.q(), this.page(), this.size).subscribe({
      next: (r) => {
        if (mine !== this.seq) return; // une réponse plus ancienne ne remplace pas la dernière recherche
        this.items.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => { if (mine === this.seq) { this.loading.set(false); this.toast.error('Erreur lors du chargement des courses.'); } },
    });
  }

  zone(z: string): string { return z.replace(' - ', ' · '); }
  xaf(v: number): string { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/ /g, ' ')} XAF`; }
}
