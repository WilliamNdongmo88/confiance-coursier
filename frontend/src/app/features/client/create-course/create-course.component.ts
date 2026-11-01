import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import {
  LucideShoppingBag,
  LucideTruck,
  LucidePackage,
  LucideMoreHorizontal,
  LucideArrowRight,
  LucideArrowLeft,
} from '@lucide/angular';

interface CourseType {
  value: string;
  label: string;
  icon: any;
}

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    NgClass,
    NgIf,
    AppShellComponent,
    LucideShoppingBag,
    LucideTruck,
    LucidePackage,
    LucideMoreHorizontal,
    LucideArrowRight,
    LucideArrowLeft,
  ],
  styles: [`
    .steps-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 28px;
    }
    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--cc-line-2, #c8d5c4);
      transition: all .2s;
    }
    .step-dot.active {
      background: var(--primary, #17634f);
      width: 22px;
      border-radius: 5px;
    }
    .step-dot.done {
      background: var(--cc-success, #22c55e);
    }

    .form-card {
      background: var(--bg-card, #fff);
      border: 1px solid var(--border, #e1e8e0);
      border-radius: var(--radius-lg, 12px);
      padding: 32px;
    }
    @media (max-width: 640px) {
      .form-card { padding: 20px 12px; }
    }

    .type-selector {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 10px;
      margin-bottom: 24px;
    }
    .type-card {
      border: 2px solid var(--border, #e1e8e0);
      border-radius: var(--radius-md, 8px);
      padding: 14px 10px;
      text-align: center;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      background: var(--bg, #f7f8f5);
      user-select: none;
    }
    .type-card:hover { border-color: var(--cc-line-2, #c8d5c4); }
    .type-card.selected {
      border-color: var(--primary, #17634f);
      background: var(--primary-light, #e8f5e9);
    }
    .type-card-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 7px;
      color: var(--primary, #17634f);
    }
    .type-card-label {
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--text, #15241f);
    }

    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 480px) {
      .two-col-grid { grid-template-columns: 1fr; }
    }

    .proofs-box {
      padding: 14px;
      background: var(--bg, #f7f8f5);
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border, #e1e8e0);
    }

    .action-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 28px;
      padding-top: 22px;
      border-top: 1px solid var(--border, #e1e8e0);
    }
    .action-bar .btn { width: 100%; justify-content: center; }
  `],
  template: `
    <app-shell [pageTitle]="isEditMode ? 'Modifier la course' : 'Nouvelle course'" [narrow]="true">

      <!-- En-tête de page -->
      <section class="page-head">
        <div>
          <h1>{{ isEditMode ? 'Modifier la course' : 'Créer une course' }}</h1>
          <p>Décrivez votre besoin pour que le coursier comprenne bien.</p>
        </div>
        <a routerLink="/client/dashboard" class="btn btn-secondary btn-sm">
          <svg lucideArrowLeft size="15"></svg> Retour
        </a>
      </section>

      <!-- Formulaire -->
      <div class="form-card">

        <!-- Indicateur d'étapes -->
        <div class="steps-indicator">
          <div class="step-dot active"></div>
          <div class="step-dot"></div>
          <div class="step-dot"></div>
        </div>

        <form (ngSubmit)="onSubmit()">

          <!-- Type de course -->
          <div class="form-group mb-lg">
            <label class="form-label">Type de course</label>
            <div class="type-selector">
              @for (type of courseTypes; track type.value) {
                <div
                  class="type-card"
                  [ngClass]="{ selected: selectedType === type.value }"
                  (click)="selectType(type.value)"
                >
                  <div class="type-card-icon">
                    <svg *ngIf="type.value === 'ACHAT'"     lucideShoppingBag size="22"></svg>
                    <svg *ngIf="type.value === 'LIVRAISON'" lucideTruck size="22"></svg>
                    <svg *ngIf="type.value === 'RETRAIT'"   lucidePackage size="22"></svg>
                    <svg *ngIf="type.value === 'AUTRE'"     lucideMoreHorizontal size="22"></svg>
                  </div>
                  <div class="type-card-label">{{ type.label }}</div>
                </div>
              }
            </div>
          </div>

          <!-- Description -->
          <div class="form-group mb-md">
            <label class="form-label" for="description">Description détaillée *</label>
            <textarea
              id="description"
              class="form-textarea"
              rows="4"
              name="description"
              [(ngModel)]="description"
              required
              placeholder="Ex: Acheter 2 kg de riz, 1L d'huile, et 500g d'épices au marché Mokolo. Puis les déposer chez ma mère à Bastos."
            ></textarea>
            <p class="form-hint">Soyez le plus précis possible pour éviter les allers-retours dans le chat.</p>
          </div>

          <!-- Ville + Quartier -->
          <div class="two-col-grid mb-md">
            <div class="form-group">
              <label class="form-label" for="city">Ville / Zone *</label>
              <select id="city" class="form-select" name="city" [(ngModel)]="city" required>
                <option value="">Sélectionnez une ville...</option>
                <option value="Yaoundé">Yaoundé</option>
                <option value="Douala">Douala</option>
                <option value="Bafoussam">Bafoussam</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="neighborhood">Quartier précis *</label>
              <input
                id="neighborhood"
                type="text"
                class="form-input"
                name="neighborhood"
                [(ngModel)]="neighborhood"
                placeholder="Ex: Mokolo, Bastos..."
                required
              />
            </div>
          </div>

          <!-- Date + Heure -->
          <div class="two-col-grid mb-lg">
            <div class="form-group">
              <label class="form-label" for="dateVal">Date souhaitée *</label>
              <input
                id="dateVal"
                type="date"
                class="form-input"
                name="dateVal"
                [(ngModel)]="dateVal"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="timeVal">Heure souhaitée *</label>
              <input
                id="timeVal"
                type="time"
                class="form-input"
                name="timeVal"
                [(ngModel)]="timeVal"
                required
              />
            </div>
          </div>

          <!-- Preuves obligatoires -->
          <div class="form-group mb-lg">
            <label class="form-label">Preuves attendues (obligatoire)</label>
            <div class="proofs-box">
              <label class="form-checkbox mb-sm">
                <input type="checkbox" checked disabled />
                <span>Vidéo de la course (≤ 10s, géolocalisée)</span>
              </label>
              <label class="form-checkbox mb-sm">
                <input type="checkbox" [(ngModel)]="proofPhotos" name="proofPhotos" />
                <span>Photos (minimum 1)</span>
              </label>
              <label class="form-checkbox">
                <input type="checkbox" [(ngModel)]="proofReceipts" name="proofReceipts" />
                <span>Reçus d'achat (si applicable)</span>
              </label>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="action-bar">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="isLoading || !isFormValid()"
            >
              @if (isLoading) {
                <span>{{ isEditMode ? 'Enregistrement...' : 'Publication...' }}</span>
              } @else {
                <span>{{ isEditMode ? 'Enregistrer les modifications' : 'Suivant\u00a0: Choisir un coursier' }}</span>
                <svg lucideArrowRight size="16" style="margin-left: 4px;"></svg>
              }
            </button>
            <a routerLink="/client/dashboard" class="btn btn-ghost">Annuler</a>
          </div>

        </form>
      </div>

    </app-shell>
  `
})
export class CreateCourseComponent implements OnInit {

