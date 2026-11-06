import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink, LucideArrowLeft, LucideBike, LucideMoon, LucideSun],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card st-ta-center-posi-relative">

        <!-- Bouton Retour (absolu, haut-gauche) -->
        <a routerLink="/register" class="back-link" aria-label="Retour à l'inscription">
          <svg lucideArrowLeft size="16"></svg> Retour
        </a>

        <!-- Contrôles thème / langue (absolu, haut-droite) -->
        <div class="top-controls">
          <button class="lang-toggle" type="button" aria-label="Changer de langue" (click)="toggleLang()">
            {{ lang().toUpperCase() }}
          </button>
          <button class="theme-toggle" type="button"
            [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
            (click)="theme.toggleTheme()">
            @if (theme.isDarkMode()) {
              <svg lucideSun size="18"></svg>
            } @else {
              <svg lucideMoon size="18"></svg>
            }
          </button>
        </div>

        <!-- Logo -->
        <div class="auth-logo st-mt-16px">
          <svg lucideBike size="22"></svg>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <h1 class="auth-title">Vérifiez votre téléphone</h1>

        <p class="text-muted st-mb-4px">
          Un code à 6 chiffres a été envoyé au
        </p>
        <p class="st-fw-700-c-primary-mb-0">
          {{ maskedPhone }}
        </p>
        @if (maskedEmail) {
          <p class="text-muted st-fs-85rem-mt-4px-mb-0">
            et à {{ maskedEmail }}
          </p>
        }

        <!-- 6 inputs OTP — déclarés individuellement pour éviter tout re-render *ngFor -->
        <form class="st-mt-0" (ngSubmit)="onSubmit()">
          <div class="otp-inputs">
            <input #d0 type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code"
              class="otp-input" aria-label="Chiffre 1"
              (keydown)="onKeydown($event, 0)" (paste)="onPaste($event)" (input)="onInput($event, 0)" />
            <input #d1 type="text" inputmode="numeric" maxlength="1"
              class="otp-input" aria-label="Chiffre 2"
              (keydown)="onKeydown($event, 1)" (paste)="onPaste($event)" (input)="onInput($event, 1)" />
            <input #d2 type="text" inputmode="numeric" maxlength="1"
              class="otp-input" aria-label="Chiffre 3"
              (keydown)="onKeydown($event, 2)" (paste)="onPaste($event)" (input)="onInput($event, 2)" />
            <input #d3 type="text" inputmode="numeric" maxlength="1"
              class="otp-input" aria-label="Chiffre 4"
              (keydown)="onKeydown($event, 3)" (paste)="onPaste($event)" (input)="onInput($event, 3)" />
            <input #d4 type="text" inputmode="numeric" maxlength="1"
              class="otp-input" aria-label="Chiffre 5"
              (keydown)="onKeydown($event, 4)" (paste)="onPaste($event)" (input)="onInput($event, 4)" />
            <input #d5 type="text" inputmode="numeric" maxlength="1"
              class="otp-input" aria-label="Chiffre 6"
              (keydown)="onKeydown($event, 5)" (paste)="onPaste($event)" (input)="onInput($event, 5)" />
          </div>

          <!-- Timer / Renvoyer -->
          <p class="resend-timer">
            @if (timeLeft > 0) {
              ⏱ Renvoyer le code dans <strong>{{ timeLeft }}s</strong>
            } @else {
              <a class="st-c-primary-fw-600" href="#" (click)="resendCode($event)">
                Renvoyer le code
              </a>
            }
          </p>

          <button type="submit" class="btn btn-primary btn-block btn-lg"
            [disabled]="!isComplete || loading">
            {{ loading ? 'Vérification…' : 'Vérifier' }}
          </button>
        </form>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .otp-inputs {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin: 24px 0;
    }

    .otp-input {
      width: 48px;
      height: 56px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      background: var(--bg);
      color: var(--text);
    }

    .otp-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .otp-input--filled {
      border-color: var(--primary);
    }

    .resend-timer {
      font-size: .9rem;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Positionnement absolu des contrôles (back-link & top-controls) */
    .back-link {
      position: absolute;
      top: 24px;
      left: 24px;
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--text-muted);
      font-size: .9rem;
      font-weight: 500;
      text-decoration: none;
      border-radius: 8px;
      padding: 0 8px;
      transition: color 0.15s, background 0.15s;
    }

    .back-link:hover {
      color: var(--primary);
      background: var(--gray-100);
    }

    .top-controls {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    @media (max-width: 480px) {
      .otp-input {
        width: 40px;
        height: 48px;
        font-size: 1.25rem;
      }
    }

    /* TICK-076 : anciens attributs « style » du template, convertis en classes (mêmes déclarations) */
    .st-ta-center-posi-relative { text-align: center; position: relative; }
    .st-mt-16px { margin-top: 16px; }
    .st-mb-4px { margin-bottom: 4px; }
    .st-fw-700-c-primary-mb-0 { font-weight: 700; color: var(--primary); margin-bottom: 0; }
    .st-fs-85rem-mt-4px-mb-0 { font-size: .85rem; margin-top: 4px; margin-bottom: 0; }
    .st-mt-0 { margin-top: 0; }
    .st-c-primary-fw-600 { color: var(--primary); font-weight: 600; }
  `]
})
export class OtpComponent implements OnInit, OnDestroy {
  @ViewChild('d0') i0!: ElementRef<HTMLInputElement>;
  @ViewChild('d1') i1!: ElementRef<HTMLInputElement>;
  @ViewChild('d2') i2!: ElementRef<HTMLInputElement>;
  @ViewChild('d3') i3!: ElementRef<HTMLInputElement>;
  @ViewChild('d4') i4!: ElementRef<HTMLInputElement>;
  @ViewChild('d5') i5!: ElementRef<HTMLInputElement>;

  email = '';
  phone = '';
  timeLeft = 60;
  loading = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly theme = inject(ThemeService);
  readonly lang  = signal<string>(localStorage.getItem('lang') || 'fr');

  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private authService = inject(AuthService);
  private toast       = inject(ToastService);

  // ─── Helpers DOM ─────────────────────────────────────────────────────────

  private get inputs(): HTMLInputElement[] {
    return [this.i0, this.i1, this.i2, this.i3, this.i4, this.i5]
      .map((r) => r?.nativeElement)
      .filter(Boolean);
  }

  private inputAt(i: number): HTMLInputElement | null {
    return this.inputs[i] ?? null;
  }

  private focusAt(i: number): void {
    // setTimeout 0 : laisse le navigateur finir de peindre avant de déplacer le focus
    setTimeout(() => this.inputAt(i)?.focus(), 0);
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  /** Téléphone masqué : +237 6XX XXX XXX → +237 6** *** **2 */
  get maskedPhone(): string {
    if (!this.phone) return '+237 6XX XXX XXX';
    const digits = this.phone.replace(/\D/g, '');
    if (digits.length < 6) return this.phone;
    const prefix = this.phone.startsWith('+') ? '+' + digits.slice(0, 3) : '';
    const visible = digits.slice(-2);
    const masked  = digits.slice(3, -2).replace(/\d/g, 'X');
    return prefix ? `${prefix} ${masked.slice(0,1)}XX XXX XX${visible}` : `${masked}${visible}`;
  }

  /** Email masqué affiché en secondaire si disponible */
  get maskedEmail(): string {
    if (!this.email) return '';
    const [local, domain] = this.email.split('@');
    if (!domain) return '';
    const masked = local.length > 2 ? local.slice(0, 2) + '***' : local[0] + '***';
    return `${masked}@${domain}`;
  }

  get isComplete(): boolean {
    return this.inputs.length === 6 && this.inputs.every((el) => !!el.value);
  }

  private get otpValue(): string {
    return this.inputs.map((el) => el.value).join('');
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      this.phone = params['phone'] || '';
    });
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    // Garde uniquement le dernier chiffre saisi (écrase l'ancien si présent)
    const raw   = input.value.replace(/\D/g, '');
    const digit = raw.slice(-1);

    // Remet la valeur nettoyée dans le DOM
    input.value = digit;
    input.classList.toggle('otp-input--filled', !!digit);

    // Avance au carré suivant APRÈS la mise à jour du DOM
    if (digit && index < 5) {
      this.focusAt(index + 1);
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (input.value) {
        input.value = '';
        input.classList.remove('otp-input--filled');
      } else if (index > 0) {
        const prev = this.inputAt(index - 1);
        if (prev) {
          prev.value = '';
          prev.classList.remove('otp-input--filled');
          prev.focus();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusAt(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.focusAt(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const nums  = text.replace(/\D/g, '').slice(0, 6);
    nums.split('').forEach((n, i) => {
      const el = this.inputAt(i);
      if (el) { el.value = n; el.classList.add('otp-input--filled'); }
    });
    // Focus sur le premier carré vide après le collage
    const nextEmpty = nums.length < 6 ? nums.length : 5;
    this.focusAt(nextEmpty);
  }

  resendCode(event: Event): void {
    event.preventDefault();
    if (!this.email) return;
    this.authService.resendOtp(this.email).subscribe({
      next:  () => this.onResendSuccess(),
      error: (err) => this.toast.error(err?.error?.message || 'Impossible de renvoyer le code. Réessayez dans quelques instants.'),
    });
  }

  onSubmit(): void {
    if (!this.isComplete) return;
    this.loading = true;

    this.authService.verifyOtp(this.email, this.otpValue).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Email vérifié ! Vous pouvez maintenant vous connecter.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Code OTP invalide ou expiré. Vérifiez et réessayez.');
        this.clearInputs();
        this.focusAt(0);
      },
    });
  }

  toggleLang(): void {
    const next = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    localStorage.setItem('lang', next);
    document.documentElement.lang = next;
  }

  // ─── Privé ───────────────────────────────────────────────────────────────

  private clearInputs(): void {
    this.inputs.forEach((el) => {
      el.value = '';
      el.classList.remove('otp-input--filled');
    });
  }

  private startTimer(): void {
    this.timeLeft = 60;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private onResendSuccess(): void {
    this.toast.info('Nouveau code envoyé à ' + this.email);
    this.clearInputs();
    this.startTimer();
    this.focusAt(0);
  }
}
