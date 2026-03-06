import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
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

  private isVoiceInput = false;
  private transcriptSub?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(public voiceService: VoiceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.voiceService.isListening$.pipe(takeUntil(this.destroy$)).subscribe(val => {
      this.isListening = val;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.transcriptSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
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
    this.autoResize();
    if (!this.isListening) {
      this.isVoiceInput = false;
    }
  }

  toggleRecording(): void {
    if (this.isListening) {
      this.voiceService.stopListening();
      this.transcriptSub?.unsubscribe();
    } else {
      this.isVoiceInput = true;
      this.content = '';
      this.voiceService.startListening();
      this.transcriptSub = this.voiceService.transcript$.pipe(takeUntil(this.destroy$)).subscribe(text => {
        if (this.isListening) {
          this.content = text;
          this.autoResize();
          this.cdr.detectChanges();
        }
      });
    }
  }

  send(): void {
    if (!this.canSend) return;
    const trimmed = this.content.trim();
    const inputMethod = this.isVoiceInput ? 'voice' : 'text';
    this.messageSent.emit({ content: trimmed, inputMethod });
    this.content = '';
    this.isVoiceInput = false;
    this.transcriptSub?.unsubscribe();
    if (this.isListening) {
      this.voiceService.stopListening();
    }
    this.autoResize();
  }

  focus(): void {
    this.textAreaRef?.nativeElement.focus();
  }

  reset(): void {
    this.content = '';
    this.isVoiceInput = false;
    this.transcriptSub?.unsubscribe();
    if (this.isListening) {
      this.voiceService.stopListening();
    }
    this.autoResize();
  }

  autoResize(): void {
    const ta = this.textAreaRef?.nativeElement;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }
}
