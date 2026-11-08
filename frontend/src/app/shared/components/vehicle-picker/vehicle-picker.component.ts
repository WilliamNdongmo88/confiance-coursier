import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VEHICLES } from '../../data/courier-profile';

/**
 * TICK-089 — choix du moyen de déplacement du coursier, en boutons (le menu déroulant natif s'affiche avec le
 * style du système et ne s'harmonise pas avec l'interface). Accessible : groupe de boutons radio au clavier.
 */
@Component({
  selector: 'app-vehicle-picker',
  standalone: true,
  styles: [`
    :host { display: block; }
    .vp { display: flex; flex-wrap: wrap; gap: 8px; }
    .vp button { min-height: 42px; padding: 0 16px; border-radius: 99px; border: 1.5px solid var(--cc-line); background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer;
      transition: background .15s, border-color .15s, color .15s, transform .15s; }
    .vp button:hover { border-color: var(--primary); }
    .vp button:active { transform: scale(.97); }
    .vp button.on { border-color: transparent; background: var(--cc-forest); color: #fff; }
    .vp button.none { color: var(--cc-muted); font-weight: 600; }
    .vp button.none.on { background: var(--cc-paper-2); color: var(--cc-ink); border-color: var(--cc-line); }
    .vp button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    :host-context([data-theme="dark"]) .vp button { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .vp button.on { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .vp button.none { color: #B0C0B7; }
    :host-context([data-theme="dark"]) .vp button.none.on { background: rgba(255,255,255,.08); color: #F3F7F5; }
    @media (prefers-reduced-motion: reduce) { .vp button { transition: none; } .vp button:active { transform: none; } }
  `],
  template: `
    <div class="vp" role="radiogroup" [attr.aria-labelledby]="labelledBy" (keydown)="onKey($event)">
      @for (o of options; track o.value; let i = $index) {
        <button type="button" role="radio" [class.on]="value === o.value" [class.none]="o.value === ''"
                [attr.aria-checked]="value === o.value" [attr.tabindex]="tabIndexOf(o.value, i)"
                (click)="select(o.value)">{{ o.label }}</button>
      }
    </div>
  `,
})
export class VehiclePickerComponent {
  @Input() value = '';
  /** Propose « Non précisé » (profil) ; à l'inscription, le choix est obligatoire. */
  @Input() allowNone = false;
  @Input() labelledBy: string | null = null;
  @Output() valueChange = new EventEmitter<string>();

  get options(): { value: string; label: string }[] {
    return this.allowNone ? [...VEHICLES, { value: '', label: 'Non précisé' }] : VEHICLES;
  }

  select(v: string): void {
    this.value = v;
    this.valueChange.emit(v);
  }

  /** Un seul arrêt de tabulation : le choix courant, sinon le premier. */
  tabIndexOf(v: string, i: number): number {
    const current = this.options.findIndex((o) => o.value === this.value);
    return (current === -1 ? i === 0 : this.options[current].value === v) ? 0 : -1;
  }

  /** Flèches : passe au choix précédent ou suivant (comportement d'un groupe radio). */
  onKey(e: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const opts = this.options;
    const cur = Math.max(0, opts.findIndex((o) => o.value === this.value));
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = (cur + step + opts.length) % opts.length;
    this.select(opts[next].value);
    const buttons = (e.currentTarget as HTMLElement).querySelectorAll('button');
    (buttons[next] as HTMLButtonElement | undefined)?.focus();
  }
}
