import { Component, Input } from '@angular/core';

/** Indicateur de chargement (TICK-076 : styles propres, plus de classes utilitaires Tailwind). */
@Component({
  selector: 'app-spinner',
  standalone: true,
  styles: [`
    :host { display: inline-flex; }
    svg { animation: cc-spin 1s linear infinite; }
    .sm { width: 16px; height: 16px; }
    .md { width: 20px; height: 20px; }
    .track { opacity: .25; }
    .arc { opacity: .75; }
    @keyframes cc-spin { to { transform: rotate(360deg); } }
  `],
  template: `
    <svg [class]="size" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle class="track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="arc" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `
})
export class SpinnerComponent {
  @Input() size: 'sm' | 'md' = 'sm';
}
