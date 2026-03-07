import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PluginManagementComponent } from '../plugin-management/plugin-management.component';
import { KnowledgeBaseManagementComponent } from '../knowledge-base-management/knowledge-base-management.component';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  standalone: false
})
export class ChatbotComponent {
  constructor(
    private dialog: MatDialog,
    private router: Router
  ) {}

  openKnowledgeBase(): void {
    this.dialog.open(KnowledgeBaseManagementComponent, {
      width: '620px',
      maxHeight: '90vh'
    });
  }

  openPluginManagement(): void {
    this.dialog.open(PluginManagementComponent, {
      width: '620px',
      maxHeight: '90vh'
    });
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
