import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideArrowLeft, LucideBike, LucideClock, LucideMailCheck, LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideArrowLeft, LucideBike, LucideClock, LucideMailCheck, LucideMoon, LucideSun],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card otp-card">

        <div class="auth-topbar">
          <a class="back-link" routerLink="/register" aria-label="Retour à l’inscription">
            <svg lucideArrowLeft size="16"></svg> Retour
          </a>
          <div class="top-controls">
            <button class="theme-toggle" type="button"
              [attr.aria-label]="theme.isDarkMode() ? 'Activer le thème clair' : 'Activer le thème sombre'"
              (click)="theme.toggleTheme()">
              @if (theme.isDarkMode()) { <svg lucideSun size="18"></svg> } @else { <svg lucideMoon size="18"></svg> }
            </button>
          </div>
        </div>

        <div class="auth-logo">
          <span class="auth-mark"><svg lucideBike size="18"></svg></span>
          <span class="auth-logo-text">ConfianceCoursier</span>
        </div>

        <span class="otp-badge" aria-hidden="true"><svg lucideMailCheck size="26"></svg></span>
        <h1 class="auth-title">Vérifiez votre email</h1>

        @if (email) {
          <p class="auth-subtitle otp-sub">
            Saisissez le code à 6 chiffres envoyé à<br><strong class="otp-email">{{ maskedEmail }}</strong>
          </p>
        } @else {
          <p class="auth-subtitle otp-sub">Indiquez l’email de votre compte, puis le code à 6 chiffres reçu.</p>
          <div class="form-group otp-email-field">
            <label class="form-label" for="otp-email">Email</label>
            <input id="otp-email" type="email" class="form-input" [(ngModel)]="emailDraft" name="emailDraft"
                   placeholder="vous@email.com" autocomplete="email">
          </div>
        }

        <form (ngSubmit)="onSubmit()">
          <div class="otp-inputs" role="group" aria-label="Code de vérification à 6 chiffres"
               [class.otp-error]="hasError()" [class.otp-done]="verified()">
            <input #d0 type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code"
              class="otp-input" aria-label="Chiffre 1"
              (keydown)="onKeydown($event, 0)" (paste)="onPaste($event)" (input)="onInput($event, 0)" />
            <input #d1 type="text" inputmode="numeric" maxlength="1" autocomplete="off"
              class="otp-input" aria-label="Chiffre 2"
              (keydown)="onKeydown($event, 1)" (paste)="onPaste($event)" (input)="onInput($event, 1)" />
            <input #d2 type="text" inputmode="numeric" maxlength="1" autocomplete="off"
              class="otp-input" aria-label="Chiffre 3"
              (keydown)="onKeydown($event, 2)" (paste)="onPaste($event)" (input)="onInput($event, 2)" />
            <input #d3 type="text" inputmode="numeric" maxlength="1" autocomplete="off"
              class="otp-input" aria-label="Chiffre 4"
              (keydown)="onKeydown($event, 3)" (paste)="onPaste($event)" (input)="onInput($event, 3)" />
            <input #d4 type="text" inputmode="numeric" maxlength="1" autocomplete="off"
              class="otp-input" aria-label="Chiffre 5"
              (keydown)="onKeydown($event, 4)" (paste)="onPaste($event)" (input)="onInput($event, 4)" />
            <input #d5 type="text" inputmode="numeric" maxlength="1" autocomplete="off"
              class="otp-input" aria-label="Chiffre 6"
              (keydown)="onKeydown($event, 5)" (paste)="onPaste($event)" (input)="onInput($event, 5)" />
          </div>

          @if (hasError()) {
            <p class="otp-msg otp-msg--error" role="alert">{{ errorMsg }}</p>
          }

          <p class="resend-timer" aria-live="polite">
            @if (timeLeft > 0) {
              <svg lucideClock size="15"></svg> Renvoyer le code dans <strong>{{ timeLeft }} s</strong>
            } @else {
              Code non reçu ?
              <button type="button" class="resend-btn" (click)="resendCode()" [disabled]="!currentEmail">Renvoyer le code</button>
            }
          </p>

          <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="!isComplete || loading || !currentEmail">
            {{ loading ? 'Vérification…' : 'Vérifier' }}
          </button>
        </form>

        <p class="otp-help">Pensez à regarder dans vos courriers indésirables.</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; --otp-muted: #56635c; }
    :host-context([data-theme="dark"]) { --otp-muted: #B0C0B7; }
    .otp-card { text-align: center; }
    .otp-badge {
      width: 58px; height: 58px; margin: 6px auto 14px; border-radius: 18px; display: grid; place-items: center;
      background: color-mix(in oklab, var(--primary) 12%, var(--cc-white)); color: var(--primary);
      animation: otp-pop .6s cubic-bezier(.16,1,.3,1) .15s both;
    }
    .otp-sub { margin-bottom: 22px; }
    .otp-email { color: var(--cc-ink); font-weight: 700; }
    .otp-email-field { text-align: left; margin-bottom: 18px; }
    .otp-inputs { display: flex; gap: 8px; justify-content: center; margin: 4px 0 14px; }
    .otp-input {
      width: 48px; height: 58px; padding: 0; text-align: center; font-size: 1.5rem; font-weight: 750;
      font-variant-numeric: tabular-nums; border: 1.5px solid var(--cc-line); border-radius: 12px; outline: none;
      background: var(--cc-white); color: var(--cc-ink); caret-color: var(--primary);
      transition: border-color .15s, box-shadow .15s, transform .18s cubic-bezier(.16,1,.3,1), background .15s;
    }
    .otp-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
    .otp-input--filled { border-color: color-mix(in oklab, var(--primary) 70%, transparent); animation: otp-fill .22s cubic-bezier(.16,1,.3,1); }
    .otp-error .otp-input { border-color: var(--cc-danger); animation: otp-shake .38s ease-in-out; }
    .otp-done .otp-input { border-color: var(--cc-success); background: color-mix(in oklab, var(--cc-success) 10%, var(--cc-white)); }
    .otp-msg { margin: -4px 0 12px; font-size: .85rem; }
    .otp-msg--error { color: var(--cc-danger); }
    .resend-timer { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;
      min-height: 44px; margin: 0 0 14px; font-size: .9rem; color: var(--otp-muted); }
    .resend-timer strong { color: var(--cc-ink); font-variant-numeric: tabular-nums; }
    .resend-btn { min-height: 44px; padding: 0 6px; border: 0; background: none; color: var(--primary); font: inherit; font-weight: 700; cursor: pointer; }
    .resend-btn:hover { text-decoration: underline; }
    .otp-help { margin: 18px 0 0; font-size: .82rem; color: var(--otp-muted); }
    :host-context([data-theme="dark"]) .otp-input { background: var(--brand-paper); }
    :host-context([data-theme="dark"]) .otp-badge { background: rgba(215,237,154,.12); color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .resend-btn { color: var(--cc-success); }
    :host-context([data-theme="dark"]) .otp-msg--error { color: var(--cc-danger) !important; }
    @keyframes otp-pop { from { opacity: 0; transform: scale(.7) rotate(-8deg); } to { opacity: 1; transform: none; } }
    @keyframes otp-fill { 0% { transform: scale(.92); } 60% { transform: scale(1.06); } 100% { transform: none; } }
    @keyframes otp-shake { 0%,100% { transform: none; } 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
    @media (max-width: 380px) { .otp-inputs { gap: 6px; } .otp-input { width: 42px; height: 52px; font-size: 1.3rem; } }
    @media (prefers-reduced-motion: reduce) { .otp-badge, .otp-input--filled, .otp-error .otp-input { animation: none; } }
  `]
})
export class OtpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('d0') i0!: ElementRef<HTMLInputElement>;
  @ViewChild('d1') i1!: ElementRef<HTMLInputElement>;
  @ViewChild('d2') i2!: ElementRef<HTMLInputElement>;
  @ViewChild('d3') i3!: ElementRef<HTMLInputElement>;
  @ViewChild('d4') i4!: ElementRef<HTMLInputElement>;
  @ViewChild('d5') i5!: ElementRef<HTMLInputElement>;

  email = '';
  /** Saisie de l'email quand l'écran est ouvert sans ?email= (lien direct, rechargement). */
  emailDraft = '';
  readonly hasError = signal(false);
  errorMsg = '';
  readonly verified = signal(false);
  timeLeft = 60;
  loading = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly theme = inject(ThemeService);

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

  /** Email utilisé pour vérifier / renvoyer : celui de l'URL, sinon celui saisi. */
  get currentEmail(): string {
    return (this.email || this.emailDraft).trim();
  }

  private get otpValue(): string {
    return this.inputs.map((el) => el.value).join('');
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
    });
    this.startTimer();
  }

  /** Focus direct : sur la 1re case (clavier numérique ouvert), ou sur l'email s'il manque. */
  ngAfterViewInit(): void {
    if (this.email) this.focusAt(0);
    else setTimeout(() => document.getElementById('otp-email')?.focus(), 0);
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
    this.hasError.set(false);

    // Avance au carré suivant APRÈS la mise à jour du DOM
    if (digit && index < 5) {
      this.focusAt(index + 1);
    } else if (digit && this.isComplete) {
      this.onSubmit();
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
    this.hasError.set(false);
    if (nums.length === 6) this.onSubmit();
  }

  resendCode(): void {
    if (!this.currentEmail) return;
    this.authService.resendOtp(this.currentEmail).subscribe({
      next:  () => this.onResendSuccess(),
      error: (err) => this.toast.error(err?.error?.message || 'Impossible de renvoyer le code. Réessayez dans quelques instants.'),
    });
  }

  onSubmit(): void {
    if (!this.isComplete || this.loading || !this.currentEmail) return;
    this.loading = true;

    this.authService.verifyOtp(this.currentEmail, this.otpValue).subscribe({
      next: () => {
        this.loading = false;
        this.verified.set(true);
        this.toast.success('Email vérifié ! Vous pouvez maintenant vous connecter.');
        // Laisse voir la confirmation (cases en vert) avant de partir
        setTimeout(() => this.router.navigate(['/login']), 600);
      },
      error: (err) => {
        this.loading = false;
        // Message affiché sous les cases (pas de notification en double)
        this.errorMsg = err?.error?.message || 'Code incorrect ou expiré. Vérifiez-le et réessayez.';
        this.hasError.set(true);
        this.clearInputs();
        this.focusAt(0);
      },
    });
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
    this.toast.info('Nouveau code envoyé à ' + this.currentEmail);
    this.clearInputs();
    this.hasError.set(false);
    this.stopTimer();
    this.startTimer();
    this.focusAt(0);
  }
}
