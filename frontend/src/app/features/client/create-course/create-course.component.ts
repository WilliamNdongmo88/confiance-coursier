import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent],
  template: `
    <div class="min-h-screen bg-[#f7f8f5] p-6">
      <div class="max-w-2xl mx-auto">
        <a routerLink="/client/dashboard" class="text-sm text-[#123b32] font-bold">← Retour</a>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-4">
          <h1 class="text-2xl font-bold text-[#15241f] mb-6">
            {{ isEditMode ? 'Modifier la course' : 'Créer une nouvelle course' }}
          </h1>

          <form (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Description de la course *</label>
              <textarea [(ngModel)]="description" name="description" required rows="4" class="form-input"
                placeholder="Ex: Acheter 2 kg de riz au marché Mokolo..."></textarea>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Zone / Quartier *</label>
              <input type="text" [(ngModel)]="zone" name="zone" required class="form-input"
                placeholder="Ex: Yaoundé - Mokolo">
            </div>

            <div class="mb-6">
              <label class="block text-sm font-semibold text-gray-700 mb-1">Date et heure souhaitées *</label>
              <input type="datetime-local" [(ngModel)]="scheduledAt" name="scheduledAt" required class="form-input">
            </div>

            <div class="flex gap-3">
              <a routerLink="/client/dashboard" class="btn-secondary">Annuler</a>
              <button type="submit" [disabled]="isLoading" class="btn-primary flex items-center justify-center gap-2">
                @if (isLoading) {
                  <app-spinner></app-spinner>
                  {{ isEditMode ? 'Enregistrement...' : 'Publication...' }}
                } @else {
                  {{ isEditMode ? 'Enregistrer les modifications' : 'Publier la course' }}
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CreateCourseComponent implements OnInit {
  description = '';
  zone = '';
  scheduledAt = '';
  isLoading = false;
  isEditMode = false;
  courseId: number | null = null;

  constructor(
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.courseId = Number(id);
      this.loadCourseData(this.courseId);
    }
  }

  loadCourseData(id: number) {
    this.isLoading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.description = course.description;
        this.zone = course.zone;
        // On formate la date pour l'input datetime-local (ex: 2026-10-31T10:00)
        if (course.scheduledAt) {
          this.scheduledAt = course.scheduledAt.substring(0, 16);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Impossible de charger la course.');
        this.router.navigate(['/client/dashboard']);
      }
    });
  }

  onSubmit() {
    this.isLoading = true;

    const data = {
      description: this.description,
      zone: this.zone,
      scheduledAt: this.scheduledAt
    };

    const request = this.isEditMode && this.courseId
      ? this.courseService.updateCourse(this.courseId, data)
      : this.courseService.createCourse(data);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success(this.isEditMode ? 'Course mise à jour !' : 'Course publiée avec succès !');
        this.router.navigate(['/client/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Une erreur est survenue.');
      }
    });
  }
}
