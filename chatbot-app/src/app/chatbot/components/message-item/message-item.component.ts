import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { Message } from '../../models/message.interface';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-message-item',
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css'],
  standalone: false
})
export class MessageItemComponent implements OnInit, OnDestroy {
  @Input() message!: Message;

  isPlaying = false;
  isPaused = false;

  private destroy$ = new Subject<void>();

  constructor(public voiceService: VoiceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    combineLatest([
      this.voiceService.isSpeaking$,
      this.voiceService.isPaused$,
      this.voiceService.activeMessageId$
    ]).pipe(takeUntil(this.destroy$)).subscribe(([isSpeaking, isPaused, activeId]) => {
      const isActive = activeId === this.message.id;
      this.isPlaying = isActive && isSpeaking;
      this.isPaused = isActive && isPaused;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isUser(): boolean {
    return this.message.role === 'user';
  }

  get formattedTime(): string {
    return new Date(this.message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  playMessage(): void {
    if (this.isPaused) {
      this.voiceService.resume();
    } else {
      this.voiceService.speakMessage(this.message.id, this.message.content);
    }
  }

  pauseMessage(): void {
    this.voiceService.pause();
  }

  stopMessage(): void {
    this.voiceService.stop();
  }
}
