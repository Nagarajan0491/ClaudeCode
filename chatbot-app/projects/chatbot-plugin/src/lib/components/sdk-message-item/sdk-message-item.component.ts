import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SdkMessage } from '../../models/sdk-message.interface';
import { SdkVoiceService } from '../../services/sdk-voice.service';

@Component({
  selector: 'cp-message-item',
  templateUrl: './sdk-message-item.component.html',
  styleUrls: ['./sdk-message-item.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdkMessageItemComponent implements OnInit, OnDestroy {
  @Input() message!: SdkMessage;

  isPlaying = false;
  isPaused = false;

  private destroy$ = new Subject<void>();

  constructor(
    public voiceService: SdkVoiceService,
    private cdr: ChangeDetectorRef
  ) {}

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
