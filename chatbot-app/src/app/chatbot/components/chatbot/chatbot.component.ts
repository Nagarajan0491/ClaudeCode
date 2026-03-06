import { ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Conversation } from '../../models/conversation.interface';
import { Message } from '../../models/message.interface';
import { ChatService } from '../../services/chat.service';
import { ConversationService } from '../../services/conversation.service';
import { VoiceService } from '../../services/voice.service';
import { MessageInputComponent, MessageSentEvent } from '../message-input/message-input.component';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  standalone: false
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild(MessageInputComponent) messageInput?: MessageInputComponent;

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  isLoading = false;
  sidebarOpen = true;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private conversationService: ConversationService,
    private voiceService: VoiceService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.conversationService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(convs => {
        this.conversations = convs;
        this.cdr.detectChanges();
        if (!this.selectedConversation && convs.length > 0) {
          this.selectConversation(convs[0]);
        }
      });

    this.conversationService.getConversations().subscribe({
      error: () => this.showError('Failed to load conversations. Is the backend running?')
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.messageInput?.reset();
    if (conversation.messageCount === 0) {
      this.messages = [];
      return;
    }
    const targetId = conversation.id;
    this.conversationService.getConversation(conversation.id).subscribe({
      next: (conv) => {
        if (this.selectedConversation?.id !== targetId) return;
        this.messages = conv.messages || [];
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.selectedConversation?.id !== targetId) return;
        this.showError('Failed to load conversation messages.');
      }
    });
  }

  createConversation(): void {
    this.conversationService.createConversation().subscribe({
      next: (conv) => {
        this.selectConversation(conv);
        setTimeout(() => this.messageInput?.focus(), 0);
      },
      error: () => this.showError('Failed to create new conversation.')
    });
  }

  deleteConversation(id: number): void {
    this.conversationService.deleteConversation(id).subscribe({
      next: () => {
        if (this.selectedConversation?.id === id) {
          this.selectedConversation = null;
          this.messages = [];
          if (this.conversations.length > 0) {
            this.selectConversation(this.conversations[0]);
          }
        }
      },
      error: () => this.showError('Failed to delete conversation.')
    });
  }

  sendMessage(event: MessageSentEvent): void {
    const { content, inputMethod } = event;
    if (!this.selectedConversation || !content.trim()) return;

    if (!navigator.onLine) {
      this.showError('You are offline. Please check your internet connection.');
      return;
    }

    this.voiceService.stop();

    const conversationId = this.selectedConversation.id;
    const userMessage: Message = {
      id: Date.now(),
      conversationId,
      role: 'user',
      content,
      inputMethod,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    this.chatService.sendMessage(conversationId, content, inputMethod).subscribe({
      next: (response) => {
        if (this.selectedConversation?.id !== conversationId) return;
        const assistantMessage: Message = {
          id: response.id,
          conversationId: response.conversationId,
          role: 'assistant',
          content: response.content,
          inputMethod: 'text',
          timestamp: response.timestamp
        };
        this.messages.push(assistantMessage);
        this.isLoading = false;
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();

        if (this.voiceService.autoPlay$.value) {
          this.voiceService.speakMessage(assistantMessage.id, assistantMessage.content);
        }

        setTimeout(() => this.conversationService.getConversations().subscribe(), 0);
      },
      error: (err) => {
        if (this.selectedConversation?.id !== conversationId) return;
        this.isLoading = false;
        this.messages.pop();
        const errorMsg = err.status === 503
          ? 'Ollama is not running. Please start it with: ollama serve'
          : 'Failed to send message. Please try again.';
        this.showError(errorMsg);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
