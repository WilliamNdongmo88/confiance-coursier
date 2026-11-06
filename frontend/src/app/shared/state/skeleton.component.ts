import { Component, Input } from '@angular/core';

/** Squelette de chargement (TICK-077) : lignes animées à la place d'un écran vide. */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  styles: [`
    :host { display: block; }
    .line {
      height: 56px; border-radius: 10px; margin-bottom: 10px;
      background: linear-gradient(90deg, var(--cc-paper-2) 25%, var(--cc-line) 50%, var(--cc-paper-2) 75%);
      background-size: 200% 100%;
      animation: cc-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes cc-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .line { animation: none; } }
  `],
  template: `
    <div aria-busy="true" aria-label="Chargement">
      @for (i of rows; track i) { <div class="line"></div> }
    </div>
  `,
})
export class SkeletonComponent {
  rows = [0, 1, 2];

  @Input() set lines(n: number) {
    this.rows = Array.from({ length: Math.max(1, n) }, (_, i) => i);
  }
}
