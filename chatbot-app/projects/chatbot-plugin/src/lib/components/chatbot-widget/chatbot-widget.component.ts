import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject } from '@angular/core';
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

  messages: SdkMessage[] = [];
  isLoading = false;
  isOpen = false;
  private nextId = -1;
  private subs = new Subscription();

  get title(): string { return this.config.title ?? 'AI Assistant'; }
  get isFloating(): boolean { return this.theme === 'floating'; }

  constructor(
    private cdr: ChangeDetectorRef,
    private actionRegistry: ActionRegistryService,
    private conversationService: SdkConversationService,
    private sdkChat: SdkChatService,
    public voiceService: SdkVoiceService,
    @Inject(PLUGIN_CONFIG) private config: PluginConfig
  ) {}

  ngOnInit(): void {
    if (!this.isFloating) this.isOpen = true;
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
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

    this.conversationService.ensureConversation().subscribe({
      next: (conversationId) => {
        const descriptors = this.actionRegistry.getActionDescriptors();
        const request = {
          conversationId,
          content,
          inputMethod,
          hostContext: Object.keys(this.context).length > 0 ? this.context : undefined,
          hostActions: descriptors.length > 0 ? descriptors : undefined
        };

        let accumulated = '';
        const streamSub = this.sdkChat.streamSdkMessage(request).subscribe({
          next: (chunk) => {
            accumulated += chunk;
            this.updateMessage(placeholderId, accumulated, true);
          },
          error: (err: Error) => {
            this.updateMessage(placeholderId, `Error: ${err.message}`, false, true);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          complete: () => {
            this.handleStreamComplete(placeholderId, accumulated);
          }
        });
        this.subs.add(streamSub);
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.addMessage({
          id: this.nextId--,
          role: 'assistant',
          content: `Error: ${err.message}`,
          inputMethod: 'text',
          timestamp: new Date().toISOString(),
          isError: true
        });
        this.cdr.detectChanges();
      }
    });
  }

  private handleStreamComplete(placeholderId: number, text: string): void {
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
            this.feedbackToAI(placeholderId, `Action result for ${name}: ${resultStr}`);
          }).catch((err: Error) => {
            this.feedbackToAI(placeholderId, `Action ${name} failed: ${err.message}`);
          });
          return;
        }
      } catch { /* fall through */ }
    }
    this.updateMessage(placeholderId, text, false);
    this.isLoading = false;
    if (this.config.enableVoice) {
      const msg = this.messages.find(m => m.id === placeholderId);
      if (msg) this.voiceService.speakMessage(msg.id, text);
    }
    this.cdr.detectChanges();
  }

  private feedbackToAI(placeholderId: number, feedback: string): void {
    this.updateMessage(placeholderId, '', true);
    this.conversationService.ensureConversation().subscribe(conversationId => {
      const descriptors = this.actionRegistry.getActionDescriptors();
      const request = {
        conversationId,
        content: feedback,
        inputMethod: 'text',
        hostContext: Object.keys(this.context).length > 0 ? this.context : undefined,
        hostActions: descriptors.length > 0 ? descriptors : undefined
      };
      let accumulated = '';
      this.sdkChat.streamSdkMessage(request).subscribe({
        next: (chunk) => {
          accumulated += chunk;
          this.updateMessage(placeholderId, accumulated, true);
        },
        error: (err: Error) => {
          this.updateMessage(placeholderId, `Error: ${err.message}`, false, true);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          this.updateMessage(placeholderId, accumulated, false);
          this.isLoading = false;
          if (this.config.enableVoice) {
            const msg = this.messages.find(m => m.id === placeholderId);
            if (msg) this.voiceService.speakMessage(msg.id, accumulated);
          }
          this.cdr.detectChanges();
        }
      });
    });
  }

  private addMessage(msg: SdkMessage): void {
    this.messages = [...this.messages, msg];
    this.cdr.detectChanges();
  }

  private updateMessage(id: number, content: string, isStreaming: boolean, isError = false): void {
    this.messages = this.messages.map(m =>
      m.id === id ? { ...m, content, isStreaming, isError } : m
    );
    this.cdr.detectChanges();
  }
}
