import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { LucideArrowLeft, LucideBike, LucideFileWarning, LucideMail, LucideMoon, LucidePhone, LucideSun } from '@lucide/angular';
import { CGU, LegalBlock, LegalDoc, PRIVACY, PUBLISHER } from './legal-content';

/**
 * Pages juridiques publiques : /conditions-utilisation et /confidentialite (route data `doc`).
 * Lecture longue : colonne de 68ch, sommaire collant sur grand écran (repliable sur mobile),
 * section courante surlignée au défilement. Un encadré liste honnêtement ce qui reste à compléter.
 */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, LucideArrowLeft, LucideBike, LucideFileWarning, LucideMail, LucideMoon, LucidePhone, LucideSun],
  template: `
    <header class="lg-bar">
      <div class="lg-bar-in">
        <a class="lg-back" routerLink="/" aria-label="Retour à l’accueil"><svg lucideArrowLeft size="16"></svg> Accueil</a>
        <a class="lg-brand" routerLink="/"><span class="auth-mark"><svg lucideBike size="16"></svg></span><span>ConfianceCoursier</span></a>
        <button class="theme-toggle" type="button" (click)="theme.toggleTheme()"
          [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'">
          @if (theme.isDarkMode()) { <svg lucideSun size="18"></svg> } @else { <svg lucideMoon size="18"></svg> }
        </button>
      </div>
    </header>

    <main class="lg-main">
      <nav class="lg-switch" aria-label="Documents juridiques">
        <a routerLink="/conditions-utilisation" [class.on]="doc.key === 'cgu'" [attr.aria-current]="doc.key === 'cgu' ? 'page' : null">Conditions d’utilisation</a>
        <a routerLink="/confidentialite" [class.on]="doc.key === 'privacy'" [attr.aria-current]="doc.key === 'privacy' ? 'page' : null">Confidentialité</a>
      </nav>

      <header class="lg-head">
        <h1>{{ doc.title }}</h1>
        <p class="lg-date">Mise à jour le {{ doc.updated }}</p>
        <p class="lg-intro">{{ doc.intro }}</p>
      </header>

      <aside class="lg-draft" aria-label="Statut du document">
        <svg lucideFileWarning size="20"></svg>
        <div>
          <strong>Document en cours de validation juridique</strong>
          <p>Ce texte s’appuie sur le droit camerounais en vigueur et sera relu par un juriste. Il reste à compléter :</p>
          <ul>@for (p of doc.pending; track p) { <li>{{ p }}</li> }</ul>
        </div>
      </aside>

      <div class="lg-layout">
        <nav class="lg-toc" aria-label="Sommaire">
          <details [open]="tocOpen()" (toggle)="onTocToggle($event)">
            <summary>Sommaire</summary>
            <ol>
              @for (s of doc.sections; track s.id) {
                <li><a [href]="'#' + s.id" [class.on]="active() === s.id" (click)="goTo($event, s.id)">{{ s.title }}</a></li>
              }
            </ol>
          </details>
        </nav>

        <article class="lg-doc">
          @for (s of doc.sections; track s.id; let i = $index) {
            <section [id]="s.id" class="lg-sec">
              <h2><span class="lg-num">{{ i + 1 }}.</span> {{ s.title }}</h2>
              @for (b of s.blocks; track $index) {
                @if (isText(b)) {
                  <p>{{ b }}</p>
                } @else if (isList(b)) {
                  <ul>@for (item of b.list; track item) { <li>{{ item }}</li> }</ul>
                } @else {
                  <address class="lg-contact">
                    <a [href]="'mailto:' + pub.email"><svg lucideMail size="16"></svg> {{ pub.email }}</a>
                    <a [href]="'tel:' + pub.phoneHref"><svg lucidePhone size="16"></svg> {{ pub.phone }}</a>
                    <span>{{ pub.name }}, {{ pub.address }}</span>
                  </address>
                }
              }
            </section>
          }
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--brand-paper); color: var(--cc-ink);
      --lg-muted: #56635c; --lg-soft: #f0f3ef; --lg-warn-bg: #fbf3e4; --lg-warn: #8a5a14; }
    :host-context([data-theme="dark"]) { --lg-muted: #B0C0B7; --lg-soft: rgba(255,255,255,.05); --lg-warn-bg: rgba(227,168,87,.12); --lg-warn: #E3A857; }
    .lg-bar { position: sticky; top: 0; z-index: 20; background: color-mix(in oklab, var(--brand-paper) 88%, transparent);
      backdrop-filter: blur(12px); border-bottom: 1px solid var(--cc-line); }
    .lg-bar-in { width: min(1120px, calc(100% - 32px)); margin: auto; height: 62px; display: flex; align-items: center; gap: 12px; }
    .lg-back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 8px; border-radius: 8px;
      color: var(--lg-muted); font-size: .88rem; font-weight: 600; text-decoration: none; }
    .lg-back:hover { color: var(--cc-ink); background: var(--lg-soft); }
    .lg-brand { margin: 0 auto; display: inline-flex; align-items: center; gap: 9px; color: var(--cc-ink); font-weight: 800;
      letter-spacing: -.03em; text-decoration: none; }
    .lg-brand .auth-mark { width: 30px; height: 30px; border-radius: 10px; }
    .lg-main { width: min(1120px, calc(100% - 32px)); margin: auto; padding: 28px 0 72px; animation: auth-rise .5s cubic-bezier(.16,1,.3,1) both; }
    .lg-switch { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--lg-soft); border: 1px solid var(--cc-line); }
    .lg-switch a { min-height: 40px; display: inline-flex; align-items: center; padding: 0 14px; border-radius: 9px;
      color: var(--lg-muted); font-size: .88rem; font-weight: 650; text-decoration: none; transition: background .18s, color .18s; }
    .lg-switch a.on { background: var(--cc-white); color: var(--cc-ink); box-shadow: 0 2px 8px rgba(18,59,50,.08); }
    .lg-head { max-width: 68ch; margin: 26px 0 22px; }
    .lg-head h1 { margin: 0 0 8px; font-size: clamp(2rem, 4.4vw, 2.9rem); line-height: 1.05; letter-spacing: -.04em; font-weight: 800; }
    .lg-date { margin: 0 0 14px; color: var(--lg-muted); font-size: .88rem; }
    .lg-intro { margin: 0; font-size: 1.05rem; line-height: 1.65; }
    .lg-draft { max-width: 72ch; display: flex; gap: 12px; padding: 16px 18px; margin-bottom: 34px; border-radius: 13px;
      background: var(--lg-warn-bg); border: 1px solid color-mix(in oklab, var(--lg-warn) 30%, transparent); font-size: .9rem; line-height: 1.55; }
    .lg-draft > svg { flex: none; color: var(--lg-warn); margin-top: 2px; }
    .lg-draft strong { display: block; margin-bottom: 4px; }
    .lg-draft p { margin: 0 0 6px; }
    .lg-draft ul { margin: 0; padding-left: 18px; list-style: disc; }
    .lg-draft li { margin-top: 4px; }
    .lg-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 56px; align-items: start; }
    .lg-toc { position: sticky; top: 86px; }
    .lg-toc summary { list-style: none; font-size: .78rem; font-weight: 800; letter-spacing: .02em; color: var(--lg-muted); margin-bottom: 10px; }
    .lg-toc summary::-webkit-details-marker { display: none; }
    .lg-toc ol { list-style: none; margin: 0; padding: 0 0 0 2px; border-left: 1px solid var(--cc-line); }
    .lg-toc a { display: block; padding: 6px 12px; margin-left: -1px; border-left: 2px solid transparent; color: var(--lg-muted);
      font-size: .86rem; line-height: 1.35; text-decoration: none; transition: color .15s, border-color .15s; }
    .lg-toc a:hover { color: var(--cc-ink); }
    .lg-toc a.on { color: var(--primary); border-left-color: var(--primary); font-weight: 650; }
    .lg-doc { max-width: 68ch; font-size: 1rem; line-height: 1.72; }
    .lg-sec { scroll-margin-top: 84px; padding-bottom: 8px; }
    .lg-sec + .lg-sec { margin-top: 30px; }
    .lg-sec h2 { margin: 0 0 10px; font-size: 1.28rem; line-height: 1.25; letter-spacing: -.03em; font-weight: 750; }
    .lg-num { color: var(--primary); font-variant-numeric: tabular-nums; }
    .lg-sec p { margin: 0 0 12px; text-wrap: wrap; }
    .lg-sec ul { margin: 0 0 12px; padding-left: 22px; list-style: disc; }
    .lg-sec li { margin-bottom: 6px; }
    .lg-sec li::marker { color: var(--primary); }
    .lg-contact { display: grid; gap: 4px; margin: 4px 0 14px; padding: 14px 16px; border-radius: 12px; background: var(--lg-soft);
      border: 1px solid var(--cc-line); font-style: normal; font-size: .93rem; }
    .lg-contact a { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; color: var(--primary); font-weight: 650; text-decoration: none; word-break: break-all; }
    .lg-contact a:hover { text-decoration: underline; }
    .lg-contact span { color: var(--lg-muted); }
    :host-context([data-theme="dark"]) .lg-sec p, :host-context([data-theme="dark"]) .lg-intro { color: #E4ECE7 !important; }
    :host-context([data-theme="dark"]) .lg-date, :host-context([data-theme="dark"]) .lg-draft p, :host-context([data-theme="dark"]) .lg-contact span { color: var(--lg-muted) !important; }
    :host-context([data-theme="dark"]) .lg-num, :host-context([data-theme="dark"]) .lg-toc a.on,
    :host-context([data-theme="dark"]) .lg-contact a { color: #5FBF8F; border-left-color: #5FBF8F; }
    :host-context([data-theme="dark"]) .lg-switch a.on { background: #2B4A3E; box-shadow: none; }
    @media (max-width: 900px) {
      .lg-layout { grid-template-columns: 1fr; gap: 8px; }
      .lg-toc { position: static; margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--cc-line); border-radius: 12px; background: var(--cc-white); }
      .lg-toc summary { margin: 0; min-height: 28px; display: flex; align-items: center; cursor: pointer; font-size: .9rem; color: var(--cc-ink); }
      .lg-toc details[open] summary { margin-bottom: 10px; }
      .lg-brand span:last-child { display: none; }
    }
    @media (min-width: 901px) { .lg-toc summary { pointer-events: none; } }
    @media (prefers-reduced-motion: reduce) { .lg-main { animation: none; } }
  `],
})
export class LegalPageComponent implements AfterViewInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly pub = PUBLISHER;
  readonly doc: LegalDoc = inject(ActivatedRoute).snapshot.data['doc'] === 'privacy' ? PRIVACY : CGU;
  readonly active = signal(this.doc.sections[0].id);
  /** Sommaire ouvert sur grand écran, replié sur mobile. */
  readonly tocOpen = signal(typeof window === 'undefined' || window.matchMedia('(min-width: 901px)').matches);
  private observer?: IntersectionObserver;

  isText(b: LegalBlock): b is string { return typeof b === 'string'; }
  isList(b: LegalBlock): b is { list: string[] } { return typeof b === 'object' && 'list' in b; }

  onTocToggle(e: Event): void { this.tocOpen.set((e.target as HTMLDetailsElement).open); }

  goTo(e: Event, id: string): void {
    e.preventDefault();
    const el = this.host.nativeElement.querySelector('#' + id) as HTMLElement | null;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    this.active.set(id);
    if (!window.matchMedia('(min-width: 901px)').matches) this.tocOpen.set(false);
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) this.active.set((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-90px 0px -60% 0px' },
    );
    this.host.nativeElement.querySelectorAll('.lg-sec').forEach((s: Element) => this.observer!.observe(s));
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
