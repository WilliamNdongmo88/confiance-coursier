import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideShieldCheck } from '@lucide/angular';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule, LucideShieldCheck],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
      <div class="auth-card">
        <div class="text-center mb-6">
          <div class="brand-icon">
            <svg lucideShieldCheck size="20"></svg>
          </div>
          <h1 class="text-xl font-extrabold text-[#123b32]">ConfianceCoursier</h1>
        </div>

        <h2 class="auth-title">Vérification OTP</h2>
        <p class="text-center text-sm text-gray-600 mb-6">
          Entrez le code à 6 chiffres envoyé à<br>
          <strong class="text-[#123b32]">{{ email }}</strong>
        </p>

        <form (ngSubmit)="onSubmit()">
          <div class="mb-6">
            <input type="text" [(ngModel)]="otp" name="otp" maxlength="6" required
              class="w-full px-4 py-4 border border-gray-200 rounded-lg text-center text-2xl tracking-[0.5em] font-bold outline-none focus:border-[#123b32] focus:ring-2 focus:ring-[#d7ed9a]"
              placeholder="000000">
          </div>
          <button type="submit" class="btn-primary">Vérifier</button>
        </form>
      </div>
    </div>
  `
})
export class OtpComponent implements OnInit {
  email = '';
  otp = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  onSubmit() {
    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        alert('OTP vérifié ! Vous pouvez maintenant vous connecter.');
        this.router.navigate(['/login']);
      },
      error: () => alert('Code OTP invalide.')
    });
  }
}
