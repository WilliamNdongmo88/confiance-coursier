import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="fixed bottom-6 right-6 z-50 space-y-3">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          [ngClass]="{
            'bg-green-600': toast.type === 'success',
            'bg-red-600': toast.type === 'error',
            'bg-blue-600': toast.type === 'info'
          }"
          class="text-white px-6 py-3 rounded-lg shadow-lg font-semibold animate-fade-in-up min-w-[300px]">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
