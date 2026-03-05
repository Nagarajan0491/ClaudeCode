import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  templateUrl: './typing-indicator.component.html',
  styleUrls: ['./typing-indicator.component.css'],
  standalone: false
})
export class TypingIndicatorComponent {
  @Input() isVisible = false;
}
