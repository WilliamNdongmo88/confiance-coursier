import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private stompClient: Client | null = null;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private currentRoomId: number | null = null;

  // Injection de HttpClient
  constructor(private http: HttpClient) {}

  connect(): void {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      debug: (str) => console.log(str)
    });

    this.stompClient.onConnect = () => {
      console.log('✅ Connecté au WebSocket');
      this.connectionStatus.next(true);

      if (this.currentRoomId !== null) {
        this.subscribeToRoomInternal(this.currentRoomId);
      }
    };

    this.stompClient.onStompError = (frame) => {
      console.error('❌ Erreur STOMP:', frame.headers['message']);
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
      console.log(`📡 Abonné au topic /topic/chat/${roomId}`);
    }
  }

  sendMessage(roomId: number, senderId: number, content: string): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ roomId, senderId, content })
      });
    } else {
      console.error('❌ Impossible d\'envoyer : WebSocket non connecté');
    }
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }

  // Charger l'historique depuis le backend
  getMessages(roomId: number): Observable<any[]> {
    return this.http.get<any[]>(`/api/chat/rooms/${roomId}/messages`);
  }
}
