import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SdkMessage } from '../../models/sdk-message.interface';
import { ActionRegistryService } from '../../services/action-registry.service';
import { SdkConversationService } from '../../services/sdk-conversation.service';
import { SdkChatService } from '../../services/sdk-chat.service';
import { SdkVoiceService } from '../../services/sdk-voice.service';
import { PLUGIN_CONFIG } from '../../tokens/plugin-config.token';
import { PluginConfig } from '../../models/plugin-config.interface';

@Component({
  selector: 'chatbot-widget',
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatbotWidgetComponent implements OnInit, OnDestroy {
  @Input() context: Record<string, string> = {};
  @Input() theme: 'floating' | 'inline' = 'floating';
  @Input() hostAppId: string = '';
  @Input() userId: string = '';
  @Input() enableHistory: boolean | null = null;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLElement>;

  messages: SdkMessage[] = [];
  isLoading = false;
  isOpen = false;
  private nextId = -1;
  private subs = new Subscription();

  get title(): string { return this.config.title ?? 'AI Assistant'; }
  get isFloating(): boolean { return this.theme === 'floating'; }
  get hasStreamingMessage(): boolean { return this.messages.some(m => m.isStreaming); }

  isSidebarOpen = false;
  conversations: Array<{ id: number; title: string; updatedAt: string }> = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private actionRegistry: ActionRegistryService,
    private conversationService: SdkConversationService,
    private sdkChat: SdkChatService,
    public voiceService: SdkVoiceService,
    @Inject(PLUGIN_CONFIG) private config: PluginConfig
  ) {}

  ngOnInit(): void {
    // Auto-enable history when userId is provided, unless host explicitly set enableHistory=false
    if (this.enableHistory !== false && this.userId) {
      this.enableHistory = true;
    } else if (this.enableHistory === null) {
      this.enableHistory = false;
    }

    if (!this.isFloating) {
      this.isOpen = true;
      if (this.userId) this.loadConversations();
    }
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    if (this.isSidebarOpen) this.loadConversations();
    this.cdr.detectChanges();
  }

  loadConversations(): void {
    if (!this.userId) { this.conversations = []; this.cdr.detectChanges(); return; }
    const sub = this.conversationService.listConversations(this.hostAppId || undefined, this.userId).subscribe({
      next: (list) => { this.conversations = list; this.cdr.detectChanges(); },
      error: () => { /* silent */ }
    });
    this.subs.add(sub);
  }

  selectConversation(id: number): void {
    if (this.isLoading) return;
    const sub = this.conversationService.loadConversation(id).subscribe({
      next: (conv) => {
        this.conversationService.setConversationId(conv.id);
        this.messages = (conv.messages || []).map((m: any, i: number) => ({
          id: -(i + 1000),
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          inputMethod: m.inputMethod || 'text',
          timestamp: m.timestamp,
          isStreaming: false,
          isError: false
        }));
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => { /* silent */ }
    });
    this.subs.add(sub);
  }

  startNewChat(): void {
    this.conversationService.setConversationId(null);
    this.messages = [];
    this.cdr.detectChanges();
  }

  get activeConvId(): number | null { return this.conversationService.getConversationId(); }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.userId) this.loadConversations();
    this.cdr.detectChanges();
  }

  trackById(_: number, msg: SdkMessage): number { return msg.id; }

  sendMessage(event: { content: string; inputMethod: string }): void {
    this.addMessage({
      id: this.nextId--,
      role: 'user',
      content: event.content,
      inputMethod: event.inputMethod,
      timestamp: new Date().toISOString()
    });
    this.streamMessage(event.content, event.inputMethod);
  }

  private streamMessage(content: string, inputMethod: string): void {
    this.isLoading = true;
    const placeholderId = this.nextId--;
    this.addMessage({
      id: placeholderId,
      role: 'assistant',
      content: '',
      inputMethod: 'text',
      timestamp: new Date().toISOString(),
      isStreaming: true
    });

    this.conversationService.ensureConversation(this.hostAppId || undefined, this.userId || undefined).subscribe({
      next: (conversationId) => {
        const descriptors = this.actionRegistry.getActionDescriptors();
        const request = {
          conversationId,
          content,
          inputMethod,
          hostContext: Object.keys(this.context).length > 0 ? this.context : undefined,
          hostActions: descriptors.length > 0 ? descriptors : undefined,
          hostAppId: this.hostAppId || undefined,
          userId: this.userId || undefined
        };

        let accumulated = '';
        const streamSub = this.sdkChat.streamSdkMessage(request).subscribe({
          next: (chunk) => {
            accumulated += chunk;
            const displayText = accumulated.replace(/\[TITLE\]:[^\[]*$/, '').trimEnd();
            this.updateMessage(placeholderId, displayText || accumulated, true);
          },
          error: (err: Error) => {
            this.updateMessage(placeholderId, `An error occurred. Please try again.`, false, true);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          complete: () => {
            // Extract and strip [TITLE]: sentinel
            const titleIdx = accumulated.indexOf('[TITLE]:');
            if (titleIdx !== -1) {
              const afterTitle = accumulated.slice(titleIdx + 8);
              const nextSentinel = afterTitle.search(/\[SOURCES\]:|$/);
              const extractedTitle = afterTitle.slice(0, nextSentinel).trim();
              if (extractedTitle && conversationId !== null) this.updateSidebarTitle(conversationId, extractedTitle);
              accumulated = accumulated.slice(0, titleIdx).trimEnd();
            }
            // Strip [SOURCES]: sentinel
            const sourcesIdx = accumulated.indexOf('[SOURCES]:');
            if (sourcesIdx !== -1) accumulated = accumulated.slice(0, sourcesIdx).trimEnd();
            if (!accumulated.trim()) {
              accumulated = "I couldn't generate a response. Please try again.";
            }
            this.handleStreamComplete(placeholderId, accumulated, inputMethod === 'voice');
          }
        });
        this.subs.add(streamSub);
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.addMessage({
          id: this.nextId--,
          role: 'assistant',
          content: `An error occurred. Please try again.`,
          inputMethod: 'text',
          timestamp: new Date().toISOString(),
          isError: true
        });
        this.cdr.detectChanges();
      }
    });
  }

  private handleStreamComplete(placeholderId: number, text: string, autoSpeak: boolean): void {
    const trimmed = text.trim();
    if (/^\s*\{"action_call"/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed) as { action_call: { name: string; parameters: Record<string, unknown> } };
        const { name, parameters } = parsed.action_call;
        const action = this.actionRegistry.getAction(name);
        if (action) {
          this.updateMessage(placeholderId, `[Executing ${name}...]`, true);
          Promise.resolve(action.execute(parameters)).then(result => {
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
            this.feedbackToAI(placeholderId, `Action result for ${name}: ${resultStr}`, autoSpeak);
          }).catch((err: Error) => {
            this.feedbackToAI(placeholderId, `Action ${name} failed: ${err.message}`, autoSpeak);
          });
          return;
        }
      } catch { /* fall through */ }
    }
    this.updateMessage(placeholderId, text, false);
    this.isLoading = false;
    if (this.config.enableVoice && autoSpeak) {
      const msg = this.messages.find(m => m.id === placeholderId);
      if (msg) this.voiceService.speakMessage(msg.id, text);
    }
    this.cdr.detectChanges();
  }

  private feedbackToAI(placeholderId: number, feedback: string, autoSpeak: boolean): void {
    this.updateMessage(placeholderId, '', true);
    const sub = this.conversationService.ensureConversation(this.hostAppId || undefined, this.userId || undefined).subscribe(conversationId => {
      const descriptors = this.actionRegistry.getActionDescriptors();
      const request = {
        conversationId,
        content: feedback,
        inputMethod: 'text',
        hostContext: Object.keys(this.context).length > 0 ? this.context : undefined,
        hostActions: descriptors.length > 0 ? descriptors : undefined,
        hostAppId: this.hostAppId || undefined,
        userId: this.userId || undefined
      };
      let accumulated = '';
      const streamSub = this.sdkChat.streamSdkMessage(request).subscribe({
        next: (chunk) => {
          accumulated += chunk;
          this.updateMessage(placeholderId, accumulated, true);
        },
        error: (err: Error) => {
          this.updateMessage(placeholderId, `An error occurred. Please try again.`, false, true);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          const titleIdx = accumulated.indexOf('[TITLE]:');
          if (titleIdx !== -1) {
            const afterTitle = accumulated.slice(titleIdx + 8);
            const nextSentinel = afterTitle.search(/\[SOURCES\]:|$/);
            const extractedTitle = afterTitle.slice(0, nextSentinel).trim();
            const cid = this.conversationService.getConversationId();
            if (extractedTitle && cid) this.updateSidebarTitle(cid, extractedTitle);
            accumulated = accumulated.slice(0, titleIdx).trimEnd();
          }
          const sourcesIdx = accumulated.indexOf('[SOURCES]:');
          if (sourcesIdx !== -1) accumulated = accumulated.slice(0, sourcesIdx).trimEnd();
          this.updateMessage(placeholderId, accumulated || "I couldn't generate a response. Please try again.", false);
          this.isLoading = false;
          if (this.config.enableVoice && autoSpeak) {
            const msg = this.messages.find(m => m.id === placeholderId);
            if (msg) this.voiceService.speakMessage(msg.id, accumulated);
          }
          this.cdr.detectChanges();
        }
      });
      this.subs.add(streamSub);
    });
    this.subs.add(sub);
  }

  private addMessage(msg: SdkMessage): void {
    this.messages = [...this.messages, msg];
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private updateMessage(id: number, content: string, isStreaming: boolean, isError = false): void {
    this.messages = this.messages.map(m =>
      m.id === id ? { ...m, content, isStreaming, isError } : m
    );
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private updateSidebarTitle(conversationId: number, title: string): void {
    const idx = this.conversations.findIndex(c => c.id === conversationId);
    if (idx !== -1) {
      this.conversations = [
        ...this.conversations.slice(0, idx),
        { ...this.conversations[idx], title },
        ...this.conversations.slice(idx + 1)
      ];
    } else {
      // New conversation not yet in the sidebar list — prepend it
      this.conversations = [
        { id: conversationId, title, updatedAt: new Date().toISOString() },
        ...this.conversations
      ];
    }
    this.cdr.detectChanges();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
