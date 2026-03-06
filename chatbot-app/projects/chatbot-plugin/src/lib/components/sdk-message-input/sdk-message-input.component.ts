import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SdkVoiceService } from '../../services/sdk-voice.service';
import { PluginConfig } from '../../models/plugin-config.interface';
import { PLUGIN_CONFIG } from '../../tokens/plugin-config.token';

@Component({
  selector: 'cp-message-input',
  templateUrl: './sdk-message-input.component.html',
  styleUrls: ['./sdk-message-input.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdkMessageInputComponent implements OnInit, OnDestroy {
  @Input() disabled = false;
  @Output() sendMessage = new EventEmitter<{ content: string; inputMethod: string }>();

  content = '';
  inputMethod = 'text';
  private subs = new Subscription();

  get enableVoice(): boolean { return this.config.enableVoice ?? false; }

  constructor(
    public voiceService: SdkVoiceService,
    private cdr: ChangeDetectorRef,
    @Inject(PLUGIN_CONFIG) private config: PluginConfig
  ) {}

  ngOnInit(): void {
    this.subs.add(this.voiceService.transcript$.subscribe(t => {
      if (t) { this.content = t; this.cdr.detectChanges(); }
    }));
    this.subs.add(this.voiceService.isListening$.subscribe(() => this.cdr.detectChanges()));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  send(): void {
    const trimmed = this.content.trim();
    if (!trimmed || this.disabled) return;
    this.sendMessage.emit({ content: trimmed, inputMethod: this.inputMethod });
    this.content = '';
    this.inputMethod = 'text';
    this.cdr.detectChanges();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  toggleVoice(): void {
    if (this.voiceService.isListening$.value) {
      this.voiceService.stopListening();
      this.inputMethod = 'text';
    } else {
      this.inputMethod = 'voice';
      this.voiceService.startListening();
    }
    this.cdr.detectChanges();
  }
}
