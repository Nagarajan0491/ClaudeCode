import { Component, Input } from '@angular/core';
import { Message } from '../../models/message.interface';

@Component({
  selector: 'app-message-item',
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.css'],
  standalone: false
})
export class MessageItemComponent {
  @Input() message!: Message;

  get isUser(): boolean {
    return this.message.role === 'user';
  }

  get formattedTime(): string {
    return new Date(this.message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
