import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-stack">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [ngClass]="{
          'toast--success': toast.type === 'success',
          'toast--error':   toast.type === 'error',
          'toast--info':    toast.type === 'info'
        }">
          <!-- Icône selon le type -->
          <span class="toast__icon">
            @if (toast.type === 'success') {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            } @else if (toast.type === 'error') {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            }
          </span>

          <!-- Message -->
          <span class="toast__msg">{{ toast.message }}</span>

          <!-- Barre de progression -->
          <span class="toast__progress"></span>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Conteneur ── */
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    /* ── Toast base ── */
    .toast {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      min-width: 300px;
      max-width: 420px;
      padding: 13px 16px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      box-shadow: 0 8px 28px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08);
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.45;
      overflow: hidden;
      animation: toastIn 0.28s cubic-bezier(.22,1,.36,1);
      pointer-events: all;
    }

    /* ── Variantes ── */
    .toast--error {
      background: var(--cc-danger-bg);
      border-color: var(--cc-danger);
      color: var(--cc-danger-bg);
    }
    .toast--error .toast__icon { color: var(--cc-danger); }
    .toast--error .toast__progress { background: var(--cc-danger); }

    .toast--success {
      background: var(--cc-success-bg);
      border-color: var(--cc-success);
      color: var(--cc-success-bg);
    }
    .toast--success .toast__icon { color: var(--cc-success); }
    .toast--success .toast__progress { background: var(--cc-success); }

    .toast--info {
      background: var(--cc-info-bg);
      border-color: var(--cc-info);
      color: var(--cc-info-bg);
    }
    .toast--info .toast__icon { color: var(--cc-info); }
    .toast--info .toast__progress { background: var(--cc-info); }

    /* ── Icône ── */
    .toast__icon {
      flex-shrink: 0;
      margin-top: 1px;
      display: flex;
    }

    /* ── Message ── */
    .toast__msg {
      flex: 1;
      word-break: break-word;
    }

    /* ── Barre de progression (disparition en 4s) ── */
    .toast__progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      border-radius: 0 0 12px 12px;
      opacity: .7;
      animation: toastProgress 4s linear forwards;
    }

    /* ── Animations ── */
    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(14px) scale(.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes toastProgress {
      from { transform: scaleX(1); transform-origin: left; }
      to   { transform: scaleX(0); transform-origin: left; }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
