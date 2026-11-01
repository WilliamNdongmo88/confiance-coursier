import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';
import { PaymentService } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LucideArrowLeft,
  LucideFileText,
  LucideAlertTriangle,
  LucideCreditCard,
  LucideLock,
  LucideShieldCheck,
} from '@lucide/angular';

type PaymentMethod = 'STRIPE' | 'MTN' | 'ORANGE';

const CLIENT_FEE_RATE = 5; // % — doit correspondre à PaymentService.java

@Component({
  selector: 'app-pay',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,
    AppShellComponent,
    LucideArrowLeft,
    LucideFileText,
    LucideAlertTriangle,
    LucideCreditCard,
    LucideLock,
    LucideShieldCheck,
  ],
  styles: [`
    .invoice-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: .93rem;
      color: var(--text-muted, #6d7a71);
      gap: 12px;
    }
    .invoice-line.total {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px dashed var(--border, #e1e8e0);
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text, #15241f);
    }
    .frais-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .frais-input input {
      width: 120px;
      padding: 4px 8px;
      text-align: right;
    }

    .security-note {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--cc-success-bg, #e4f3e9);
      padding: 14px 16px;
      border-radius: var(--radius-md, 10px);
      color: var(--cc-success, #26845d);
      font-size: .85rem;
      margin-bottom: 22px;
      border: 1px solid rgba(38,132,93,.18);
    }
    .security-note svg { flex-shrink: 0; margin-top: 1px; }

    .payment-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border, #e1e8e0);
      border-radius: var(--radius-md, 10px);
      cursor: pointer;
      transition: border-color .15s, background .15s;
      background: var(--bg, #f7f8f5);
      margin-bottom: 10px;
    }
    .payment-option.selected {
      border-color: var(--primary, #17634f);
      background: var(--primary-light, #e4f1e8);
    }
    .payment-option input[type="radio"] {
      width: 17px; height: 17px;
      accent-color: var(--primary, #17634f);
      flex-shrink: 0;
    }
    .payment-icon {
      width: 40px; height: 40px;
      border-radius: var(--radius-sm, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: .78rem;
      flex-shrink: 0;
    }
    .payment-info .payment-name {
      font-weight: 700;
      font-size: .9rem;
      color: var(--text, #15241f);
    }
    .payment-info .payment-desc {
      font-size: .78rem;
      color: var(--text-muted, #6d7a71);
      margin-top: 2px;
    }
  `],
  template: `
    <app-shell pageTitle="Paiement" [narrow]="true">

      <!-- En-tête de page -->
      <section class="page-head">
        <div>
          <h1>Paiement sécurisé</h1>
          <p>Finalisez la transaction pour lancer la course.</p>
        </div>
        <a [routerLink]="['/chat', roomId]" class="btn btn-secondary btn-sm">
          <svg lucideArrowLeft size="15"></svg> Retour
        </a>
      </section>

      <!-- ── Récapitulatif ── -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:1rem;color:var(--text,#15241f);margin-bottom:16px">
          <svg lucideFileText size="18" style="color:var(--primary,#17634f)"></svg>
          Récapitulatif de l'offre
        </div>

        <!-- Encart vigilance -->
        <div style="background:var(--cc-warning-bg,#fff3dc);color:var(--text,#15241f);padding:12px;border-radius:8px;font-size:0.85rem;margin-bottom:16px;display:flex;gap:10px;border:1px solid rgba(166,107,22,0.2)">
          <svg lucideAlertTriangle size="18" style="color:var(--cc-warning,#a66b16);flex-shrink:0"></svg>
          <span><strong>Vigilance :</strong> Ne saisissez que le montant exact convenu dans le chat. Si un coursier vous demande de modifier ce montant hors plateforme, signalez-le immédiatement.</span>
        </div>

        <!-- Frais réels (saisis par le client) -->
        <div class="invoice-line">
          <span>Frais réels (achats convenus avec le coursier) *</span>
          <div class="frais-input">
            <input
              type="number"
              class="form-input"
              [(ngModel)]="fraisReels"
              (ngModelChange)="updateTotals()"
              placeholder="Ex: 15000"
              min="0"
              step="100"
            />
            <span>XAF</span>
          </div>
        </div>

        <!-- Tarif coursier (read-only) -->
        <div class="invoice-line" style="margin-top:12px">
          <span>Tarif du coursier (fixé dans le chat) :</span>
          <span style="font-weight:600;">{{ tarifCoursier | number:'1.0-0' }} XAF</span>
        </div>

        <!-- Frais de service -->
        @if (fraisService > 0) {
          <div class="invoice-line">
            <span>Frais de service ({{ feeRate }}%) :</span>
            <span>{{ fraisService | number:'1.0-0' }} XAF</span>
          </div>
        }

        <!-- Total -->
        <div class="invoice-line total">
          <span>Total à payer :</span>
          <span>{{ total > 0 ? (total | number:'1.0-0') + ' XAF' : '—' }}</span>
        </div>
      </div>

      <!-- ── Note de sécurité Escrow ── -->
      <div class="security-note">
        <svg lucideShieldCheck size="18"></svg>
        <div>
          <strong>Protection Escrow (Frais de service {{ feeRate }}%) :</strong>
          Vos fonds sont bloqués en toute sécurité. Le coursier ne recevra l'argent
          qu'après votre validation de la livraison ou après 72h automatiquement.
        </div>
      </div>

      <!-- ── Méthode de paiement ── -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:1rem;color:var(--text,#15241f);margin-bottom:16px">
          <svg lucideCreditCard size="18" style="color:var(--primary,#17634f)"></svg>
          Méthode de paiement
        </div>

        <!-- Stripe -->
        <label class="payment-option" [class.selected]="selectedMethod === 'STRIPE'" (click)="selectMethod('STRIPE')">
          <input type="radio" name="payment" value="STRIPE" [checked]="selectedMethod === 'STRIPE'" />
          <div class="payment-icon" style="background:#635BFF;color:#fff">Stripe</div>
          <div class="payment-info">
            <div class="payment-name">Carte bancaire</div>
            <div class="payment-desc">Paiement international sécurisé</div>
          </div>
        </label>

        <!-- MTN -->
        <label class="payment-option" [class.selected]="selectedMethod === 'MTN'" (click)="selectMethod('MTN')">
          <input type="radio" name="payment" value="MTN" [checked]="selectedMethod === 'MTN'" />
          <div class="payment-icon" style="background:#FFCC00;color:#000">MTN</div>
          <div class="payment-info">
            <div class="payment-name">MTN Mobile Money</div>
            <div class="payment-desc">Paiement depuis votre compte MTN</div>
          </div>
        </label>

        <!-- Orange -->
        <label class="payment-option" [class.selected]="selectedMethod === 'ORANGE'" (click)="selectMethod('ORANGE')">
          <input type="radio" name="payment" value="ORANGE" [checked]="selectedMethod === 'ORANGE'" />
          <div class="payment-icon" style="background:#FF7900;color:#fff">Orange</div>
          <div class="payment-info">
            <div class="payment-name">Orange Money</div>
            <div class="payment-desc">Paiement depuis votre compte Orange</div>
          </div>
        </label>
      </div>

      <!-- ── Bouton Payer ── -->
      <div style="display:flex;flex-direction:column;gap:10px">
        <button
          class="btn btn-primary btn-lg"
          style="width:100%;justify-content:center;"
          [disabled]="!canPay() || isLoading"
          (click)="pay()"
        >
          <svg lucideLock size="17"></svg>
          @if (isLoading) {
            <span>Traitement en cours…</span>
          } @else if (total > 0) {
            <span>Payer {{ total | number:'1.0-0' }} XAF en toute sécurité</span>
          } @else {
            <span>Payer en toute sécurité</span>
          }
        </button>
      </div>

    </app-shell>
  `
})
export class PayComponent implements OnInit {

