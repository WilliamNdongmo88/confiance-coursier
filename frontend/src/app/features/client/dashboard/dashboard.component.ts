import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { LucideBike, LucidePlus, LucideLogOut, LucidePencil, LucideTrash2, LucideMessageSquare } from '@lucide/angular';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent, LucideBike, LucidePlus, LucideLogOut, LucidePencil, LucideTrash2, LucideMessageSquare],
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
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-2xl font-bold text-[#15241f]">Bonjour !</h1>
            <p class="text-gray-500">Gérez vos courses depuis votre espace client.</p>
          </div>
          <a routerLink="/client/create-course" class="bg-[#123b32] text-white px-5 py-3 rounded-lg font-bold hover:bg-[#1b5144] transition-all flex items-center gap-2">
            <svg lucidePlus size="18"></svg> Nouvelle course
          </a>
        </div>

        <!-- Liste des courses -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-bold mb-4">Mes courses</h2>

          @if (courses.length === 0) {
            <div class="text-center py-12 text-gray-400">
              <p>Aucune course pour le moment.</p>
              <p class="text-sm mt-2">Créez votre première course !</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (course of courses; track course.id) {
                <div class="border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                  <div class="flex-1">
                    <div class="font-semibold text-[#15241f]">{{ course.description }}</div>
                    <div class="text-sm text-gray-500 mt-1">
                      {{ course.zone }} · {{ course.scheduledAt | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="px-3 py-1 rounded-full text-xs font-bold"
                      [class]="course.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                              course.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'">
                      {{ course.status }}
                    </span>

                    <!-- Boutons Modifier / Supprimer uniquement si PUBLISHED -->
                    @if (course.status === 'PUBLISHED') {
                      <button (click)="editCourse(course.id)"
                        class="p-2 text-gray-500 hover:text-[#123b32] hover:bg-gray-100 rounded-lg transition-all"
                        title="Modifier">
                        <svg lucidePencil size="16"></svg>
                      </button>
                      <button (click)="deleteCourse(course.id)"
                        [disabled]="deletingCourseId === course.id"
                        class="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Supprimer">
                        @if (deletingCourseId === course.id) {
                          <app-spinner size="sm"></app-spinner>
                        } @else {
                          <svg lucideTrash2 size="16"></svg>
                        }
                      </button>
                    }

                    <!-- Bouton Ouvrir le chat si ASSIGNED -->
                    @if (course.status === 'ASSIGNED') {
                      <a [routerLink]="['/chat', course.id]"
                        class="px-4 py-2 bg-[#123b32] text-white rounded-lg font-bold hover:bg-[#1b5144] transition-all flex items-center gap-2 text-sm">
                        <svg lucideMessageSquare size="16"></svg> Ouvrir le chat
                      </a>
                    }
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
export class ClientDashboardComponent implements OnInit {
  courses: any[] = [];
  deletingCourseId: number | null = null;

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.courseService.getMyCourses().subscribe({
      next: (data) => this.courses = data,
      error: (err) => console.error(err)
    });
  }

  editCourse(id: number) {
    this.router.navigate(['/client/edit-course', id]);
  }

  deleteCourse(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette course ?')) return;

    this.deletingCourseId = id;
    this.courseService.deleteCourse(id).subscribe({
      next: () => {
        this.deletingCourseId = null;
        this.toast.success('Course supprimée.');
        this.loadCourses();
      },
      error: (err) => {
        this.deletingCourseId = null;
        this.toast.error(err.error?.message || 'Impossible de supprimer la course.');
      }
    });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}
