import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing minimale (TICK-079 — wireframe PLAN_AMELIORATION §2.2).
 * Une seule page courte, sans image ni dépendance : chargée d'emblée (le reste de l'application est
 * en chargement à la demande) pour un premier affichage rapide sur mobile.
 * Un utilisateur connecté n'arrive jamais ici (guestGuard → son espace).
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--cc-paper); color: var(--cc-ink); }
    .wrap { max-width: 600px; margin: 0 auto; padding: 16px 16px 40px; }

    header { display: flex; justify-content: space-between; align-items: center; min-height: 56px; }
    .brand { font-weight: 800; font-size: 1.05rem; color: var(--primary); letter-spacing: -.02em; }

    .hero { padding: 40px 0 28px; }
    h1 { font-size: 1.9rem; line-height: 1.2; font-weight: 800; letter-spacing: -.03em; margin: 0 0 12px; }
    .lead { color: var(--text-muted); margin: 0 0 24px; line-height: 1.55; }
    .ctas { display: flex; flex-direction: column; gap: 12px; }
    .ctas .btn { min-height: 52px; justify-content: center; font-size: 1rem; }

    .steps { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 20px; }
    .step { background: var(--surface); border: 1px solid var(--cc-line); border-radius: 12px; padding: 14px; }
    .step-num {
      display: inline-flex; width: 26px; height: 26px; border-radius: 50%; align-items: center; justify-content: center;
      background: var(--cc-info-bg); color: var(--primary); font-weight: 800; font-size: .85rem; margin-bottom: 8px;
    }
    .step strong { display: block; font-size: .95rem; margin-bottom: 2px; }
    .step span { font-size: .82rem; color: var(--text-muted); line-height: 1.4; }

    .escrow {
      display: flex; gap: 10px; align-items: flex-start; padding: 14px; border-radius: 12px;
      background: var(--cc-info-bg); color: var(--cc-ink); font-size: .9rem; line-height: 1.5; margin-bottom: 28px;
    }

    h2 { font-size: 1.05rem; font-weight: 800; margin: 0 0 10px; }
    details { border-bottom: 1px solid var(--cc-line); }
    summary { cursor: pointer; min-height: 48px; display: flex; align-items: center; font-weight: 600; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: '+'; margin-left: auto; color: var(--text-muted); font-weight: 700; }
    details[open] summary::after { content: '−'; }
    details p { margin: 0 0 14px; color: var(--text-muted); line-height: 1.55; font-size: .9rem; }

    footer { display: flex; gap: 16px; margin-top: 28px; font-size: .9rem; }
    footer a { min-height: 44px; display: inline-flex; align-items: center; }

    @media (min-width: 640px) {
      h1 { font-size: 2.3rem; }
      .ctas { flex-direction: row; }
      .ctas .btn { flex: 1; }
      .steps { grid-template-columns: repeat(4, 1fr); }
    }
  `],
  template: `
    <div class="wrap">
      <header>
        <span class="brand">ConfianceCoursier</span>
        <a routerLink="/login" class="btn btn-secondary btn-sm">Connexion</a>
      </header>

      <main>
        <section class="hero">
          <h1>Vos courses au Cameroun, en toute confiance.</h1>
          <p class="lead">
            Un coursier à l'identité vérifiée fait vos achats et vos livraisons.
            Il n'est payé qu'une fois que vous avez validé ses preuves.
          </p>
          <div class="ctas">
            <a [routerLink]="['/register']" [queryParams]="{ role: 'CLIENT' }" class="btn btn-primary">Créer une course</a>
            <a [routerLink]="['/register']" [queryParams]="{ role: 'COURIER' }" class="btn btn-secondary">Devenir coursier</a>
          </div>
        </section>

        <section aria-labelledby="how">
          <h2 id="how">Comment ça marche</h2>
          <ol class="steps">
            <li class="step"><span class="step-num">1</span><strong>Décrivez</strong><span>Ce qu'il faut acheter ou livrer, où et quand.</span></li>
            <li class="step"><span class="step-num">2</span><strong>Payez</strong><span>Le montant reste bloqué tant que la course n'est pas validée.</span></li>
            <li class="step"><span class="step-num">3</span><strong>Preuves</strong><span>Le coursier envoie vidéo, photos et reçus.</span></li>
            <li class="step"><span class="step-num">4</span><strong>Validez</strong><span>Vous vérifiez, puis le coursier est payé.</span></li>
          </ol>
          <p class="escrow">
            <span aria-hidden="true">🔒</span>
            <span><strong>Paiement sous séquestre.</strong> Sans preuves, rien n'est versé au coursier.
              Vous avez 72 h après l'envoi des preuves pour valider ou ouvrir un litige ; passé ce délai, la course est validée automatiquement.</span>
          </p>
        </section>

        <section aria-labelledby="faq-title" id="faq">
          <h2 id="faq-title">Questions fréquentes</h2>
          <details>
            <summary>Que se passe-t-il si le coursier n'envoie pas ses preuves ?</summary>
            <p>Passé l'échéance, vous pouvez prolonger le délai, annuler et être remboursé, ou ouvrir un litige.
               Sans action de votre part, vous êtes remboursé automatiquement s'il n'a rien envoyé ni rien acheté ; sinon un litige est ouvert et un administrateur tranche.</p>
          </details>
          <details>
            <summary>Comment les coursiers sont-ils vérifiés ?</summary>
            <p>Chaque coursier envoie une pièce d'identité et un selfie. Il ne peut proposer de tarif
               qu'une fois son identité validée par notre équipe.</p>
          </details>
          <details>
            <summary>Quels moyens de paiement sont acceptés ?</summary>
            <p>MTN Mobile Money, Orange Money et carte bancaire.</p>
          </details>
        </section>
      </main>

      <footer>
        <a routerLink="/support">Support</a>
        <a routerLink="/login">J'ai déjà un compte</a>
      </footer>
    </div>
  `,
})
export class LandingComponent {}