  /** ID de la salle de chat (passé dans l'URL : /client/pay/:roomId) */
  roomId = 0;
  /** ID de la course (récupéré depuis queryParams ou stocké localement) */
  courseId = 0;

  /** Tarif du coursier transmis depuis la carte d'offre du chat */
  tarifCoursier = 0;

  /** Frais réels saisis par le client */
  fraisReels: number | null = null;

  /** Résultats calculés */
  fraisService = 0;
  total = 0;
  readonly feeRate = CLIENT_FEE_RATE;

  /** Méthode sélectionnée */
  selectedMethod: PaymentMethod = 'STRIPE';

  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.roomId   = Number(this.route.snapshot.paramMap.get('roomId') ?? 0);
    this.courseId = Number(this.route.snapshot.queryParamMap.get('courseId') ?? 0);

    // Le montant de l'offre est transmis en queryParam depuis ChatComponent.acceptOffer()
    const amountParam = this.route.snapshot.queryParamMap.get('amount');
    this.tarifCoursier = amountParam ? Number(amountParam) : 0;
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
  }

  updateTotals(): void {
    const fr = this.fraisReels ?? 0;
    if (fr <= 0 || this.tarifCoursier <= 0) {
      this.fraisService = 0;
      this.total = 0;
      return;
    }
    const base = fr + this.tarifCoursier;
    this.fraisService = Math.round(base * CLIENT_FEE_RATE / 100);
    this.total = base + this.fraisService;
  }

  canPay(): boolean {
    return (this.fraisReels ?? 0) > 0 && this.tarifCoursier > 0 && this.total > 0;
  }

  pay(): void {
    if (!this.canPay() || !this.courseId) {
      if (!this.courseId) {
        this.toast.error('Course introuvable. Veuillez revenir depuis le chat.');
      }
      return;
    }

    this.isLoading = true;
    this.paymentService.initiate({
      courseId:      this.courseId,
      tarifCoursier: this.tarifCoursier,
      fraisReels:    this.fraisReels!,
      paymentMethod: this.selectedMethod,
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toast.success(`Paiement initié ! Réf : ${res.paymentRef}`);
        this.router.navigate(['/client/course-detail', res.courseId]);
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Erreur lors du paiement. Veuillez réessayer.');
      }
    });
  }
}
