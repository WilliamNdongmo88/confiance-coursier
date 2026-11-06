import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page d'accueil publique — version provisoire (TICK-072), remplacée par la landing de TICK-079.
 * Un utilisateur connecté n'arrive jamais ici (guestGuard → son espace).
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--bg); }
    .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px 40px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
    .brand { font-weight: 800; font-size: 1.1rem; color: var(--primary); }
    h1 { font-size: 1.7rem; line-height: 1.25; margin: 0 0 12px; color: var(--text); }
    p.lead { color: var(--text-muted); margin: 0 0 28px; }
    .ctas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .ctas .btn { min-height: 48px; justify-content: center; }
    ol { padding-left: 20px; color: var(--text); line-height: 1.9; margin: 0 0 24px; }
    footer { display: flex; gap: 16px; font-size: .85rem; }
  `],
  template: `
    <div class="wrap">
      <header>
        <span class="brand">ConfianceCoursier</span>
        <a routerLink="/login" class="btn btn-secondary btn-sm">Connexion</a>
      </header>
      <h1>Vos courses au Cameroun, en toute confiance.</h1>
      <p class="lead">Un coursier vérifié fait vos achats et livraisons. Vous ne payez qu'une fois les preuves validées.</p>
      <div class="ctas">
        <a [routerLink]="['/register']" [queryParams]="{ role: 'CLIENT' }" class="btn btn-primary">Créer une course</a>
        <a [routerLink]="['/register']" [queryParams]="{ role: 'COURIER' }" class="btn btn-secondary">Devenir coursier</a>
      </div>
      <ol>
        <li>Décrivez votre course</li>
        <li>Payez : les fonds restent bloqués en séquestre</li>
        <li>Le coursier envoie ses preuves</li>
        <li>Vous validez, il est payé</li>
      </ol>
      <footer><a routerLink="/support">Support</a></footer>
    </div>
  `,
})
export class LandingComponent {}
