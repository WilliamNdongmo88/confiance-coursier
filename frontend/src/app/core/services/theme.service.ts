import { Injectable, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ThemeService — gère le thème clair/sombre de l'application.
 *
 * - La valeur initiale est lue depuis `localStorage` (clé `theme`), défaut `light`.
 * - Le thème est appliqué sur `<html data-theme="light|dark">` (convention maquette).
 * - `isDarkMode` est un signal réactif consommé par la topbar (toggle) et les sidebars.
 * - La persistance se fait dans `localStorage` (clé `theme`).
 *
 * Note : un script inline dans `index.html` applique le thème avant le boot Angular
 * afin d'éviter le flash de thème (FOUC).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Signal réactif — true en mode sombre. */
  readonly isDarkMode = signal<boolean>(false);

  private readonly storageKey = 'theme';

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.storageKey) || 'light';
      this.isDarkMode.set(saved === 'dark');
      this.applyTheme();
    }

    // Tient toujours le DOM en phase avec le signal (toggle depuis l'UI).
    effect(() => {
      this.applyTheme();
    });
  }

  /** Bascule entre clair et sombre, applique et persiste. */
  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
    this.persist();
  }

  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', this.isDarkMode() ? 'dark' : 'light');
    }
  }

  private persist(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, this.isDarkMode() ? 'dark' : 'light');
    }
  }
}
