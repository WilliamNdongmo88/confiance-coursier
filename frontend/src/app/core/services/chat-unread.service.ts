import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * Messages non lus par conversation (pastille sur les boutons « Chat »).
 * Source : GET /api/chat/unread → { "<roomId>": nombre }. La conversation ouverte est marquée lue
 * (POST /api/chat/rooms/{id}/read) et la pastille disparaît aussitôt, sans attendre le serveur.
 */
@Injectable({ providedIn: 'root' })
export class ChatUnreadService {
  private http = inject(HttpClient);
  private readonly counts = signal<Record<number, number>>({});
  private lastFetch = 0;

  constructor() {
    // Retour sur l'onglet ou la fenêtre : les pastilles se mettent à jour tout de suite (sans attendre l'intervalle)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.refresh(true));
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.refresh(true); });
    }
  }

  /** Total des messages non lus (toutes conversations). */
  readonly total = computed(() => Object.values(this.counts()).reduce((a, b) => a + b, 0));

  count(roomId: number | null | undefined): number {
    return roomId ? this.counts()[roomId] ?? 0 : 0;
  }

  /** Nombre de conversations (parmi celles données) qui ont au moins un message non lu. */
  roomsWithUnread(roomIds: readonly number[] | null | undefined): number {
    if (!roomIds?.length) return 0;
    const c = this.counts();
    return roomIds.filter((id) => (c[id] ?? 0) > 0).length;
  }

  /** Total non lu sur plusieurs conversations (ex. tous les coursiers qui ont écrit sur une course). */
  sum(roomIds: readonly number[] | null | undefined): number {
    if (!roomIds?.length) return 0;
    const c = this.counts();
    return roomIds.reduce((t, id) => t + (c[id] ?? 0), 0);
  }

  /** Recharge les compteurs (au plus toutes les 10 s sauf `force`). */
  refresh(force = false): void {
    if (!force && Date.now() - this.lastFetch < 10_000) return;
    this.lastFetch = Date.now();
    this.http.get<Record<string, number>>('/api/chat/unread').subscribe({
      next: (res) => {
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(res ?? {})) next[Number(k)] = Number(v);
        this.counts.set(next);
      },
      error: () => { /* pastilles masquées si indisponible : non bloquant */ },
    });
  }

  markRead(roomId: number): void {
    if (!roomId) return;
    this.counts.update((c) => ({ ...c, [roomId]: 0 }));
    this.http.post(`/api/chat/rooms/${roomId}/read`, {}).subscribe({ error: () => {} });
  }
}
