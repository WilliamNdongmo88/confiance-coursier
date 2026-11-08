import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, PayoutSettingsResponse } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LucideBuilding2, LucideCheck, LucideInfo } from '@lucide/angular';
import { SettingsTabsComponent } from '../settings-tabs/settings-tabs.component';

type Method = 'MTN' | 'ORANGE' | 'BANK';
interface Form {
  mtnNumber: string; mtnName: string; orangeNumber: string; orangeName: string;
  bankIban: string; bankName: string; bankAccountName: string; preferredMethod: Method | null;
}

const EMPTY: Form = { mtnNumber: '', mtnName: '', orangeNumber: '', orangeName: '', bankIban: '', bankName: '', bankAccountName: '', preferredMethod: null };
const PHONE = /^[+]?[0-9 ]{8,20}$/;
const IBAN = /^[A-Za-z0-9 ]{10,50}$/;

/**
 * Comptes de reversement de l'admin (Impeccable, mode Operate).
 * Simple mémo des comptes sur lesquels l'admin envoie à la main les gains de la plateforme : rien n'est transmis
 * ni versé automatiquement. Un champ vidé est effacé ; le compte principal doit être renseigné (contrôlé aussi par le serveur).
 */
@Component({
  selector: 'app-admin-payout-settings',
  standalone: true,
  imports: [FormsModule, SettingsTabsComponent, LucideBuilding2, LucideCheck, LucideInfo],
  styles: [`
    :host { display: block; min-width: 0; --pm: #56635c; }
    :host-context([data-theme="dark"]) { --pm: #B0C0B7; }
    .p { max-width: 900px; margin: 0 auto; padding-bottom: 90px; }
    .p-head h1 { margin: 0 0 6px; font-size: clamp(26px, 4vw, 32px); line-height: 1.1; letter-spacing: -.04em; font-weight: 800; color: var(--cc-ink); }
    .p-head p { margin: 0 0 14px; font-size: 15px; color: var(--pm); }
    .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 18px; border-radius: 12px; background: var(--cc-paper-2); border: 1px solid var(--cc-line); font-size: 13.5px; line-height: 1.45; color: var(--cc-ink); }
    .note svg { flex: none; margin-top: 1px; color: var(--primary); }
    .acc { background: var(--cc-white); border: 1.5px solid var(--cc-line); border-radius: 16px; padding: 18px; margin-bottom: 14px; transition: border-color .2s, box-shadow .2s; animation: p-in .45s cubic-bezier(.16,1,.3,1) both; }
    .acc:nth-child(2) { animation-delay: .05s; } .acc:nth-child(3) { animation-delay: .1s; }
    .acc.main { border-color: var(--primary); box-shadow: 0 8px 24px rgba(18,59,50,.08); }
    .acc-h { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
    .logo { flex: none; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-weight: 900; font-size: 13px; }
    .logo.mtn { background: #ffcc00; color: #1a1a1a; } .logo.om { background: #ff7900; color: #fff; } .logo.bank { background: var(--cc-paper-2); color: var(--pm); }
    .acc-t { flex: 1 1 160px; min-width: 0; }
    .acc-t b { display: block; font-size: 16px; font-weight: 750; color: var(--cc-ink); }
    .acc-t span { display: block; margin-top: 2px; font-size: 12.5px; color: var(--pm); }
    .acc-t span.ok { color: var(--cc-success); font-weight: 650; }
    .pick { min-height: 40px; padding: 0 14px; border-radius: 99px; border: 1px solid var(--cc-line); background: var(--cc-white); color: var(--cc-ink); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .pick.on { border-color: transparent; background: var(--primary); color: #fff; }
    .pick:disabled { opacity: .5; cursor: not-allowed; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
    .f { display: grid; gap: 6px; min-width: 0; }
    .f + .row, .row + .f { margin-top: 12px; }
    .f label { font-size: 13.5px; font-weight: 700; color: var(--cc-ink); }
    .f .err { font-size: 12.5px; color: var(--cc-danger); }
    .f input.bad { border-color: var(--cc-danger); }
    .bar { position: sticky; bottom: 12px; z-index: 5; margin-top: 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px;
      background: var(--cc-forest); color: #fff; box-shadow: 0 12px 32px rgba(18,59,50,.25); animation: p-up .3s cubic-bezier(.16,1,.3,1); }
    .bar span { flex: 1 1 200px; font-size: 14px; }
    .bar button { min-height: 44px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 750; cursor: pointer; }
    .bar .ghost { border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; }
    .bar .save { border: 0; background: var(--cc-lime); color: #123b32; }
    .bar button:disabled { opacity: .5; cursor: not-allowed; }
    .sk { height: 170px; border-radius: 16px; margin-bottom: 14px; background: linear-gradient(90deg, var(--cc-paper-2), var(--cc-white), var(--cc-paper-2)); background-size: 200% 100%; animation: p-sk 1.2s linear infinite; }
    @keyframes p-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes p-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @keyframes p-sk { to { background-position: -200% 0; } }
    :host-context([data-theme="dark"]) .p-head h1, :host-context([data-theme="dark"]) .acc-t b, :host-context([data-theme="dark"]) .f label,
    :host-context([data-theme="dark"]) .note { color: #F3F7F5 !important; }
    :host-context([data-theme="dark"]) .note, :host-context([data-theme="dark"]) .logo.bank { background: rgba(255,255,255,.05); }
    :host-context([data-theme="dark"]) .note svg { color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .acc.main { border-color: var(--cc-lime); }
    :host-context([data-theme="dark"]) .pick.on { background: var(--cc-lime); color: #123b32; }
    :host-context([data-theme="dark"]) .acc-t span.ok { color: #9FDDB4; }
    :host-context([data-theme="dark"]) .bar { background: #0f2c25; border: 1px solid rgba(214,240,140,.25); }
    @media (max-width: 640px) {
      .acc { padding: 16px 14px; }
      .row { grid-template-columns: minmax(0, 1fr); }
      .pick { width: 100%; justify-content: center; }
      .bar { bottom: 76px; } .bar button { flex: 1 1 auto; }
    }
    @media (prefers-reduced-motion: reduce) { .acc, .bar, .sk { animation: none; } }
  `],
  template: `
    <div class="p">
      <app-settings-tabs />
      <section class="p-head">
        <h1>Comptes de reversement</h1>
        <p>Les comptes sur lesquels vous envoyez les gains de la plateforme.</p>
      </section>

      <div class="note" role="note"><svg lucideInfo size="16"></svg>
        <span>Un simple mémo pour vos virements manuels : la plateforme n’envoie aucun argent automatiquement et ne transmet ces coordonnées à personne.</span></div>

      @if (loading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else {
        <section class="acc" [class.main]="f().preferredMethod === 'MTN'" aria-labelledby="a-mtn">
          <div class="acc-h">
            <span class="logo mtn" aria-hidden="true">MTN</span>
            <div class="acc-t"><b id="a-mtn">MTN Mobile Money</b><span [class.ok]="filled('MTN')">{{ filled('MTN') ? 'Renseigné' : 'Non renseigné' }}</span></div>
            <button type="button" class="pick" [class.on]="f().preferredMethod === 'MTN'" [attr.aria-pressed]="f().preferredMethod === 'MTN'" [disabled]="!filled('MTN')" (click)="set('preferredMethod', 'MTN')">
              @if (f().preferredMethod === 'MTN') { <svg lucideCheck size="15"></svg> Compte principal } @else { Choisir comme principal }</button>
          </div>
          <div class="row">
            <div class="f"><label for="mtn-n">Numéro</label>
              <input id="mtn-n" class="form-input" type="tel" inputmode="tel" autocomplete="off" placeholder="+237 6XX XXX XXX" maxlength="30" [class.bad]="err().mtnNumber" [ngModel]="f().mtnNumber" (ngModelChange)="set('mtnNumber', $event)">
              @if (err().mtnNumber) { <span class="err">{{ err().mtnNumber }}</span> }</div>
            <div class="f"><label for="mtn-name">Nom du titulaire</label>
              <input id="mtn-name" class="form-input" type="text" autocomplete="off" placeholder="Tel qu’affiché par MTN" maxlength="100" [ngModel]="f().mtnName" (ngModelChange)="set('mtnName', $event)"></div>
          </div>
        </section>

        <section class="acc" [class.main]="f().preferredMethod === 'ORANGE'" aria-labelledby="a-om">
          <div class="acc-h">
            <span class="logo om" aria-hidden="true">OM</span>
            <div class="acc-t"><b id="a-om">Orange Money</b><span [class.ok]="filled('ORANGE')">{{ filled('ORANGE') ? 'Renseigné' : 'Non renseigné' }}</span></div>
            <button type="button" class="pick" [class.on]="f().preferredMethod === 'ORANGE'" [attr.aria-pressed]="f().preferredMethod === 'ORANGE'" [disabled]="!filled('ORANGE')" (click)="set('preferredMethod', 'ORANGE')">
              @if (f().preferredMethod === 'ORANGE') { <svg lucideCheck size="15"></svg> Compte principal } @else { Choisir comme principal }</button>
          </div>
          <div class="row">
            <div class="f"><label for="om-n">Numéro</label>
              <input id="om-n" class="form-input" type="tel" inputmode="tel" autocomplete="off" placeholder="+237 6XX XXX XXX" maxlength="30" [class.bad]="err().orangeNumber" [ngModel]="f().orangeNumber" (ngModelChange)="set('orangeNumber', $event)">
              @if (err().orangeNumber) { <span class="err">{{ err().orangeNumber }}</span> }</div>
            <div class="f"><label for="om-name">Nom du titulaire</label>
              <input id="om-name" class="form-input" type="text" autocomplete="off" placeholder="Tel qu’affiché par Orange" maxlength="100" [ngModel]="f().orangeName" (ngModelChange)="set('orangeName', $event)"></div>
          </div>
        </section>

        <section class="acc" [class.main]="f().preferredMethod === 'BANK'" aria-labelledby="a-bank">
          <div class="acc-h">
            <span class="logo bank" aria-hidden="true"><svg lucideBuilding2 size="19"></svg></span>
            <div class="acc-t"><b id="a-bank">Compte bancaire</b><span [class.ok]="filled('BANK')">{{ filled('BANK') ? 'Renseigné' : 'Non renseigné' }}</span></div>
            <button type="button" class="pick" [class.on]="f().preferredMethod === 'BANK'" [attr.aria-pressed]="f().preferredMethod === 'BANK'" [disabled]="!filled('BANK')" (click)="set('preferredMethod', 'BANK')">
              @if (f().preferredMethod === 'BANK') { <svg lucideCheck size="15"></svg> Compte principal } @else { Choisir comme principal }</button>
          </div>
          <div class="f"><label for="iban">IBAN ou RIB</label>
            <input id="iban" class="form-input" type="text" autocomplete="off" spellcheck="false" placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX" maxlength="50" [class.bad]="err().bankIban" [ngModel]="f().bankIban" (ngModelChange)="set('bankIban', $event)">
            @if (err().bankIban) { <span class="err">{{ err().bankIban }}</span> }</div>
          <div class="row">
            <div class="f"><label for="bank">Banque</label>
              <input id="bank" class="form-input" type="text" autocomplete="off" placeholder="Nom de la banque" maxlength="100" [ngModel]="f().bankName" (ngModelChange)="set('bankName', $event)"></div>
            <div class="f"><label for="holder">Titulaire du compte</label>
              <input id="holder" class="form-input" type="text" autocomplete="off" placeholder="Nom du titulaire" maxlength="100" [ngModel]="f().bankAccountName" (ngModelChange)="set('bankAccountName', $event)"></div>
          </div>
        </section>

        @if (dirty()) {
          <div class="bar" role="region" aria-label="Modifications non enregistrées">
            <span>{{ invalid() ? invalidReason() : 'Modifications non enregistrées' }}</span>
            <button type="button" class="ghost" (click)="reset()">Annuler</button>
            <button type="button" class="save" [disabled]="saving() || invalid()" (click)="save()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        }
      }
    </div>
  `,
})
export class AdminPayoutSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  private readonly saved = signal<Form>({ ...EMPTY });
  readonly f = signal<Form>({ ...EMPTY });

  readonly err = computed(() => {
    const v = this.f();
    const e: Partial<Record<keyof Form, string>> = {};
    if (v.mtnNumber.trim() && !PHONE.test(v.mtnNumber.trim())) e.mtnNumber = 'Chiffres, espaces et + uniquement (8 à 20 caractères).';
    if (v.orangeNumber.trim() && !PHONE.test(v.orangeNumber.trim())) e.orangeNumber = 'Chiffres, espaces et + uniquement (8 à 20 caractères).';
    if (v.bankIban.trim() && !IBAN.test(v.bankIban.trim())) e.bankIban = 'Lettres, chiffres et espaces uniquement (10 à 50 caractères).';
    return e;
  });
  readonly dirty = computed(() => JSON.stringify(this.norm(this.f())) !== JSON.stringify(this.norm(this.saved())));
  readonly invalid = computed(() => Object.keys(this.err()).length > 0 || !!this.invalidReason());
  readonly invalidReason = computed(() => {
    if (Object.keys(this.err()).length) return 'Corrigez les champs signalés';
    const m = this.f().preferredMethod;
    return m && !this.filled(m) ? 'Le compte principal doit être renseigné' : '';
  });

  ngOnInit(): void {
    this.adminService.getPayoutSettings().subscribe({
      next: (s) => { this.apply(s); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des comptes.'); this.loading.set(false); },
    });
  }

  filled(m: Method): boolean {
    const v = this.f();
    return !!(m === 'MTN' ? v.mtnNumber : m === 'ORANGE' ? v.orangeNumber : v.bankIban).trim();
  }

  set<K extends keyof Form>(k: K, v: Form[K]): void {
    this.f.update((x) => {
      const n = { ...x, [k]: v ?? '' } as Form;
      // Un compte principal vidé n'est plus principal : on bascule sur un autre compte renseigné s'il y en a un
      if (n.preferredMethod && !this.filledIn(n, n.preferredMethod)) {
        n.preferredMethod = (['MTN', 'ORANGE', 'BANK'] as Method[]).find((m) => this.filledIn(n, m)) ?? null;
      }
      if (!n.preferredMethod) n.preferredMethod = (['MTN', 'ORANGE', 'BANK'] as Method[]).find((m) => this.filledIn(n, m)) ?? null;
      return n;
    });
  }

  reset(): void { this.f.set({ ...this.saved() }); }

  save(): void {
    if (this.invalid()) return;
    const v = this.norm(this.f());
    this.saving.set(true);
    // Chaîne vide = champ effacé côté serveur
    this.adminService.updatePayoutSettings({ ...v, preferredMethod: v.preferredMethod ?? '' }).subscribe({
      next: (s) => { this.apply(s); this.saving.set(false); this.toast.success('Comptes de reversement enregistrés.'); },
      error: (e) => { this.saving.set(false); this.toast.error(e?.error?.message ?? 'Erreur lors de l’enregistrement.'); },
    });
  }

  private filledIn(v: Form, m: Method): boolean { return !!(m === 'MTN' ? v.mtnNumber : m === 'ORANGE' ? v.orangeNumber : v.bankIban).trim(); }

  private apply(s: PayoutSettingsResponse): void {
    const m = s.preferredMethod;
    const v: Form = {
      mtnNumber: s.mtnNumber ?? '', mtnName: s.mtnName ?? '', orangeNumber: s.orangeNumber ?? '', orangeName: s.orangeName ?? '',
      bankIban: s.bankIban ?? '', bankName: s.bankName ?? '', bankAccountName: s.bankAccountName ?? '',
      preferredMethod: m === 'MTN' || m === 'ORANGE' || m === 'BANK' ? m : null,
    };
    // Une préférence enregistrée sans compte correspondant n'a pas de sens : on ne l'affiche pas
    if (v.preferredMethod && !this.filledIn(v, v.preferredMethod)) v.preferredMethod = null;
    this.saved.set({ ...v });
    this.f.set({ ...v });
  }

  private norm(v: Form): Form {
    const t = (x: string) => (x ?? '').trim();
    return { mtnNumber: t(v.mtnNumber), mtnName: t(v.mtnName), orangeNumber: t(v.orangeNumber), orangeName: t(v.orangeName),
      bankIban: t(v.bankIban), bankName: t(v.bankName), bankAccountName: t(v.bankAccountName), preferredMethod: v.preferredMethod };
  }
}
