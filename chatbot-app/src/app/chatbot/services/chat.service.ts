import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatResponse {
  id: number;
  conversationId: number;
  content: string;
  role: string;
  timestamp: string;
  isStreaming?: boolean;
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

  constructor(private http: HttpClient) {}

  sendMessage(conversationId: number, content: string, inputMethod: string = 'text'): Observable<ChatResponse> {
    const request: SendMessageRequest = { conversationId, content, inputMethod };
    return this.http.post<ChatResponse>(`${this.apiUrl}/api/chat/send-message`, request);
  }

  streamMessage(conversationId: number, message: string): Observable<string> {
    return new Observable<string>(observer => {
      const url = `${this.apiUrl}/api/chat/stream/${conversationId}?message=${encodeURIComponent(message)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch {
          observer.next(event.data);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        observer.complete();
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
