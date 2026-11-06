import { Component } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [ngClass]="{
          'toast--success': toast.type === 'success',
          'toast--error':   toast.type === 'error',
          'toast--info':    toast.type === 'info'
        }" [attr.role]="toast.type === 'error' ? 'alert' : 'status'">
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

          <button type="button" class="toast__close" aria-label="Fermer la notification" (click)="toastService.dismiss(toast.id)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>

          <!-- Barre de progression -->
          <span class="toast__progress"></span>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Texte en encre sur une surface pleine teintée du statut : lisible en clair comme en sombre. */
    .toast-stack {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    }
    .toast {
      --tone: var(--cc-info);
      position: relative; display: flex; align-items: flex-start; gap: 11px;
      width: min(420px, calc(100vw - 32px));
      padding: 12px 6px 16px 16px; border-radius: 12px;
      border: 1px solid color-mix(in oklab, var(--tone) 45%, transparent);
      background: linear-gradient(color-mix(in oklab, var(--tone) 12%, transparent), color-mix(in oklab, var(--tone) 12%, transparent)), var(--cc-white);
      color: var(--cc-ink);
      box-shadow: 0 10px 30px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
      font-size: 14px; font-weight: 550; line-height: 1.45;
      overflow: hidden; pointer-events: all;
      animation: toastIn .32s cubic-bezier(.16,1,.3,1);
    }
    .toast--error   { --tone: var(--cc-danger); }
    .toast--success { --tone: var(--cc-success); }
    .toast--info    { --tone: var(--cc-info); }
    .toast__icon { flex-shrink: 0; margin-top: 2px; display: flex; color: var(--tone); }
    .toast__msg { flex: 1; padding-top: 1px; word-break: break-word; }
    .toast__close {
      flex: none; width: 36px; height: 36px; margin: -8px 0 -8px; display: grid; place-items: center;
      border: 0; border-radius: 8px; background: none; color: inherit; opacity: .7; cursor: pointer;
    }
    .toast__close:hover { opacity: 1; background: color-mix(in oklab, var(--tone) 14%, transparent); }
    .toast__progress {
      position: absolute; bottom: 0; left: 0; height: 3px; width: 100%;
      background: var(--tone); opacity: .75; transform-origin: left;
      animation: toastProgress 4s linear forwards;
    }
    /* Mobile : en haut de l'écran, au-dessus du clavier et de la barre de navigation basse */
    @media (max-width: 600px) {
      .toast-stack { top: calc(12px + env(safe-area-inset-top)); bottom: auto; left: 16px; right: 16px; }
      .toast { width: 100%; animation-name: toastInTop; }
    }
    @keyframes toastIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
    @keyframes toastInTop { from { opacity: 0; transform: translateY(-14px) scale(.97); } to { opacity: 1; transform: none; } }
    @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
