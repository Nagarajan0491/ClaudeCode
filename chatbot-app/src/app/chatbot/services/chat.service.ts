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

  streamMessage(conversationId: number, message: string, inputMethod: string = 'text'): Observable<string> {
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
