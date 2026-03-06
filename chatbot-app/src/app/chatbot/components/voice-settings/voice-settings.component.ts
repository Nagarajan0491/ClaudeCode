import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
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

      <button
        mat-stroked-button
        class="tamil-btn"
        (click)="onSelectTamilVoice()"
        title="Auto-select Tamil voice"
      >Tamil Voice</button>

      <div class="slider-group">
        <label>Speed: {{ voiceService.rate | number:'1.2-2' }}×</label>
        <input
          type="range" min="0.5" max="2" step="0.05"
          [value]="voiceService.rate"
          (input)="onRateChange($event)"
        />
      </div>

      <div class="slider-group">
        <label>Pitch: {{ voiceService.pitch | number:'1.2-2' }}×</label>
        <input
          type="range" min="0.5" max="2" step="0.05"
          [value]="voiceService.pitch"
          (input)="onPitchChange($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    .voice-settings {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
      flex-wrap: wrap;
    }
    .autoplay-toggle {
      font-size: 13px;
    }
    .voice-select {
      width: 160px;
      font-size: 13px;
    }
    .tamil-btn {
      font-size: 12px;
      height: 32px;
    }
    .slider-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 12px;
      gap: 2px;
    }
    .slider-group input {
      width: 90px;
    }
  `]
})
export class VoiceSettingsComponent implements OnInit, OnDestroy {
  ttsSupported: boolean;
  autoPlay = false;
  voices: SpeechSynthesisVoice[] = [];
  selectedVoiceIndex = -1;

  private destroy$ = new Subject<void>();

  constructor(
    public voiceService: VoiceService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {
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

    this.voiceService.selectedVoiceName$.pipe(takeUntil(this.destroy$)).subscribe(name => {
      const idx = this.voices.findIndex(v => v.name === name);
      this.selectedVoiceIndex = idx >= 0 ? idx : -1;
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
    const name = index >= 0 ? this.voices[index].name : '';
    localStorage.setItem('voice_preferred_name', name);
    this.voiceService.selectedVoiceName$.next(name);
  }

  onSelectTamilVoice(): void {
    const found = this.voiceService.autoSelectTamilVoice();
    if (!found) {
      this.snackBar.open('No Tamil voice installed on this device', 'Dismiss', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
    this.cdr.detectChanges();
  }

  onRateChange(event: Event): void {
    this.voiceService.rate = parseFloat((event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }

  onPitchChange(event: Event): void {
    this.voiceService.pitch = parseFloat((event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }
}
