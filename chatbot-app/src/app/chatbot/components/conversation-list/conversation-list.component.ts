import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
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
  @Output() conversationRenamed = new EventEmitter<{ id: number; title: string }>();
  @Output() newConversation = new EventEmitter<void>();

  editingId: number | null = null;
  editTitle: string = '';

  @ViewChildren('editInput') editInputs!: QueryList<ElementRef>;

  constructor(private cdr: ChangeDetectorRef) {}

  select(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  delete(event: Event, id: number): void {
    event.stopPropagation();
    this.conversationDeleted.emit(id);
  }

  startEdit(event: Event, conv: Conversation): void {
    event.stopPropagation();
    this.editingId = conv.id;
    this.editTitle = conv.title;
    this.cdr.detectChanges();
    setTimeout(() => this.editInputs.first?.nativeElement.focus(), 0);
  }

  saveEdit(conv: Conversation): void {
    const trimmed = this.editTitle.trim();
    if (trimmed && trimmed !== conv.title) {
      this.conversationRenamed.emit({ id: conv.id, title: trimmed });
    }
    this.editingId = null;
    this.cdr.detectChanges();
  }

  cancelEdit(event: Event): void {
    event.stopPropagation();
    this.editingId = null;
    this.cdr.detectChanges();
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
