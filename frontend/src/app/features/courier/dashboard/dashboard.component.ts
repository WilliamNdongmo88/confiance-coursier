import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideBike, LucideLogOut, LucideMapPin, LucideCalendar, LucideSend, LucideMessageSquare, LucideCheck } from '@lucide/angular';

@Component({
  selector: 'app-courier-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, CommonModule, FormsModule, SpinnerComponent, LucideBike, LucideLogOut, LucideMapPin, LucideCalendar, LucideSend, LucideMessageSquare, LucideCheck],
  template: `
    <div class="min-h-screen bg-[#f7f8f5]">
      <!-- Navbar -->
      <nav class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 bg-[#123b32] text-white rounded-lg flex items-center justify-center">
            <svg lucideBike size="18"></svg>
          </div>
          <span class="font-bold text-[#123b32]">ConfianceCoursier</span>
        </div>
        <button (click)="logout()" class="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
          <svg lucideLogOut size="16"></svg> Déconnexion
        </button>
      </nav>

      <!-- Contenu -->
      <div class="max-w-5xl mx-auto p-6">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-[#15241f]">Annonces disponibles</h1>
          <p class="text-gray-500">Trouvez des courses et proposez vos tarifs.</p>
        </div>

        <!-- Liste des courses publiées -->
        <div class="space-y-4">
          @if (courses.length === 0) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <p>Aucune course disponible pour le moment.</p>
            </div>
          } @else {
            @for (course of courses; track course.id) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h2 class="text-lg font-bold text-[#15241f]">{{ course.description }}</h2>
                    <div class="flex gap-4 mt-2 text-sm text-gray-500">
                      <span class="flex items-center gap-1">
                        <svg lucideMapPin size="14"></svg> {{ course.zone }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg lucideCalendar size="14"></svg> {{ course.scheduledAt | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>
                  </div>
                  <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {{ course.status }}
                  </span>
                </div>

                <!-- Formulaire d'offre -->
                <div class="border-t border-gray-100 pt-4">
                  @if (course.status === 'PUBLISHED') {
                    @if (selectedCourseId === course.id) {
                      <div class="space-y-3">
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-1">Votre tarif (XAF) *</label>
                          <input type="number" [(ngModel)]="offerAmount" class="form-input" placeholder="Ex: 5000">
                        </div>
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-1">Détails (optionnel)</label>
                          <textarea [(ngModel)]="offerDetails" class="form-input" rows="2" placeholder="Ex: Je peux faire la course demain matin."></textarea>
                        </div>
                        <div class="flex gap-3">
                          <button (click)="submitOffer(course.id)" [disabled]="isSubmitting" class="btn-primary flex items-center justify-center gap-2">
                            @if (isSubmitting) {
                              <app-spinner></app-spinner> Envoi...
                            } @else {
                              <svg lucideSend size="16"></svg> Envoyer l'offre
                            }
                          </button>
                          <button (click)="cancelOffer()" class="btn-secondary">Annuler</button>
                        </div>
                      </div>
                    } @else {
                      <button (click)="selectCourse(course.id)" class="btn-primary w-auto px-6">
                        Proposer une offre
                      </button>
                    }
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Section : Mes missions en cours (assignées à ce coursier) -->
        <div class="mt-10">
          <h2 class="text-xl font-bold text-[#15241f] mb-4">Mes missions en cours</h2>

          @if (myCourses.length === 0) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <p>Aucune mission acceptée pour le moment.</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (course of myCourses; track course.id) {
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center">
                  <div class="flex-1">
                    <div class="font-semibold text-[#15241f]">{{ course.description }}</div>
                    <div class="text-sm text-gray-500 mt-1 flex gap-4">
                      <span class="flex items-center gap-1">
                        <svg lucideMapPin size="14"></svg> {{ course.zone }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg lucideCalendar size="14"></svg> {{ course.scheduledAt | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                      <svg lucideCheck size="12"></svg> {{ course.status }}
                    </span>
                    <a [routerLink]="['/chat', course.id]"
                      class="px-4 py-2 bg-[#123b32] text-white rounded-lg font-bold hover:bg-[#1b5144] transition-all flex items-center gap-2 text-sm">
                      <svg lucideMessageSquare size="16"></svg> Ouvrir le chat
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CourierDashboardComponent implements OnInit {
  courses: any[] = [];       // Annonces PUBLISHED
  myCourses: any[] = [];     // Missions ASSIGNED au coursier connecté
  selectedCourseId: number | null = null;
  offerAmount: number | null = null;
  offerDetails = '';
  isSubmitting = false;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadPublishedCourses();
    this.loadMyMissions();
  }

  loadPublishedCourses() {
    this.courseService.getPublishedCourses().subscribe({
      next: (data) => this.courses = data,
      error: (err) => console.error(err)
    });
  }

  loadMyMissions() {
    // On récupère toutes les courses du coursier connecté (statut ASSIGNED)
    // On suppose que le backend renvoie toutes les courses du coursier via /my-missions
    // (ou on filtre côté client en attendant un endpoint dédié)
    this.courseService.getMyMissions().subscribe({
      next: (data) => this.myCourses = data,
      error: (err) => console.error(err)
    });
  }

  selectCourse(courseId: number) {
    this.selectedCourseId = courseId;
    this.offerAmount = null;
    this.offerDetails = '';
  }

  cancelOffer() {
    this.selectedCourseId = null;
    this.offerAmount = null;
    this.offerDetails = '';
  }

  submitOffer(courseId: number) {
    if (!this.offerAmount || this.offerAmount <= 0) {
      this.toast.error('Veuillez saisir un tarif valide.');
      return;
    }

    this.isSubmitting = true;
    this.courseService.createOffer(courseId, this.offerAmount, this.offerDetails).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Offre envoyée avec succès !');
        this.selectedCourseId = null;
        this.loadPublishedCourses();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Impossible d\'envoyer l\'offre.');
      }
    });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}
