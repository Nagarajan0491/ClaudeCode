import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { SdkMessage } from '../../models/sdk-message.interface';
import { SdkVoiceService } from '../../services/sdk-voice.service';

@Component({
  selector: 'cp-message-item',
  templateUrl: './sdk-message-item.component.html',
  styleUrls: ['./sdk-message-item.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdkMessageItemComponent {
  @Input() message!: SdkMessage;

  constructor(
    public voiceService: SdkVoiceService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleSpeak(): void {
    const activeId = this.voiceService.activeMessageId$.value;
    if (activeId === this.message.id) {
      this.voiceService.stop();
    } else {
      this.voiceService.speakMessage(this.message.id, this.message.content);
    }
    this.cdr.detectChanges();
  }
}
