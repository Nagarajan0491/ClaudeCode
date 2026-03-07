import { ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Conversation } from '../../models/conversation.interface';
import { Message } from '../../models/message.interface';
import { ChatService } from '../../services/chat.service';
import { ConversationService } from '../../services/conversation.service';
import { VoiceService } from '../../services/voice.service';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { MessageInputComponent, MessageSentEvent } from '../message-input/message-input.component';
import { KnowledgeBaseManagementComponent } from '../knowledge-base-management/knowledge-base-management.component';

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
  voicePanelOpen = false;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private conversationService: ConversationService,
    private voiceService: VoiceService,
    private knowledgeBaseService: KnowledgeBaseService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.conversationService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(convs => {
        this.conversations = convs;
        if (this.selectedConversation) {
          const updated = convs.find(c => c.id === this.selectedConversation!.id);
          if (updated && updated.title !== this.selectedConversation.title) {
            this.selectedConversation = { ...this.selectedConversation, title: updated.title };
          }
        }
        if (!this.selectedConversation && convs.length > 0) {
          this.selectConversation(convs[0]);
        }
        this.cdr.detectChanges();
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

  goToAdmin(): void {
    this.router.navigate(['/admin']);
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

    const streamingMessageId = -(Date.now() + 1);
    const streamingMessage: Message = {
      id: streamingMessageId,
      conversationId,
      role: 'assistant',
      content: '',
      inputMethod: 'text',
      isStreaming: true,
      timestamp: new Date().toISOString()
    };
    this.messages.push(streamingMessage);
    this.cdr.detectChanges();

    this.chatService.streamMessage(conversationId, content, inputMethod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          if (this.selectedConversation?.id !== conversationId) return;
          const idx = this.messages.findIndex(m => m.id === streamingMessageId);
          if (idx !== -1) {
            this.messages[idx] = { ...this.messages[idx], content: this.messages[idx].content + chunk };
          }
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        },
        error: () => {
          if (this.selectedConversation?.id !== conversationId) return;
          this.isLoading = false;
          const idx = this.messages.findIndex(m => m.id === streamingMessageId);
          const errorMessage: Message = {
            id: -Date.now(),
            conversationId,
            role: 'assistant',
            content: 'Something went wrong while processing your request. Please try again.',
            inputMethod: 'text',
            isError: true,
            timestamp: new Date().toISOString()
          };
          if (idx !== -1) {
            this.messages[idx] = errorMessage;
          } else {
            this.messages.push(errorMessage);
          }
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        },
        complete: () => {
          if (this.selectedConversation?.id !== conversationId) return;
          this.isLoading = false;
          const idx = this.messages.findIndex(m => m.id === streamingMessageId);
          if (idx !== -1) {
            const sources = this.chatService.lastSources$.value;
            const finalMessage = {
              ...this.messages[idx],
              isStreaming: false,
              sources: sources.length > 0 ? sources : undefined
            };
            this.messages[idx] = finalMessage;
            this.shouldScrollToBottom = true;
            this.cdr.detectChanges();
            if (this.voiceService.autoPlay$.value && !finalMessage.isError) {
              this.voiceService.speakMessage(finalMessage.id, finalMessage.content);
            }
          }
          setTimeout(() => this.conversationService.getConversations().subscribe(), 0);
        }
      });
  }

  renameConversation(event: { id: number; title: string }): void {
    this.conversationService.renameConversation(event.id, event.title).subscribe({
      error: () => this.showError('Failed to rename conversation.')
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleVoicePanel(): void {
    this.voicePanelOpen = !this.voicePanelOpen;
    this.cdr.detectChanges();
  }

  closeVoicePanel(): void {
    this.voicePanelOpen = false;
    this.cdr.detectChanges();
  }

  openKnowledgeBase(): void {
    this.dialog.open(KnowledgeBaseManagementComponent, {
      width: '620px',
      maxHeight: '90vh'
    });
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
