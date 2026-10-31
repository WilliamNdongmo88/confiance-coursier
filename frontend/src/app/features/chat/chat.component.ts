import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { LucideSend, LucideArrowLeft } from '@lucide/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, CommonModule, RouterLink, LucideSend, LucideArrowLeft],
  template: `
    <div class="min-h-screen bg-[#f7f8f5] flex flex-col h-screen">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <a routerLink="/" class="text-gray-500 hover:text-[#123b32]">
          <svg lucideArrowLeft size="20"></svg>
        </a>
        <div class="flex-1">
          <h1 class="font-bold text-[#15241f]">Chat de la course #{{ roomId }}</h1>
          <p class="text-xs text-gray-500">
            Connecté en tant que <span class="font-bold text-[#123b32]">{{ userRole }}</span>
          </p>
        </div>
      </header>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        @for (msg of messages; track msg.id) {
          <div [class]="msg.senderId === currentUserId ? 'flex justify-end' : 'flex justify-start'">
            <div [class]="msg.senderId === currentUserId
              ? 'bg-[#123b32] text-white px-4 py-2 rounded-xl rounded-br-sm max-w-[70%]'
              : 'bg-white text-[#15241f] px-4 py-2 rounded-xl rounded-bl-sm max-w-[70%] shadow-sm'">
              <div class="text-sm">{{ msg.content }}</div>
              <div [class]="msg.senderId === currentUserId ? 'text-xs text-gray-300 mt-1' : 'text-xs text-gray-400 mt-1'">
                {{ msg.createdAt | date:'HH:mm' }}
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="bg-white border-t border-gray-200 p-4">
        <div class="flex gap-2 max-w-4xl mx-auto">
          <input type="text" [(ngModel)]="newMessage" (keyup.enter)="sendMessage()"
            class="flex-1 px-4 py-3 border border-gray-200 rounded-full outline-none focus:border-[#123b32]"
            placeholder="Écrivez votre message...">
          <button (click)="sendMessage()" class="w-12 h-12 bg-[#123b32] text-white rounded-full flex items-center justify-center hover:bg-[#1b5144]">
            <svg lucideSend size="20"></svg>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy {
  roomId = 0;
  currentUserId = 0;
  userRole = '';
  messages: any[] = [];
  newMessage = '';
  private chatSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.roomId = Number(this.route.snapshot.paramMap.get('roomId'));
    this.currentUserId = this.authService.getCurrentUserId();
    this.userRole = this.authService.getCurrentUserRole(); // Récupère le rôle

    // 1. Charger l'historique depuis le backend
    this.chatService.getMessages(this.roomId).subscribe({
      next: (history) => {
        this.messages = history;
      }
    });

    // 2. Se connecter au WebSocket
    this.chatService.connect();

    // 3. S'abonner aux nouveaux messages
    this.chatSubscription = this.chatService.subscribeToRoom(this.roomId).subscribe({
      next: (msg) => {
        // Évite les doublons (si le message a déjà été ajouté par l'historique)
        if (!this.messages.find(m => m.id === msg.id)) {
          this.messages.push(msg);
        }
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.roomId, this.currentUserId, this.newMessage);
    this.newMessage = '';
  }

  ngOnDestroy() {
    this.chatSubscription?.unsubscribe();
    this.chatService.disconnect();
  }
}
