import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PLUGIN_CONFIG } from '../tokens/plugin-config.token';
import { PluginConfig } from '../models/plugin-config.interface';
import { SdkStreamRequest } from '../models/sdk-stream-request.interface';

@Injectable()
export class SdkChatService {
  constructor(@Inject(PLUGIN_CONFIG) private config: PluginConfig) {}

  streamSdkMessage(request: SdkStreamRequest): Observable<string> {
    return new Observable<string>(observer => {
      const controller = new AbortController();

      fetch(`${this.config.apiUrl}/api/chat/stream-sdk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal
      }).then(async response => {
        if (!response.ok) { observer.error(new Error(`HTTP ${response.status}`)); return; }
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            try {
              const parsed = JSON.parse(raw);
              if (parsed === '[DONE]') { observer.complete(); return; }
              if (typeof parsed === 'string' && parsed.startsWith('[STREAM_ERROR]:')) {
                observer.error(new Error(parsed.slice(15))); return;
              }
              observer.next(parsed as string);
            } catch { observer.next(raw); }
          }
        }
        observer.complete();
      }).catch(err => { if (err.name !== 'AbortError') observer.error(err); });

      return () => controller.abort();
    });
  }
}
