import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f7f8f5;">
      <div style="width: 100%; max-width: 400px; padding: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h1 style="font-size: 1.8rem; color: #123b32; text-align: center; margin-bottom: 8px;">Vérification OTP</h1>
        <p style="text-align: center; color: #666; margin-bottom: 24px;">Entrez le code à 6 chiffres envoyé à {{ email }}</p>

        <form (ngSubmit)="onSubmit()">
          <div style="margin-bottom: 16px;">
            <input type="text" [(ngModel)]="otp" name="otp" maxlength="6" required style="width: 100%; padding: 16px; border: 1px solid #ddd; border-radius: 6px; font-size: 1.5rem; text-align: center; letter-spacing: 8px;">
          </div>

          <button type="submit" style="width: 100%; padding: 12px; background: #123b32; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Vérifier
          </button>
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
      error: (err) => alert('Code OTP invalide.')
    });
  }
}
