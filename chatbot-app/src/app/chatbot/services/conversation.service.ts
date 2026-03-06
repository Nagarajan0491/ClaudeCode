import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversation } from '../models/conversation.interface';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private apiUrl = environment.apiUrl;
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  conversations$ = this.conversationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/api/conversations`).pipe(
      tap(conversations => this.conversationsSubject.next(conversations))
    );
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.apiUrl}/api/conversations/${id}`);
  }

  createConversation(): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/api/conversations`, {}).pipe(
      tap(newConv => {
        const current = this.conversationsSubject.value;
        this.conversationsSubject.next([newConv, ...current]);
      })
    );
  }

  deleteConversation(id: number): Observable<void> {
    const previous = this.conversationsSubject.value;
    this.conversationsSubject.next(previous.filter(c => c.id !== id));
    return this.http.delete<void>(`${this.apiUrl}/api/conversations/${id}`).pipe(
      catchError(err => {
        this.conversationsSubject.next(previous);
        return throwError(() => err);
      })
    );
  }

  updateConversationInList(updated: Conversation): void {
    const current = this.conversationsSubject.value.map(c =>
      c.id === updated.id ? { ...c, ...updated } : c
    );
    this.conversationsSubject.next(current);
  }

  renameConversation(id: number, title: string): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.apiUrl}/api/conversations/${id}/title`, { title }).pipe(
      tap(updated => this.updateConversationInList(updated))
    );
  }
}
