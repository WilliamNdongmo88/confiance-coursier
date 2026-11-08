import { Component, Input } from '@angular/core';
import { courseStatus, statusBadgeClass } from './course-status';

/** Badge de statut d'une course — libellé et couleur issus de courseStatus() (TICK-077). */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span [class]="cls">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status = '';
  @Input() role: string = 'CLIENT';
  /** Coursier non retenu sur cette course (affiche « Offre déclinée »). */
  @Input() notRetained: boolean | null | undefined = false;

  get label(): string {
    return courseStatus({ id: 0, status: this.status, notRetained: this.notRetained }, this.role).label;
  }

  get cls(): string {
    return statusBadgeClass(courseStatus({ id: 0, status: this.status, notRetained: this.notRetained }, this.role).tone);
  }
}
