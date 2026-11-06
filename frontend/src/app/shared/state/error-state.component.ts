import { Component, EventEmitter, Input, Output } from '@angular/core';

/** État d'erreur avec « Réessayer » (TICK-077) — remplace les erreurs ignorées en silence. */
@Component({
  selector: 'app-error-state',
  standalone: true,
  styles: [`
    :host { display: block; }
    .box { text-align: center; padding: 28px 16px; border: 1px dashed var(--cc-line); border-radius: 12px; }
    .msg { color: var(--cc-danger); font-weight: 600; margin-bottom: 14px; }
  `],
  template: `
    <div class="box" role="alert">
      <p class="msg">{{ message }}</p>
      <button type="button" class="btn btn-secondary" (click)="retry.emit()">Réessayer</button>
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() message = 'Impossible de charger les données. Vérifiez votre connexion.';
  @Output() retry = new EventEmitter<void>();
}
