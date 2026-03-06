import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<app-chatbot></app-chatbot><chatbot-widget theme="floating"></chatbot-widget>',
  standalone: false
})
export class App {}
