import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-voice-settings',
  templateUrl: './voice-settings.component.html',
  styleUrls: ['./voice-settings.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoiceSettingsComponent implements OnInit, OnDestroy {
  voices: SpeechSynthesisVoice[] = [];
  selectedVoiceName = '';
  autoPlay = false;
  rate = 1;
  pitch = 1;

  private destroy$ = new Subject<void>();

  constructor(
    public voiceService: VoiceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.voiceService.voices$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.voices = v;
      this.cdr.detectChanges();
    });
    this.voiceService.autoPlay$.pipe(takeUntil(this.destroy$)).subscribe(val => {
      this.autoPlay = val;
      this.cdr.detectChanges();
    });
    this.voiceService.selectedVoiceName$.pipe(takeUntil(this.destroy$)).subscribe(name => {
      this.selectedVoiceName = name;
      this.cdr.detectChanges();
    });
    this.rate = this.voiceService.rate;
    this.pitch = this.voiceService.pitch;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleAutoPlay(): void {
    this.voiceService.autoPlay$.next(!this.voiceService.autoPlay$.value);
  }

  onVoiceChange(name: string): void {
    const voice = this.voices.find(v => v.name === name) ?? null;
    this.voiceService.selectedVoice = voice;
    this.voiceService.selectedVoiceName$.next(name);
    localStorage.setItem('voice_preferred_name', name);
  }

  onRateChange(value: number): void {
    this.voiceService.rate = value;
    this.rate = value;
  }

  onPitchChange(value: number): void {
    this.voiceService.pitch = value;
    this.pitch = value;
  }
}
