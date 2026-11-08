import { Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { LucideCheck, LucideChevronDown } from '@lucide/angular';

/**
 * Champ de choix dessiné par l'application, à la place du <select> et de la <datalist> natifs :
 * leurs listes s'affichent avec le style du système (bloc noir ou liste géante sur mobile).
 * - `freeText` : la saisie libre reste possible, la liste filtre les propositions (ex. une ville) ;
 * - sinon : choix uniquement dans la liste (ex. un pays).
 * Accessible : motif « combobox » ARIA, flèches haut/bas, Entrée, Échap.
 */
let nextId = 0;

@Component({
  selector: 'app-combo-field',
  standalone: true,
  imports: [LucideCheck, LucideChevronDown],
  styles: [`
    :host { display: block; position: relative; }
    .cb-input { width: 100%; padding-right: 42px; cursor: text; }
    .cb-input[readonly] { cursor: pointer; }
    .cb-chev { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--cc-muted);
      pointer-events: none; transition: transform .18s ease; display: inline-flex; }
    .open .cb-chev { transform: translateY(-50%) rotate(180deg); }
    .cb-list { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 40; margin: 0; padding: 6px;
      list-style: none; max-height: 248px; overflow-y: auto; overscroll-behavior: contain;
      background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 12px;
      box-shadow: 0 14px 36px rgb(23 49 34 / .14); animation: cb-in .16s ease-out; }
    .cb-opt { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px;
      padding: 0 12px; border-radius: 8px; color: var(--cc-ink); font-size: 14.5px; font-weight: 550; cursor: pointer; }
    .cb-opt.active { background: var(--cc-paper-2); }
    .cb-opt.sel { color: var(--cc-forest); font-weight: 700; }
    .cb-opt.empty { color: var(--cc-muted); font-weight: 500; }
    .cb-empty { padding: 10px 12px; color: var(--cc-muted); font-size: 13.5px; }
    .cb-check { color: var(--cc-forest); display: inline-flex; }
    @keyframes cb-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    :host-context([data-theme="dark"]) .cb-list { background: #22312A; border-color: var(--cc-line-2);
      box-shadow: 0 18px 40px rgb(0 0 0 / .45); }
    :host-context([data-theme="dark"]) .cb-opt { color: #F3F7F5; }
    :host-context([data-theme="dark"]) .cb-opt.active { background: rgba(255,255,255,.07); }
    :host-context([data-theme="dark"]) .cb-opt.sel,
    :host-context([data-theme="dark"]) .cb-check { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .cb-opt.empty,
    :host-context([data-theme="dark"]) .cb-empty { color: #B0C0B7; }
    @media (prefers-reduced-motion: reduce) { .cb-list { animation: none; } .cb-chev { transition: none; } }
  `],
  template: `
    <div [class.open]="open()">
      <input [id]="inputId" class="form-input cb-input" type="text" role="combobox" aria-autocomplete="list"
             [attr.aria-expanded]="open()" [attr.aria-controls]="listId"
             [attr.aria-activedescendant]="open() && active() >= 0 ? listId + '-' + active() : null"
             [attr.aria-describedby]="describedBy" [attr.autocomplete]="freeText ? autocomplete : 'off'"
             [readonly]="!freeText" [value]="displayValue()" [placeholder]="placeholder" [attr.name]="name"
             [attr.data-autofocus]="autofocus ? '' : null"
             (input)="onInput($event)" (click)="toggle()" (keydown)="onKey($event)" (blur)="onBlur()">
      <span class="cb-chev" aria-hidden="true"><svg lucideChevronDown [size]="18"></svg></span>
      @if (open()) {
        <ul class="cb-list" role="listbox" [id]="listId" [attr.aria-label]="ariaLabel">
          @for (o of shown(); track o.value; let i = $index) {
            <li class="cb-opt" role="option" [id]="listId + '-' + i" [class.active]="i === active()"
                [class.sel]="o.value === value()" [class.empty]="o.value === ''" [attr.aria-selected]="o.value === value()"
                (mousedown)="$event.preventDefault()" (click)="pick(o.value)" (mouseenter)="active.set(i)">
              <span>{{ o.label }}</span>
              @if (o.value === value() && o.value !== '') { <span class="cb-check" aria-hidden="true"><svg lucideCheck [size]="16"></svg></span> }
            </li>
          } @empty {
            <li class="cb-empty" role="presentation">Aucune proposition : votre saisie sera gardée telle quelle.</li>
          }
        </ul>
      }
    </div>
  `,
})
export class ComboFieldComponent {
  private host = inject(ElementRef<HTMLElement>);
  private readonly uid = ++nextId;

  @Input() inputId = `cb-${this.uid}`;
  @Input() name: string | null = null;
  @Input() placeholder = '';
  @Input() describedBy: string | null = null;
  @Input() ariaLabel: string | null = null;
  @Input() autocomplete = 'off';
  /** Reçoit la mise au point à l'affichage de l'étape (attribut data-autofocus des formulaires). */
  @Input() autofocus = false;
  /** Saisie libre autorisée (la liste ne fait que proposer). */
  @Input() freeText = false;
  /** Libellé d'une option vide en tête (choix uniquement), ex. « — Sélectionner — ». */
  @Input() emptyLabel: string | null = null;
  @Input() set options(v: readonly string[]) { this.opts.set([...v]); }
  /** La valeur renvoyée par le parent pendant la saisie ne doit pas effacer le filtre en cours. */
  @Input('value') set valueIn(v: string | null | undefined) {
    const next = v ?? '';
    if (next === this.value()) return;
    this.value.set(next);
    this.query.set(null);
  }
  @Output() valueChange = new EventEmitter<string>();

  readonly listId = `cb-list-${this.uid}`;
  readonly value = signal('');
  readonly open = signal(false);
  readonly active = signal(-1);
  private readonly opts = signal<string[]>([]);
  /** Texte tapé depuis l'ouverture (null : on n'a pas encore tapé, on montre tout). */
  private readonly query = signal<string | null>(null);

  readonly displayValue = computed(() => this.value());

  readonly shown = computed(() => {
    const base = this.opts().map((o) => ({ value: o, label: o }));
    const q = this.query();
    if (!this.freeText || q === null || !q.trim()) {
      return this.emptyLabel !== null && !this.freeText ? [{ value: '', label: this.emptyLabel }, ...base] : base;
    }
    const n = norm(q);
    const starts = base.filter((o) => norm(o.label).startsWith(n));
    const contains = base.filter((o) => !norm(o.label).startsWith(n) && norm(o.label).includes(n));
    return [...starts, ...contains];
  });

  toggle(): void {
    if (this.open()) { if (!this.freeText) this.close(); return; }
    this.openList();
  }

  private openList(): void {
    this.open.set(true);
    const i = this.shown().findIndex((o) => o.value === this.value());
    this.active.set(i);
    queueMicrotask(() => this.scrollActive());
  }

  close(): void { this.open.set(false); this.active.set(-1); this.query.set(null); }

  onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.value.set(v);
    this.query.set(v);
    this.valueChange.emit(v);
    this.open.set(true);
    this.active.set(this.shown().length ? 0 : -1);
  }

  pick(v: string): void {
    this.value.set(v);
    this.valueChange.emit(v);
    this.close();
  }

  onBlur(): void { this.close(); }

  onKey(e: KeyboardEvent): void {
    const list = this.shown();
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!this.open()) { this.openList(); return; }
        if (!list.length) return;
        const step = e.key === 'ArrowDown' ? 1 : -1;
        this.active.set((this.active() + step + list.length) % list.length);
        this.scrollActive();
        return;
      }
      case 'Enter':
        if (this.open() && this.active() >= 0 && list[this.active()]) { e.preventDefault(); this.pick(list[this.active()].value); }
        else if (!this.open() && !this.freeText) { e.preventDefault(); this.openList(); }
        return;
      case ' ':
        if (!this.freeText) { e.preventDefault(); this.open() && this.active() >= 0 ? this.pick(list[this.active()].value) : this.openList(); }
        return;
      case 'Escape':
        if (this.open()) { e.preventDefault(); this.close(); }
        return;
      case 'Tab':
        this.close();
        return;
    }
  }

  private scrollActive(): void {
    const el = (this.host.nativeElement as HTMLElement).querySelector(`#${this.listId}-${this.active()}`);
    (el as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocPointer(e: PointerEvent): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(e.target as Node)) this.close();
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
