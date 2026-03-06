import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-voice-settings',
  standalone: false,
  template: `
    <div class="voice-settings" *ngIf="ttsSupported">
      <mat-slide-toggle
        [checked]="autoPlay"
        (change)="onAutoPlayChange($event.checked)"
        class="autoplay-toggle"
      >
        Auto-play
      </mat-slide-toggle>
      <mat-select
        *ngIf="voices.length > 0"
        [(value)]="selectedVoiceIndex"
        (selectionChange)="onVoiceChange($event.value)"
        class="voice-select"
        placeholder="Voice"
      >
        <mat-option [value]="-1">Default voice</mat-option>
        <mat-option *ngFor="let voice of voices; let i = index" [value]="i">
          {{ voice.name }}
        </mat-option>
      </mat-select>
    </div>
  `,
  styles: [`
    .voice-settings {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
    }
    .autoplay-toggle {
      font-size: 13px;
    }
    .voice-select {
      width: 160px;
      font-size: 13px;
    }
  `]
})
export class VoiceSettingsComponent implements OnInit, OnDestroy {
  ttsSupported: boolean;
  autoPlay = false;
  voices: SpeechSynthesisVoice[] = [];
  selectedVoiceIndex = -1;

  private destroy$ = new Subject<void>();

  constructor(private voiceService: VoiceService, private cdr: ChangeDetectorRef) {
    this.ttsSupported = voiceService.ttsSupported;
  }

  ngOnInit(): void {
    this.voiceService.autoPlay$.pipe(takeUntil(this.destroy$)).subscribe(val => {
      this.autoPlay = val;
      this.cdr.detectChanges();
    });
    this.voiceService.voices$.pipe(takeUntil(this.destroy$)).subscribe(voices => {
      this.voices = voices;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAutoPlayChange(checked: boolean): void {
    this.voiceService.autoPlay$.next(checked);
  }

  onVoiceChange(index: number): void {
    this.selectedVoiceIndex = index;
    this.voiceService.selectedVoice = index >= 0 ? this.voices[index] : null;
  }
}
