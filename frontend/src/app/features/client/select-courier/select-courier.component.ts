import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

/**
 * Composant placeholder — sera refondu dans TICK-015.
 * Affiche un écran "en cours d'implémentation" après la création d'une course.
 */
@Component({
  selector: 'app-select-courier',
  standalone: true,
  imports: [RouterLink, AppShellComponent],
  template: `
    <app-shell pageTitle="Choisir un coursier">
      <section class="page-head">
        <div>
          <h1>Choisir un coursier</h1>
          <p>Cette fonctionnalité sera disponible prochainement.</p>
        </div>
        <a routerLink="/client/dashboard" class="btn btn-secondary btn-sm">
          Retour au tableau de bord
        </a>
      </section>

      <div style="
        background: var(--bg-card, #fff);
        border: 1px solid var(--border, #e1e8e0);
        border-radius: var(--radius-lg, 12px);
        padding: 48px 32px;
        text-align: center;
        max-width: 480px;
      ">
        <p style="color: var(--text-muted, #6b7280); margin-bottom: 16px;">
          Course #{{ courseId }} créée avec succès.<br>
          La sélection du coursier sera implémentée dans la prochaine étape (TICK-015).
        </p>
        <a routerLink="/client/dashboard" class="btn btn-primary">
          Retour au tableau de bord
        </a>
      </div>
    </app-shell>
  `
})
export class SelectCourierComponent implements OnInit {
  courseId: number | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('courseId');
    this.courseId = id ? Number(id) : null;
  }
}
