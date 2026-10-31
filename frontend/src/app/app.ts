import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `
})
export class App {
  // Instancie le ThemeService au démarrage pour appliquer le thème persistant
  // et exposer le signal isDarkMode à toute l'application.
  private theme = inject(ThemeService);
}
