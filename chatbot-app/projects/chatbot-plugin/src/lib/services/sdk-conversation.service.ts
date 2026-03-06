import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { PLUGIN_CONFIG } from '../tokens/plugin-config.token';
import { PluginConfig } from '../models/plugin-config.interface';

@Injectable()
export class SdkConversationService {
  private conversationId: number | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLUGIN_CONFIG) private config: PluginConfig
  ) {}

  ensureConversation(): Observable<number> {
    if (this.conversationId !== null) return of(this.conversationId);
    return this.http
      .post<{ id: number }>(`${this.config.apiUrl}/api/conversations`, {})
      .pipe(
        tap(c => { this.conversationId = c.id; }),
        map(c => c.id)
      );
  }

  getConversationId(): number | null {
    return this.conversationId;
  }

  setConversationId(id: number | null): void {
    this.conversationId = id;
  }

  listConversations(): Observable<Array<{ id: number; title: string; updatedAt: string }>> {
    return this.http.get<Array<{ id: number; title: string; updatedAt: string }>>(
      `${this.config.apiUrl}/api/conversations`
    );
  }

  loadConversation(id: number): Observable<any> {
    return this.http.get<any>(`${this.config.apiUrl}/api/conversations/${id}`);
  }
}
