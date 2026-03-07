import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SourceReference } from '../models/document.interface';

export interface ChatResponse {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: SourceReference[];
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
  inputMethod: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  /** Sources from the most recent stream, cleared at the start of each new stream. */
  readonly lastSources$ = new BehaviorSubject<SourceReference[]>([]);

  constructor(private http: HttpClient) {}

  sendMessage(conversationId: number, content: string, inputMethod: string = 'text'): Observable<ChatResponse> {
    const request: SendMessageRequest = { conversationId, content, inputMethod };
    return this.http.post<ChatResponse>(`${this.apiUrl}/api/chat/send-message`, request);
  }

  streamMessage(conversationId: number, message: string, inputMethod: string = 'text'): Observable<string> {
    this.lastSources$.next([]);
    return new Observable<string>(observer => {
      const url = `${this.apiUrl}/api/chat/stream/${conversationId}?message=${encodeURIComponent(message)}&inputMethod=${encodeURIComponent(inputMethod)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data === 'string' && data === '[DONE]') {
            eventSource.close();
            observer.complete();
          } else if (typeof data === 'string' && data.startsWith('[STREAM_ERROR]:')) {
            eventSource.close();
            observer.error(new Error(data.slice('[STREAM_ERROR]:'.length)));
          } else if (typeof data === 'string' && data.startsWith('[SOURCES]:')) {
            // Parse sources sentinel — do not emit as content chunk
            try {
              const sources = JSON.parse(data.slice('[SOURCES]:'.length)) as SourceReference[];
              this.lastSources$.next(sources);
            } catch { /* ignore malformed sources */ }
          } else {
            observer.next(data);
          }
        } catch {
          observer.next(event.data);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        observer.error(new Error('Connection to server was lost.'));
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
