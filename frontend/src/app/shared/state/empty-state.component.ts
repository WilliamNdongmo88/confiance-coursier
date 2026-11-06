import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** État vide avec action (TICK-077), ex. « Aucune course — Créer ma première course ». */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host { display: block; }
    .box { text-align: center; padding: 32px 16px; color: var(--text-muted); }
    .title { font-weight: 700; color: var(--cc-ink); margin-bottom: 6px; }
    .msg { font-size: .9rem; margin-bottom: 16px; }
  `],
  template: `
    <div class="box" role="status">
      <p class="title">{{ title }}</p>
      @if (message) { <p class="msg">{{ message }}</p> }
      @if (actionLabel && actionLink) {
        <a [routerLink]="actionLink" class="btn btn-primary">{{ actionLabel }}</a>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() actionLink: string | (string | number)[] | null = null;
}
