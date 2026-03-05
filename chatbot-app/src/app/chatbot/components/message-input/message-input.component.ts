import { Component, EventEmitter, Input, Output, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.css'],
  standalone: false
})
export class MessageInputComponent {
  @Input() isLoading = false;
  @Output() messageSent = new EventEmitter<string>();

  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  content = '';
  maxLength = 10000;

  get charCount(): number {
    return this.content.length;
  }

  get isOverLimit(): boolean {
    return this.charCount > this.maxLength;
  }

  get canSend(): boolean {
    return this.content.trim().length > 0 && !this.isLoading && !this.isOverLimit;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    if (!this.canSend) return;
    const trimmed = this.content.trim();
    this.messageSent.emit(trimmed);
    this.content = '';
    this.autoResize();
  }

  focus(): void {
    this.textAreaRef?.nativeElement.focus();
  }

  reset(): void {
    this.content = '';
    this.autoResize();
  }

  autoResize(): void {
    const ta = this.textAreaRef?.nativeElement;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }
}
