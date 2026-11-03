import {
  Component, Input, Output, EventEmitter,
  HostListener, OnChanges, SimpleChanges,
} from '@angular/core';
import { LucideX, LucideDownload, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'pdf';
  label?: string;
}

/**
 * Composant modal de prévisualisation media (images, vidéos, PDFs).
 *
 * Usage :
 * ```html
 * <app-media-viewer
 *   [items]="mediaItems"
 *   [activeIndex]="selectedIndex"
 *   [open]="isViewerOpen"
 *   (close)="isViewerOpen = false">
 * </app-media-viewer>
 * ```
 */
@Component({
  selector: 'app-media-viewer',
  standalone: true,
  imports: [LucideX, LucideDownload, LucideChevronLeft, LucideChevronRight],
  template: `
    @if (open && items.length > 0) {
      <!-- Backdrop -->
      <div class="mv-backdrop" (click)="onBackdropClick($event)">

        <!-- Toolbar -->
        <div class="mv-toolbar" (click)="$event.stopPropagation()">
          <span class="mv-label">{{ current.label || 'Aperçu' }}</span>
          <div class="mv-toolbar-actions">
            <a [href]="current.url" download target="_blank"
               class="mv-btn" title="Télécharger" (click)="$event.stopPropagation()">
              <svg lucideDownload size="18"></svg>
            </a>
            <button class="mv-btn mv-btn-close" (click)="close.emit()" title="Fermer">
              <svg lucideX size="20"></svg>
            </button>
          </div>
        </div>

        <!-- Contenu -->
        <div class="mv-content" (click)="$event.stopPropagation()">

          <!-- Flèche précédente -->
          @if (items.length > 1) {
            <button class="mv-nav mv-nav-prev"
                    (click)="prev()"
                    [disabled]="idx === 0">
              <svg lucideChevronLeft size="28"></svg>
            </button>
          }

          <!-- Media -->
          <div class="mv-media-wrap">
            @if (current.type === 'image') {
              <img [src]="current.url" [alt]="current.label || 'Image'"
                   class="mv-img" (click)="$event.stopPropagation()">
            }
            @if (current.type === 'video') {
              <video [src]="current.url" controls autoplay
                     class="mv-video" (click)="$event.stopPropagation()">
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            }
            @if (current.type === 'pdf') {
              <iframe [src]="current.url" class="mv-pdf"
                      title="Document PDF"></iframe>
            }
          </div>

          <!-- Flèche suivante -->
          @if (items.length > 1) {
            <button class="mv-nav mv-nav-next"
                    (click)="next()"
                    [disabled]="idx === items.length - 1">
              <svg lucideChevronRight size="28"></svg>
            </button>
          }
        </div>

        <!-- Indicateur points -->
        @if (items.length > 1) {
          <div class="mv-dots" (click)="$event.stopPropagation()">
            @for (item of items; track $index) {
              <button class="mv-dot" [class.mv-dot-active]="$index === idx"
                      (click)="goTo($index)"></button>
            }
          </div>
        }

      </div>
    }
  `,
  styles: [`
    /* ── Backdrop ── */
    .mv-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: rgba(0,0,0,.88);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      animation: mv-fade-in .18s ease;
    }
    @keyframes mv-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Toolbar ── */
    .mv-toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(0,0,0,.55);
      backdrop-filter: blur(6px);
    }
    .mv-label {
      font-size: .88rem;
      font-weight: 600;
      color: #e8ede8;
      letter-spacing: .01em;
    }
    .mv-toolbar-actions { display: flex; gap: 8px; }
    .mv-btn {
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(255,255,255,.08);
      color: #e8ede8;
      cursor: pointer;
      transition: background .15s;
      text-decoration: none;
    }
    .mv-btn:hover { background: rgba(255,255,255,.2); }
    .mv-btn-close { border-color: rgba(220,38,38,.5); }
    .mv-btn-close:hover { background: rgba(220,38,38,.35); }

    /* ── Zone contenu (occupe tout l'espace restant) ── */
    .mv-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 16px 64px;
    }

    /* ── Media ── */
    .mv-media-wrap {
      max-width: 100%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mv-img {
      max-width: 100%;
      max-height: calc(100vh - 130px);
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 8px 40px rgba(0,0,0,.6);
      animation: mv-zoom-in .2s ease;
    }
    .mv-video {
      max-width: 100%;
      max-height: calc(100vh - 130px);
      border-radius: 6px;
      box-shadow: 0 8px 40px rgba(0,0,0,.6);
    }
    .mv-pdf {
      width: min(840px, 100%);
      height: calc(100vh - 130px);
      border: none;
      border-radius: 6px;
    }
    @keyframes mv-zoom-in {
      from { transform: scale(.94); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }

    /* ── Navigation flèches ── */
    .mv-nav {
      position: absolute;
      top: 50%; transform: translateY(-50%);
      width: 44px; height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.2);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background .15s;
      z-index: 1;
    }
    .mv-nav:hover:not(:disabled) { background: rgba(255,255,255,.25); }
    .mv-nav:disabled { opacity: .3; cursor: default; }
    .mv-nav-prev { left: 10px; }
    .mv-nav-next { right: 10px; }

    /* ── Indicateur points ── */
    .mv-dots {
      flex-shrink: 0;
      display: flex;
      gap: 7px;
      justify-content: center;
      padding: 10px;
    }
    .mv-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,.3);
      border: none; cursor: pointer;
      transition: background .15s, transform .15s;
    }
    .mv-dot-active {
      background: #fff;
      transform: scale(1.25);
    }

    @media (max-width: 600px) {
      .mv-content { padding: 10px 48px; }
      .mv-nav { width: 36px; height: 36px; }
    }
  `],
})
export class MediaViewerComponent implements OnChanges {
  /** Liste des médias à afficher */
  @Input() items: MediaItem[] = [];
  /** Index du média affiché à l'ouverture */
  @Input() activeIndex = 0;
  /** Contrôle l'affichage de la modal */
  @Input() open = false;
  /** Émis quand l'utilisateur ferme la modal */
  @Output() close = new EventEmitter<void>();

  idx = 0;

  get current(): MediaItem {
    return this.items[this.idx] ?? this.items[0];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeIndex'] || changes['open']) {
      this.idx = this.activeIndex;
    }
  }

  prev(): void { if (this.idx > 0) this.idx--; }
  next(): void { if (this.idx < this.items.length - 1) this.idx++; }
  goTo(i: number): void { this.idx = i; }

  onBackdropClick(event: MouseEvent): void {
    // Ferme uniquement si clic direct sur le backdrop (pas sur le contenu)
    if ((event.target as HTMLElement).classList.contains('mv-backdrop')) {
      this.close.emit();
    }
  }

  /** Fermeture via Escape */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close.emit();
  }
}
