import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, PlatformRules } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideBellRing, LucideHourglass, LucideInfo, LucideTimer, LucideUndo2 } from '@lucide/angular';
import { SettingsTabsComponent } from '../settings-tabs/settings-tabs.component';

/** Bornes identiques à PlatformRulesService (serveur). */
export const RULE_LIMITS = { deadline: 168, reminder: 48, grace: 168, extensions: 5 };

/**
 * TICK-093 — Règles et délais (admin, Impeccable, mode Operate).
 * Remboursement des frais de service (litige remboursé en totalité, non-livraison) et délais des preuves.
 * Les textes disent honnêtement à quelles courses chaque changement s'applique.
 */
@Component({
  selector: 'app-admin-rules',
  standalone: true,
  imports: [FormsModule, SettingsTabsComponent, LucideBellRing, LucideHourglass, LucideInfo, LucideTimer, LucideUndo2],
  styles: [`
    :host { display: block; min-width: 0; --rm: #56635c; }
    :host-context([data-theme="dark"]) { --rm: #B0C0B7; }
    .r { max-width: 980px; margin: 0 auto; padding-bottom: 90px; }
    .r-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .r-head p { margin: 0 0 14px; font-size: 15px; color: var(--rm); }
    h2.sec { margin: 22px 0 4px; font-size: 17px; font-weight: 750; letter-spacing: -.02em; color: var(--cc-ink); }
    p.sec { margin: 0 0 12px; font-size: 13.5px; line-height: 1.45; color: var(--rm); }
    .rc { background: var(--cc-white); border: 1px solid var(--cc-line); border-radius: 16px; overflow: hidden; animation: r-in .45s cubic-bezier(.16,1,.3,1) both; }
    .rc + .rc { margin-top: 12px; }
    .item { display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-top: 1px solid var(--cc-line); }
    .item:first-child { border-top: 0; }
    .ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--cc-success-bg); color: var(--primary); }
    .txt { flex: 1; min-width: 0; }
    .txt h3 { margin: 0 0 3px; font-size: 15px; font-weight: 720; color: var(--cc-ink); }
    .txt p { margin: 0; font-size: 13px; line-height: 1.45; color: var(--rm); }
    .was { margin-top: 6px !important; font-size: 12.5px !important; }
    .was b { color: var(--cc-ink); }
    .err { margin-top: 6px !important; color: var(--cc-danger) !important; font-size: 12.5px !important; }
    .ctl { flex: none; display: flex; align-items: center; gap: 6px; padding-top: 2px; }
    .ctl input { width: 84px; min-height: 44px; padding: 0 10px; border: 1px solid var(--cc-line); border-radius: 10px; background: var(--cc-white);
      color: var(--cc-ink); font: inherit; font-size: 17px; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
    .ctl input[aria-invalid="true"] { border-color: var(--cc-danger); }
    .ctl input::-webkit-outer-spin-button, .ctl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .ctl input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
    .ctl span { font-size: 14px; font-weight: 650; color: var(--rm); min-width: 46px; }
    /* Interrupteur Oui / Non */
    .sw { position: relative; width: 52px; height: 30px; flex: none; border: 0; padding: 0; border-radius: 99px; background: var(--cc-line-2, #cfd8d1);
      cursor: pointer; transition: background .18s; }
    .sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .18s cubic-bezier(.16,1,.3,1); }
    .sw[aria-checked="true"] { background: var(--cc-forest); }
    .sw[aria-checked="true"]::after { transform: translateX(22px); }
    .sw:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .sw-l { font-size: 13px; font-weight: 700; color: var(--cc-ink); min-width: 28px; }
    .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 4px; border-radius: 12px; background: var(--cc-paper-2);
      border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .note svg { flex: none; margin-top: 1px; color: var(--primary); }
    .bar { position: sticky; bottom: 12px; z-index: 5; margin-top: 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px;
      background: var(--cc-forest); color: #fff; box-shadow: 0 12px 32px rgba(18,59,50,.25); animation: r-up .3s cubic-bezier(.16,1,.3,1); }
    .bar span { flex: 1 1 200px; font-size: 14px; }
    .bar button { min-height: 44px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
    .bar .ghost { border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; }
    .bar .save { border: 0; background: var(--cc-lime); color: #123b32; }
    .bar button:disabled { opacity: .5; cursor: not-allowed; }
    .sk { height: 180px; border-radius: 16px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: r-sk 1.2s linear infinite; }
    @keyframes r-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes r-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes r-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .r-head h1, :host-context([data-theme="dark"]) h2.sec, :host-context([data-theme="dark"]) .txt h3,
    :host-context([data-theme="dark"]) .was b, :host-context([data-theme="dark"]) .note, :host-context([data-theme="dark"]) .sw-l { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .ic, :host-context([data-theme="dark"]) .note { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .ic, :host-context([data-theme="dark"]) .note svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .ctl input { background: transparent; color: #F3F7F5; }
    :host-context([data-theme="dark"]) .sw { background: #3A5045; }
    :host-context([data-theme="dark"]) .sw[aria-checked="true"] { background: var(--cc-lime); }
    :host-context([data-theme="dark"]) .sw[aria-checked="true"]::after { background: #123b32; }
    :host-context([data-theme="dark"]) .bar { background: #0f2c25; border: 1px solid rgba(214,240,140,.25); }
    @media (max-width: 640px) {
      .item { flex-wrap: wrap; padding: 14px; }
      .ic { display: none; }
      .ctl { width: 100%; }
      .bar { bottom: 76px; } .bar button { flex: 1 1 auto; }
    }
    @media (prefers-reduced-motion: reduce) { .rc, .bar, .sk { animation: none; } .sw, .sw::after { transition: none; } }
  `],
  template: `
    <div class="r">
      <app-settings-tabs />
      <section class="r-head">
        <h1>Règles et délais</h1>
        <p>Ce qui se passe quand une course est remboursée ou quand les preuves tardent.</p>
      </section>

      @if (loading()) {
        <div class="sk"></div>
      } @else {
        <h2 class="sec">Remboursements</h2>
        <p class="sec">Les frais de service sont la part payée par le client en plus du tarif. Choisissez s’il les récupère.</p>
        <section class="rc" aria-label="Remboursements">
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideUndo2 size="18"></svg></span>
            <div class="txt">
              <h3 id="rf-full">Litige tranché en faveur du client</h3>
              <p>Quand un litige se termine par un remboursement total, le client récupère aussi les frais de service.</p>
              @if (saved() && saved()!.refundFeesOnFullRefund !== form().refundFeesOnFullRefund) { <p class="was">Enregistré : <b>{{ yesNo(saved()!.refundFeesOnFullRefund) }}</b></p> }
            </div>
            <div class="ctl">
              <button type="button" class="sw" role="switch" [attr.aria-checked]="form().refundFeesOnFullRefund" aria-labelledby="rf-full"
                      (click)="toggle('refundFeesOnFullRefund')"></button>
              <span class="sw-l" aria-hidden="true">{{ yesNo(form().refundFeesOnFullRefund) }}</span>
            </div>
          </div>
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideUndo2 size="18"></svg></span>
            <div class="txt">
              <h3 id="rf-noshow">Course non livrée</h3>
              <p>Quand le coursier n’envoie aucune preuve ni achat après le délai de grâce, la course est remboursée automatiquement, frais de service compris.</p>
              @if (saved() && saved()!.refundFeesOnNoShow !== form().refundFeesOnNoShow) { <p class="was">Enregistré : <b>{{ yesNo(saved()!.refundFeesOnNoShow) }}</b></p> }
            </div>
            <div class="ctl">
              <button type="button" class="sw" role="switch" [attr.aria-checked]="form().refundFeesOnNoShow" aria-labelledby="rf-noshow"
                      (click)="toggle('refundFeesOnNoShow')"></button>
              <span class="sw-l" aria-hidden="true">{{ yesNo(form().refundFeesOnNoShow) }}</span>
            </div>
          </div>
        </section>

        <h2 class="sec">Délais des preuves</h2>
        <p class="sec">Le coursier envoie ses preuves (vidéo, photos, reçus) avant une échéance fixée au paiement.</p>
        <div class="note" role="note"><svg lucideInfo size="16"></svg>
          <span>Une nouvelle échéance ne vaut que pour les courses payées après l’enregistrement. Le rappel, le délai de grâce et les prolongations s’appliquent aussi aux courses en cours.</span></div>
        <section class="rc" aria-label="Délais des preuves">
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideTimer size="18"></svg></span>
            <div class="txt">
              <h3><label for="r-deadline">Échéance des preuves</label></h3>
              <p>Comptée à partir du paiement, ou de la date prévue si elle est plus tardive. Entre 1 et {{ limits.deadline }} heures.</p>
              @if (errors().deadline) { <p class="err" id="r-deadline-err">{{ errors().deadline }}</p> }
              @else if (saved() && saved()!.proofDeadlineHours !== form().proofDeadlineHours) { <p class="was">Enregistré : <b>{{ hours(saved()!.proofDeadlineHours) }}</b></p> }
            </div>
            <label class="ctl"><input id="r-deadline" type="number" min="1" [max]="limits.deadline" step="1" inputmode="numeric"
                   [ngModel]="form().proofDeadlineHours" (ngModelChange)="set('proofDeadlineHours', $event)"
                   [attr.aria-invalid]="!!errors().deadline" [attr.aria-describedby]="errors().deadline ? 'r-deadline-err' : null"><span>heures</span></label>
          </div>
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideBellRing size="18"></svg></span>
            <div class="txt">
              <h3><label for="r-reminder">Rappel au coursier</label></h3>
              <p>Un email lui rappelle d’envoyer ses preuves, ce nombre d’heures avant l’échéance. Entre 1 et {{ limits.reminder }} heures, et plus court que l’échéance.</p>
              @if (errors().reminder) { <p class="err" id="r-reminder-err">{{ errors().reminder }}</p> }
              @else if (saved() && saved()!.reminderHoursBefore !== form().reminderHoursBefore) { <p class="was">Enregistré : <b>{{ hours(saved()!.reminderHoursBefore) }}</b></p> }
            </div>
            <label class="ctl"><input id="r-reminder" type="number" min="1" [max]="limits.reminder" step="1" inputmode="numeric"
                   [ngModel]="form().reminderHoursBefore" (ngModelChange)="set('reminderHoursBefore', $event)"
                   [attr.aria-invalid]="!!errors().reminder" [attr.aria-describedby]="errors().reminder ? 'r-reminder-err' : null"><span>heures</span></label>
          </div>
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideHourglass size="18"></svg></span>
            <div class="txt">
              <h3><label for="r-grace">Délai de grâce</label></h3>
              <p>Après l’échéance, la course passe « en retard ». Passé ce délai sans décision du client, elle est remboursée (aucune preuve ni achat) ou un litige s’ouvre. Entre 1 et {{ limits.grace }} heures.</p>
              @if (errors().grace) { <p class="err" id="r-grace-err">{{ errors().grace }}</p> }
              @else if (saved() && saved()!.overdueGraceHours !== form().overdueGraceHours) { <p class="was">Enregistré : <b>{{ hours(saved()!.overdueGraceHours) }}</b></p> }
            </div>
            <label class="ctl"><input id="r-grace" type="number" min="1" [max]="limits.grace" step="1" inputmode="numeric"
                   [ngModel]="form().overdueGraceHours" (ngModelChange)="set('overdueGraceHours', $event)"
                   [attr.aria-invalid]="!!errors().grace" [attr.aria-describedby]="errors().grace ? 'r-grace-err' : null"><span>heures</span></label>
          </div>
          <div class="item">
            <span class="ic" aria-hidden="true"><svg lucideTimer size="18"></svg></span>
            <div class="txt">
              <h3><label for="r-ext">Prolongations par le client</label></h3>
              <p>Nombre de fois où le client peut repousser l’échéance d’une course en retard (de 12 ou 24 heures). 0 pour aucune, {{ limits.extensions }} au plus.</p>
              @if (errors().extensions) { <p class="err" id="r-ext-err">{{ errors().extensions }}</p> }
              @else if (saved() && saved()!.maxExtensions !== form().maxExtensions) { <p class="was">Enregistré : <b>{{ saved()!.maxExtensions }}</b></p> }
            </div>
            <label class="ctl"><input id="r-ext" type="number" min="0" [max]="limits.extensions" step="1" inputmode="numeric"
                   [ngModel]="form().maxExtensions" (ngModelChange)="set('maxExtensions', $event)"
                   [attr.aria-invalid]="!!errors().extensions" [attr.aria-describedby]="errors().extensions ? 'r-ext-err' : null"><span>fois</span></label>
          </div>
        </section>

        @if (dirty()) {
          <div class="bar" role="region" aria-label="Modifications non enregistrées">
            <span>Modifications non enregistrées</span>
            <button type="button" class="ghost" (click)="reset()">Annuler</button>
            <button type="button" class="save" [disabled]="saving() || hasErrors()" (click)="save()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        }
      }
    </div>
  `,
})
export class AdminRulesComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly limits = RULE_LIMITS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal<PlatformRules | null>(null);
  readonly form = signal<PlatformRules>({
    refundFeesOnFullRefund: false, refundFeesOnNoShow: true, proofDeadlineHours: 24, reminderHoursBefore: 6, overdueGraceHours: 48, maxExtensions: 2,
  });

  /** Mêmes règles que PlatformRulesService.update. */
  readonly errors = computed(() => {
    const f = this.form();
    const e: { deadline?: string; reminder?: string; grace?: string; extensions?: string } = {};
    const int = (v: number) => Number.isInteger(v);
    if (!int(f.proofDeadlineHours) || f.proofDeadlineHours < 1 || f.proofDeadlineHours > RULE_LIMITS.deadline) e.deadline = `Entre 1 et ${RULE_LIMITS.deadline} heures.`;
    if (!int(f.reminderHoursBefore) || f.reminderHoursBefore < 1 || f.reminderHoursBefore > RULE_LIMITS.reminder) e.reminder = `Entre 1 et ${RULE_LIMITS.reminder} heures.`;
    else if (!e.deadline && f.reminderHoursBefore >= f.proofDeadlineHours) e.reminder = 'Le rappel doit partir avant l’échéance : choisissez une durée plus courte.';
    if (!int(f.overdueGraceHours) || f.overdueGraceHours < 1 || f.overdueGraceHours > RULE_LIMITS.grace) e.grace = `Entre 1 et ${RULE_LIMITS.grace} heures.`;
    if (!int(f.maxExtensions) || f.maxExtensions < 0 || f.maxExtensions > RULE_LIMITS.extensions) e.extensions = `Entre 0 et ${RULE_LIMITS.extensions}.`;
    return e;
  });
  readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);
  readonly dirty = computed(() => {
    const s = this.saved(), f = this.form();
    return !!s && (Object.keys(f) as (keyof PlatformRules)[]).some((k) => s[k] !== f[k]);
  });

  ngOnInit(): void {
    this.adminService.getPlatformRules().subscribe({
      next: (r) => { this.apply(r); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des règles.'); this.loading.set(false); },
    });
  }

  toggle(k: 'refundFeesOnFullRefund' | 'refundFeesOnNoShow'): void { this.form.update((f) => ({ ...f, [k]: !f[k] })); }

  set(k: 'proofDeadlineHours' | 'reminderHoursBefore' | 'overdueGraceHours' | 'maxExtensions', v: unknown): void {
    const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
    this.form.update((f) => ({ ...f, [k]: Number.isFinite(x) ? x : NaN }));
  }

  reset(): void { const s = this.saved(); if (s) this.form.set({ ...s }); }

  private apply(r: PlatformRules): void { this.saved.set({ ...r }); this.form.set({ ...r }); }

  save(): void {
    if (this.hasErrors()) return;
    this.saving.set(true);
    this.adminService.updatePlatformRules(this.form()).subscribe({
      next: (r) => { this.apply(r); this.saving.set(false); this.toast.success('Règles enregistrées. Le changement est noté dans l’historique.'); },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur lors de l’enregistrement.'); },
    });
  }

  yesNo(v: boolean): string { return v ? 'Oui' : 'Non'; }
  hours(v: number): string { return `${v} heure${v > 1 ? 's' : ''}`; }
}
