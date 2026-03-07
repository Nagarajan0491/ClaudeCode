import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { Document } from '../../models/document.interface';

@Component({
  selector: 'app-knowledge-base-management',
  templateUrl: './knowledge-base-management.component.html',
  styleUrls: ['./knowledge-base-management.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KnowledgeBaseManagementComponent implements OnInit {
  documents: Document[] = [];
  isLoading = false;
  isUploading = false;
  errorMessage = '';
  uploadSuccess = false;

  constructor(
    private dialogRef: MatDialogRef<KnowledgeBaseManagementComponent>,
    private knowledgeBaseService: KnowledgeBaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.knowledgeBaseService.loadDocuments().subscribe({
      next: docs => {
        this.documents = docs;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.isUploading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.knowledgeBaseService.uploadDocument(file).subscribe({
      next: doc => {
        this.documents = [doc, ...this.documents];
        this.isUploading = false;
        this.uploadSuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => { this.uploadSuccess = false; this.cdr.detectChanges(); }, 3000);
      },
      error: () => {
        this.errorMessage = 'Upload failed. Only .txt, .md, .pdf, and .pptx files are supported.';
        this.isUploading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteDocument(id: number): void {
    this.knowledgeBaseService.deleteDocument(id).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== id);
        this.cdr.detectChanges();
      }
    });
  }

  getFileExt(fileName: string): string {
    return (fileName.split('.').pop() ?? 'file').toLowerCase();
  }

  getFileBadgeClass(fileName: string): string {
    const ext = this.getFileExt(fileName);
    const map: Record<string, string> = { pdf: 'badge-pdf', txt: 'badge-txt', md: 'badge-md', pptx: 'badge-pptx' };
    return map[ext] ?? 'badge-default';
  }

  close(): void {
    this.dialogRef.close();
  }
}
