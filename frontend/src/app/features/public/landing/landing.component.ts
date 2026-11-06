import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Landing publique — reproduction de la page d'accueil de maquette-v2 (index.html).
 * Styles : feuille globale `assets/css/landing.css` (préfixée `.lp`) ; le mode sombre vient de refonte.css.
 * Écarts volontaires avec la maquette : pas de sélecteur de langue (aucune traduction), pas de lien
 * « Mentions légales » (page légale factice), pas de style inline.
 * Icônes : SVG Lucide statiques (et non les composants @lucide/angular) pour garder un bundle initial léger.
 * Un utilisateur connecté n'arrive jamais ici (guestGuard → son espace).
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'lp' },
  template: `
    <header class="site-nav">
      <div class="site-nav-inner">
        <a class="brand" routerLink="/">
          <span class="brand-mark"><svg class="lucide lucide-bike" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></span><span class="brand-name">ConfianceCoursier</span>
        </a>

        <nav class="public-links" [class.open]="menuOpen()" id="public-nav" aria-label="Navigation principale">
          <a href="#fonctionnement" (click)="closeMenu()">Comment ça marche</a>
          <a href="#confiance" (click)="closeMenu()">Notre engagement</a>
          <a routerLink="/support">Centre d’aide</a>
          <div class="mobile-controls">
            <span class="mobile-controls-label">Thème</span>
            <button class="mobile-theme" type="button" (click)="theme.toggleTheme()" aria-label="Changer de thème">
              @if (theme.isDarkMode()) { <svg class="lucide lucide-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> } @else { <svg class="lucide lucide-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg> }
            </button>
          </div>
          <a class="site-button mobile-menu-cta" routerLink="/register" [queryParams]="{ role: 'CLIENT' }">Créer un compte</a>
        </nav>

        <div class="nav-cta">
          <div class="nav-controls">
            <button class="theme-toggle" type="button" aria-label="Changer de thème" (click)="theme.toggleTheme()">
              @if (theme.isDarkMode()) { <svg class="lucide lucide-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> } @else { <svg class="lucide lucide-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg> }
            </button>
          </div>
          <a class="nav-login" routerLink="/login">Connexion</a>
          <button class="nav-toggle" type="button" (click)="menuOpen.set(!menuOpen())"
                  [attr.aria-expanded]="menuOpen()" aria-controls="public-nav"
                  [attr.aria-label]="menuOpen() ? 'Fermer la navigation' : 'Ouvrir la navigation'">
            @if (menuOpen()) { <svg class="lucide lucide-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> } @else { <svg class="lucide lucide-menu" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg> }
          </button>
          <a class="site-button" routerLink="/register" [queryParams]="{ role: 'CLIENT' }">Créer un compte <svg class="lucide lucide-arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
        </div>
      </div>
    </header>

    <main>
      <section class="hero-wrap">
        <div class="hero">
          <div class="hero-content">
            <h1>De l’autre côté du monde.<br><em>À vos côtés.</em></h1>
            <p class="hero-copy">Faites réaliser vos achats et démarches au Cameroun par un coursier vérifié. Suivez
              chaque étape, gardez la maîtrise de votre budget et payez sereinement.</p>
            <div class="hero-actions">
              <a class="site-button" routerLink="/register" [queryParams]="{ role: 'CLIENT' }">Confier une course <svg class="lucide lucide-arrow-right" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
              <a class="site-button site-button-outline" href="#fonctionnement">Découvrir le service</a>
            </div>
            <div class="hero-trust">
              <span class="hero-trust-icon"><svg class="lucide lucide-lock" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              <span><strong>Paiement sous séquestre</strong>Les fonds ne sont versés qu’après votre validation des preuves.</span>
            </div>
          </div>

          <div class="hero-visual">
            <div class="hero-photo" role="img" aria-label="Coursier à moto dans une rue au Cameroun"></div>
            <span class="photo-location"><svg class="lucide lucide-map-pin ico-12" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> Partout au Cameroun</span>
            <div class="photo-caption">
              <small>Un service de proximité, où que vous soyez</small>
              <strong>Votre confiance, notre priorité.</strong>
            </div>
            <div class="proof-card">
              <div class="proof-top">
                <span class="proof-icon"><svg class="lucide lucide-shield-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg></span>
                <span><strong>Course protégée</strong><small>Suivi & preuves à chaque étape</small></span>
              </div>
              <div class="proof-footer">
                <span><svg class="lucide lucide-lock ico-12" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Paiement sécurisé</span>
                <b>Vérifié</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="metric-strip" aria-label="Engagements de la plateforme">
        <div class="metric">
          <span class="metric-icon"><svg class="lucide lucide-badge-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12"/></svg></span>
          <div><strong>Coursiers vérifiés</strong><span>Identité contrôlée avant mission</span></div>
        </div>
        <div class="metric">
          <span class="metric-icon"><svg class="lucide lucide-wallet-cards" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11h3.75a2 2 0 0 1 1.6.8l.45.6a4 4 0 0 0 6.4 0l.45-.6a2 2 0 0 1 1.6-.8H21"/><path d="M3 7h18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg></span>
          <div><strong>Budget transparent</strong><span>Le coût est clair avant validation</span></div>
        </div>
        <div class="metric">
          <span class="metric-icon"><svg class="lucide lucide-message-square-text" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M7 7h8"/></svg></span>
          <div><strong>Suivi humain</strong><span>Échangez pendant toute la course</span></div>
        </div>
      </div>

      <section class="section" id="fonctionnement">
        <div class="section-inner">
          <div class="section-head">
            <h2>Vous gardez le lien.<br>Nous prenons le relais.</h2>
            <p>Un parcours lisible pour commander à distance sans perdre de vue ce qui compte.</p>
          </div>
          <div class="steps-grid">
            <article class="step-card">
              <div class="step-top"><span class="step-icon"><svg class="lucide lucide-clipboard-list" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></span><span class="step-num">ÉTAPE 01</span></div>
              <h3>Décrivez votre besoin</h3>
              <p>Précisez l’achat, le lieu, le délai et votre budget. Vous savez exactement ce qui est demandé.</p>
            </article>
            <article class="step-card">
              <div class="step-top"><span class="step-icon"><svg class="lucide lucide-user-round-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="m16 19 2 2 4-4"/></svg></span><span class="step-num">ÉTAPE 02</span></div>
              <h3>Choisissez votre coursier</h3>
              <p>Consultez les profils, échangez dans le chat et validez une proposition détaillée.</p>
            </article>
            <article class="step-card">
              <div class="step-top"><span class="step-icon"><svg class="lucide lucide-package-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22V12"/><path d="m16 17 2 2 4-4"/><path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753"/><path d="M3.29 7 12 12l8.71-5"/><path d="m7.5 4.27 8.997 5.148"/></svg></span><span class="step-num">ÉTAPE 03</span></div>
              <h3>Suivez et confirmez</h3>
              <p>Recevez les preuves de la course. Les fonds sont libérés après votre validation.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="trust-section" id="confiance">
        <div class="trust-inner">
          <div class="trust-copy">
            <h2>Une preuve à chaque étape. Pas de zone d’ombre.</h2>
            <p>ConfianceCoursier a été pensé pour que la distance ne soit jamais un frein à la transparence. Vous gardez
              le contrôle jusqu’à la fin de la mission.</p>
            <a class="site-button site-button-lime" routerLink="/support">En savoir plus <svg class="lucide lucide-arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>
          </div>
          <div class="trust-list">
            <div class="trust-item">
              <svg class="lucide lucide-id-card" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 19a4 4 0 00-8 0"/><path d="M16 10h2"/><path d="M16 14h2"/><circle cx="9" cy="12" r="3"/><rect x="2" y="5" width="20" height="14" rx="2"/></svg>
              <strong>Identité contrôlée</strong>
              <span>Chaque coursier passe par une vérification avant d’accepter des missions.</span>
            </div>
            <div class="trust-item">
              <svg class="lucide lucide-lock-keyhole" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>
              <strong>Fonds protégés</strong>
              <span>Le paiement reste sécurisé pendant la réalisation de la course.</span>
            </div>
            <div class="trust-item">
              <svg class="lucide lucide-camera" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/></svg>
              <strong>Preuves horodatées</strong>
              <span>Photos, reçus et éléments de suivi sont consultables dans votre espace.</span>
            </div>
            <div class="trust-item">
              <svg class="lucide lucide-life-buoy" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
              <strong>Assistance dédiée</strong>
              <span>En cas de désaccord, un canal de support reste accessible.</span>
            </div>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="cta-box">
          <div>
            <h2>Une course à confier au Cameroun ?</h2>
            <p>Pour vous ou pour un proche, organisez-la en quelques étapes simples.</p>
          </div>
          <a class="site-button" routerLink="/register" [queryParams]="{ role: 'CLIENT' }">Commencer maintenant <svg class="lucide lucide-arrow-right" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="brand-mark brand-mark-sm"><svg class="lucide lucide-bike" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></span> ConfianceCoursier
        </div>
        <div class="footer-links">
          <a routerLink="/support">FAQ</a>
          <a routerLink="/support">Support</a>
          <a routerLink="/conditions-utilisation">Conditions</a>
          <a routerLink="/confidentialite">Confidentialité</a>
        </div>
        <div class="footer-meta">
          <span class="footer-currency"><svg class="lucide lucide-circle-dollar-sign ico-13" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> Devise : XAF</span>
        </div>
        <span class="footer-copy">© 2026 ConfianceCoursier</span>
      </div>
    </footer>
  `,
})
export class LandingComponent {
  readonly theme = inject(ThemeService);
  /** Menu de navigation mobile (≤ 900 px). */
  readonly menuOpen = signal(false);

  closeMenu(): void { this.menuOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }
}
