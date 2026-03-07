import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KnowledgeBaseService } from '../chatbot/services/knowledge-base.service';
import { Document } from '../chatbot/models/document.interface';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPageComponent implements OnInit {
  documents: Document[] = [];
  selectedFile: File | null = null;
  docTitle = '';
  isUploading = false;
  uploadResult: Document | null = null;
  errorMessage: string | null = null;

  displayedColumns = ['id', 'title', 'totalChunks', 'uploadedAt', 'actions'];

  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.knowledgeBaseService.loadDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load documents.';
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.errorMessage = null;
    this.uploadResult = null;

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'md' && ext !== 'pdf' && ext !== 'pptx') {
        this.errorMessage = 'Only .txt, .md, .pdf, and .pptx files are supported.';
        this.selectedFile = null;
        this.cdr.detectChanges();
        return;
      }
    }

    this.selectedFile = file;
    this.cdr.detectChanges();
  }

  upload(): void {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.errorMessage = null;
    this.uploadResult = null;
    this.cdr.detectChanges();

    this.knowledgeBaseService.uploadDocument(this.selectedFile, this.docTitle || undefined).subscribe({
      next: (doc) => {
        this.uploadResult = doc;
        this.isUploading = false;
        this.selectedFile = null;
        this.docTitle = '';
        this.loadDocuments();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Upload failed. Please try again.';
        this.isUploading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteDocument(id: number): void {
    this.knowledgeBaseService.deleteDocument(id).subscribe({
      next: () => this.loadDocuments(),
      error: () => {
        this.errorMessage = 'Failed to delete document.';
        this.cdr.detectChanges();
      }
    });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.cdr.detectChanges();
  }

  goToChat(): void {
    this.router.navigate(['/']);
  }
}