  // Types de course disponibles
  courseTypes = [
    { value: 'ACHAT',     label: 'Achat' },
    { value: 'LIVRAISON', label: 'Livraison' },
    { value: 'RETRAIT',   label: 'Retrait' },
    { value: 'AUTRE',     label: 'Autre' },
  ];

  // Champs du formulaire
  selectedType  = 'ACHAT';
  description   = '';
  city          = '';
  neighborhood  = '';
  dateVal       = '';
  timeVal       = '';
  proofPhotos   = true;
  proofReceipts = true;

  // État
  isLoading  = false;
  isEditMode = false;
  courseId: number | null = null;

  constructor(
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.courseId = Number(id);
      this.loadCourseData(this.courseId);
    }
  }

  selectType(value: string): void {
    this.selectedType = value;
  }

  isFormValid(): boolean {
    return (
      !!this.description.trim() &&
      !!this.city &&
      !!this.neighborhood.trim() &&
      !!this.dateVal &&
      !!this.timeVal
    );
  }

  /** Combine les champs séparés en une chaîne zone et un LocalDateTime ISO */
  private buildZone(): string {
    return `${this.city} - ${this.neighborhood.trim()}`;
  }

  private buildScheduledAt(): string {
    // Produit "YYYY-MM-DDTHH:mm:ss" attendu par le backend (LocalDateTime)
    return `${this.dateVal}T${this.timeVal}:00`;
  }

  loadCourseData(id: number): void {
    this.isLoading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course: any) => {
        this.isLoading = false;
        this.description = course.description ?? '';

        // Reparse zone → city + neighborhood (format "Yaoundé - Mokolo")
        if (course.zone) {
          const parts = (course.zone as string).split(' - ');
          this.city         = parts[0]?.trim() ?? '';
          this.neighborhood = parts.slice(1).join(' - ').trim();
        }

        // Reparse scheduledAt → date + time séparés
        if (course.scheduledAt) {
          const dt = (course.scheduledAt as string).substring(0, 16); // "YYYY-MM-DDTHH:mm"
          const [d, t] = dt.split('T');
          this.dateVal = d ?? '';
          this.timeVal = t ?? '';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Impossible de charger la course.');
        this.router.navigate(['/client/dashboard']);
      }
    });
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;
    this.isLoading = true;

    const data = {
      description:  this.description.trim(),
      zone:         this.buildZone(),
      scheduledAt:  this.buildScheduledAt(),
    };

    const request$ = this.isEditMode && this.courseId
      ? this.courseService.updateCourse(this.courseId, data)
      : this.courseService.createCourse(data);

    request$.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (this.isEditMode) {
          this.toast.success('Course mise à jour !');
          this.router.navigate(['/client/dashboard']);
        } else {
          // Après création → aller sélectionner un coursier
          const newId: number = response?.id ?? response?.courseId;
          this.toast.success('Course publiée — Choisissez maintenant votre coursier !');
          if (newId) {
            this.router.navigate(['/client/select-courier', newId]);
          } else {
            this.router.navigate(['/client/dashboard']);
          }
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Une erreur est survenue.');
      }
    });
  }
}
