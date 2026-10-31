import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg,#f7f8f5);">
      <div style="width:100%;max-width:440px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.10);padding:40px;text-align:center;position:relative;">

        <!-- Bouton Retour -->
        <a routerLink="/register"
           style="position:absolute;top:24px;left:24px;color:#6b7280;font-size:.9rem;font-weight:500;display:flex;align-items:center;gap:4px;text-decoration:none;">
          ← Retour
        </a>

        <!-- Logo -->
        <div style="font-size:1.75rem;font-weight:800;color:#123b32;margin-bottom:8px;margin-top:16px;">
          🚴 ConfianceCoursier
        </div>

        <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:12px;color:#1a1a1a;">
          Vérifiez votre téléphone
        </h1>
        <p style="color:#6b7280;font-size:.95rem;margin-bottom:4px;">
          Un code à 6 chiffres a été envoyé à
        </p>
        <p style="color:#123b32;font-weight:700;font-size:.95rem;margin-bottom:24px;">
          {{ maskedEmail }}
        </p>

        <!-- 6 inputs OTP -->
        <form (ngSubmit)="onSubmit()">
          <div style="display:flex;gap:8px;justify-content:center;margin:0 0 20px;">
            <input
              *ngFor="let _ of digits; let i = index"
              #otpInput
              type="text"
              inputmode="numeric"
              maxlength="1"
              [value]="digits[i]"
              (input)="onInput($event, i)"
              (keydown)="onKeydown($event, i)"
              (paste)="onPaste($event)"
              style="width:48px;height:56px;text-align:center;font-size:1.5rem;font-weight:700;border:2px solid #e5e7eb;border-radius:10px;outline:none;background:#f9fafb;color:#1a1a1a;transition:border-color .15s;"
              [style.border-color]="digits[i] ? '#123b32' : '#e5e7eb'"
            />
          </div>

          <!-- Timer / Renvoyer -->
          <p style="font-size:.9rem;color:#6b7280;margin-bottom:24px;">
            <ng-container *ngIf="timeLeft > 0">
              ⏱ Renvoyer le code dans <strong>{{ timeLeft }}s</strong>
            </ng-container>
            <ng-container *ngIf="timeLeft === 0">
              <a href="#" (click)="resendCode($event)"
                 style="color:#17634f;font-weight:600;text-decoration:underline;">
                Renvoyer le code
              </a>
            </ng-container>
          </p>

          <button
            type="submit"
            [disabled]="!isComplete || loading"
            style="width:100%;padding:14px;background:#17634f;color:#fff;font-weight:700;font-size:1rem;border:none;border-radius:10px;cursor:pointer;transition:opacity .2s;"
            [style.opacity]="(!isComplete || loading) ? '0.5' : '1'">
            {{ loading ? 'Vérification…' : 'Vérifier le code' }}
          </button>
        </form>

      </div>
    </div>
  `
})
export class OtpComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = '';
  digits: string[] = ['', '', '', '', '', ''];
  timeLeft = 60;
  loading = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  get maskedEmail(): string {
    if (!this.email) return '';
    const [local, domain] = this.email.split('@');
    if (!domain) return this.email;
    const masked = local.length > 2
      ? local.slice(0, 2) + '***'
      : local[0] + '***';
    return `${masked}@${domain}`;
  }

  get isComplete(): boolean {
    return this.digits.every(d => d.length === 1);
  }

  get otpValue(): string {
    return this.digits.join('');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1); // chiffre uniquement
    this.digits[index] = value;
    input.value = value; // synchronise le DOM

    if (value && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (this.digits[index]) {
        this.digits[index] = '';
        (event.target as HTMLInputElement).value = '';
      } else if (index > 0) {
        this.digits[index - 1] = '';
        this.focusInput(index - 1);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const nums = text.replace(/\D/g, '').slice(0, 6).split('');
    nums.forEach((n, i) => { this.digits[i] = n; });
    // Focus sur le dernier chiffre collé
    const lastIndex = Math.min(nums.length, 5);
    setTimeout(() => this.focusInput(lastIndex), 0);
  }

  private focusInput(index: number): void {
    const inputs = this.otpInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.focus();
    }
  }

  private startTimer(): void {
    this.timeLeft = 60;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resendCode(event: Event): void {
    event.preventDefault();
    if (!this.email) return;
    // Re-déclenche l'inscription (même email) pour envoyer un nouvel OTP
    this.authService.register({ email: this.email, password: '', fullName: '', phone: '', role: '' })
      .subscribe({
        next: () => {
          this.toastService.success('Nouveau code envoyé à ' + this.email);
          this.digits = ['', '', '', '', '', ''];
          this.startTimer();
        },
        error: () => {
          // L'erreur "compte déjà existant" est normale ici — l'OTP est quand même renvoyé
          this.toastService.info('Nouveau code envoyé à ' + this.email);
          this.digits = ['', '', '', '', '', ''];
          this.startTimer();
        }
      });
  }

  onSubmit(): void {
    if (!this.isComplete) return;
    this.loading = true;

    this.authService.verifyOtp(this.email, this.otpValue).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Téléphone vérifié ! Vous pouvez maintenant vous connecter.');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Code OTP invalide ou expiré. Vérifiez le code et réessayez.');
        this.digits = ['', '', '', '', '', ''];
        setTimeout(() => this.focusInput(0), 0);
      }
    });
  }
}
