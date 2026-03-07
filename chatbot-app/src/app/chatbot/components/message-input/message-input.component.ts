import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { VoiceService } from '../../services/voice.service';

export interface MessageSentEvent {
  content: string;
  inputMethod: string;
}

@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.css'],
  standalone: false
})
export class MessageInputComponent implements OnInit, OnDestroy {
  @Input() isLoading = false;
  @Output() messageSent = new EventEmitter<MessageSentEvent>();

  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  content = '';
  maxLength = 10000;
  isListening = false;
  isVoiceInput = false;

  private transcriptSub: Subscription | null = null;
  private listeningSub: Subscription | null = null;

  constructor(
    public voiceService: VoiceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.voiceService.sttSupported) {
      this.listeningSub = this.voiceService.isListening$.subscribe(val => {
        this.isListening = val;
        this.cdr.detectChanges();
      });
      this.transcriptSub = this.voiceService.transcript$.subscribe(text => {
        if (text) {
          this.content = text;
          this.isVoiceInput = true;
          this.autoResize();
          this.cdr.detectChanges();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.transcriptSub?.unsubscribe();
    this.listeningSub?.unsubscribe();
  }

  get charCount(): number {
    return this.content.length;
  }

  get isOverLimit(): boolean {
    return this.charCount > this.maxLength;
  }

  get canSend(): boolean {
    return this.content.trim().length > 0 && !this.isLoading && !this.isOverLimit;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onInput(): void {
    this.isVoiceInput = false;
    this.autoResize();
  }

  send(): void {
    if (!this.canSend) return;
    const trimmed = this.content.trim();
    const inputMethod = this.isVoiceInput ? 'voice' : 'text';
    this.messageSent.emit({ content: trimmed, inputMethod });
    this.content = '';
    this.isVoiceInput = false;
    if (this.voiceService.sttSupported) this.voiceService.stopListening();
    this.autoResize();
  }

  toggleRecording(): void {
    if (this.isListening) {
      this.voiceService.stopListening();
    } else {
      this.voiceService.transcript$.next('');
      this.content = '';
      this.isVoiceInput = false;
      this.voiceService.startListening();
    }
    this.cdr.detectChanges();
  }

  focus(): void {
    this.textAreaRef?.nativeElement.focus();
  }

  reset(): void {
    this.content = '';
    this.isVoiceInput = false;
    if (this.voiceService.sttSupported) this.voiceService.stopListening();
    this.autoResize();
  }

  autoResize(): void {
    const ta = this.textAreaRef?.nativeElement;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }
}
