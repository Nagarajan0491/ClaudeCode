import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Message } from '../../models/message.interface';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-message-item',
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageItemComponent implements OnInit, OnDestroy {
  @Input() message!: Message;

  isPlaying = false;
  isPaused = false;
  sourcesExpanded = true;

  private destroy$ = new Subject<void>();

  constructor(
    public voiceService: VoiceService,
    private cdr: ChangeDetectorRef
  ) {}

  get isUser(): boolean {
    return this.message.role === 'user';
  }

  get formattedTime(): string {
    return new Date(this.message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  ngOnInit(): void {
    this.voiceService.activeMessageId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (id !== this.message.id) {
        this.isPlaying = false;
        this.isPaused = false;
        this.cdr.detectChanges();
      }
    });

    this.voiceService.isSpeaking$.pipe(takeUntil(this.destroy$)).subscribe(speaking => {
      if (this.voiceService.activeMessageId$.value === this.message.id) {
        this.isPlaying = speaking;
        this.cdr.detectChanges();
      }
    });

    this.voiceService.isPaused$.pipe(takeUntil(this.destroy$)).subscribe(paused => {
      if (this.voiceService.activeMessageId$.value === this.message.id) {
        this.isPaused = paused;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  playMessage(): void {
    this.voiceService.speakMessage(this.message.id, this.message.content);
  }

  pauseMessage(): void {
    this.voiceService.pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.cdr.detectChanges();
  }

  stopMessage(): void {
    this.voiceService.stop();
    this.isPlaying = false;
    this.isPaused = false;
    this.cdr.detectChanges();
  }
}
