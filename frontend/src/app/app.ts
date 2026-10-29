import { Component, OnInit } from '@angular/core';
import { ApiService } from './core/services/api.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule],
  template: `
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f7f8f5; font-family: sans-serif;">

      <h1 style="font-size: 2.5rem; font-weight: bold; color: #123b32; margin-bottom: 2rem;">
        ConfianceCoursier
      </h1>

      <button
        (click)="testBackend()"
        style="padding: 12px 24px; background-color: #123b32; color: #ffffff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Tester la connexion au Backend
      </button>

      @if (message) {
        <p style="margin-top: 1.5rem; font-size: 1.1rem; font-weight: 500; color: #374151;">
          {{ message }}
        </p>
      }
    </div>
  `,
  styles: []
})
export class App implements OnInit {
  message: string = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {}

  testBackend(): void {
    this.apiService.healthCheck().subscribe({
      next: (response) => {
        this.message = `✅ ${response}`;
      },
      error: (error) => {
        this.message = `❌ Erreur : impossible de joindre le backend.`;
        console.error(error);
      }
    });
  }
}
