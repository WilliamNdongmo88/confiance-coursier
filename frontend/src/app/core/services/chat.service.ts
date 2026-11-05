import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private stompClient: Client | null = null;
  private messageSubject = new Subject<any>();
  /** Refus renvoyés par le serveur sur /user/queue/errors (TICK-055). */
  private errorSubject = new Subject<string>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private currentRoomId: number | null = null;

  /** Erreurs métier du chat (message refusé, non participant…). */
  readonly errors$ = this.errorSubject.asObservable();

  connect(): void {
    if (this.stompClient?.active) {
      return;
    }
    this.stompClient = new Client({
      // Une nouvelle socket à chaque tentative (indispensable pour la reconnexion).
      webSocketFactory: () => new SockJS('http://localhost:8080/ws') as any,
      reconnectDelay: 5000,
      // TICK-055 : le serveur exige un jeton d'accès valide au CONNECT.
      // Le jeton est relu (et renouvelé s'il expire) avant chaque (re)connexion.
      beforeConnect: async () => {
        const token = await this.freshAccessToken();
        if (this.stompClient) {
          this.stompClient.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        }
      },
    });

    this.stompClient.onConnect = () => {
      this.connectionStatus.next(true);
      this.stompClient?.subscribe('/user/queue/errors', (message: IMessage) => {
        const body = JSON.parse(message.body);
        this.errorSubject.next(body?.message ?? 'Message refusé.');
      });
      if (this.currentRoomId !== null) {
        this.subscribeToRoomInternal(this.currentRoomId);
      }
    };

    this.stompClient.onWebSocketClose = () => this.connectionStatus.next(false);

    this.stompClient.onStompError = (frame) => {
      console.error('Erreur STOMP :', frame.headers['message']);
    };

    this.stompClient.activate();
  }

  subscribeToRoom(roomId: number): Observable<any> {
    this.currentRoomId = roomId;

    if (this.stompClient && this.stompClient.connected) {
      this.subscribeToRoomInternal(roomId);
    }

    return this.messageSubject.asObservable();
  }

  private subscribeToRoomInternal(roomId: number): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.subscribe(`/topic/chat/${roomId}`, (message: IMessage) => {
        this.messageSubject.next(JSON.parse(message.body));
      });
    }
  }

  /** L'expéditeur est déterminé par le serveur à partir du jeton (TICK-055). */
  sendMessage(roomId: number, content: string): boolean {
    return this.publish({ roomId, content, messageType: 'TEXT' });
  }

  sendOffer(roomId: number, offerAmount: number, content: string): boolean {
    return this.publish({ roomId, content, messageType: 'OFFER', offerAmount });
  }

  private publish(body: Record<string, unknown>): boolean {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({ destination: '/app/chat.send', body: JSON.stringify(body) });
      return true;
    }
    this.errorSubject.next('Connexion au chat indisponible. Réessayez dans quelques secondes.');
    return false;
  }

  disconnect(): void {
    this.currentRoomId = null;
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.connectionStatus.next(false);
  }

  /**
   * Renvoie un jeton d'accès utilisable : si le jeton courant expire dans moins de 30 s,
   * il est renouvelé via le refresh token (même persistance que l'intercepteur HTTP).
   */
  private async freshAccessToken(): Promise<string | null> {
    const token = this.auth.getToken();
    const refreshToken = this.auth.getRefreshToken();
    if (!token || !refreshToken || !this.expiresSoon(token)) {
      return token;
    }
    try {
      const res = await firstValueFrom(this.auth.refreshAccessToken(refreshToken));
      this.auth.saveToken(res.token, res.userId, res.role, res.fullName, res.refreshToken);
      return res.token;
    } catch {
      return token; // le CONNECT échouera ; l'intercepteur HTTP gérera la déconnexion
    }
  }

  private expiresSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 30_000;
    } catch {
      return true;
    }
  }

  // Charger l'historique depuis le backend
  getMessages(roomId: number): Observable<any[]> {
    return this.http.get<any[]>(`/api/chat/rooms/${roomId}/messages`);
  }

  // Charger les infos de la room (clientId/Name, courierId/Name, courseId)
  getRoomInfo(roomId: number): Observable<any> {
    return this.http.get<any>(`/api/chat/rooms/${roomId}`);
  }
}
