import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Conversation } from '../../models/conversation.interface';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.css'],
  standalone: false
})
export class ConversationListComponent {
  @Input() conversations: Conversation[] = [];
  @Input() selectedId: number | null = null;
  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() conversationDeleted = new EventEmitter<number>();
  @Output() newConversation = new EventEmitter<void>();

  select(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  delete(event: Event, id: number): void {
    event.stopPropagation();
    this.conversationDeleted.emit(id);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
