import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Document } from '../models/document.interface';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private readonly apiUrl = environment.apiUrl;

  readonly documents$ = new BehaviorSubject<Document[]>([]);

  constructor(private http: HttpClient) {}

  loadDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/api/knowledge-base/documents`).pipe(
      tap(docs => this.documents$.next(docs))
    );
  }

  uploadDocument(file: File, title?: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (title) formData.append('title', title);
    return this.http.post<Document>(`${this.apiUrl}/api/knowledge-base/upload`, formData).pipe(
      tap(doc => this.documents$.next([doc, ...this.documents$.value]))
    );
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/knowledge-base/documents/${id}`).pipe(
      tap(() => this.documents$.next(this.documents$.value.filter(d => d.id !== id)))
    );
  }
}
