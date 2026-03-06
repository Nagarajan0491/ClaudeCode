import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  readonly transcript$ = new BehaviorSubject<string>('');
  readonly isListening$ = new BehaviorSubject<boolean>(false);
  readonly isSpeaking$ = new BehaviorSubject<boolean>(false);
  readonly isPaused$ = new BehaviorSubject<boolean>(false);
  readonly activeMessageId$ = new BehaviorSubject<number | null>(null);
  readonly voices$ = new BehaviorSubject<SpeechSynthesisVoice[]>([]);
  readonly autoPlay$ = new BehaviorSubject<boolean>(
    localStorage.getItem('voice_autoplay') === 'true'
  );
  readonly selectedVoiceName$ = new BehaviorSubject<string>(
    localStorage.getItem('voice_preferred_name') ?? ''
  );

  selectedVoice: SpeechSynthesisVoice | null = null;

  get rate(): number { return parseFloat(localStorage.getItem('voice_rate') ?? '1'); }
  set rate(v: number) { localStorage.setItem('voice_rate', String(v)); }

  get pitch(): number { return parseFloat(localStorage.getItem('voice_pitch') ?? '1'); }
  set pitch(v: number) { localStorage.setItem('voice_pitch', String(v)); }

  readonly sttSupported: boolean;
  readonly ttsSupported: boolean;

  constructor() {
    this.sttSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    this.ttsSupported = 'speechSynthesis' in window;

    // Cancel any in-progress speech when the page is unloaded / refreshed.
    window.addEventListener('beforeunload', () => {
      if (this.ttsSupported) this.synthesis.cancel();
    });

    if (this.sttSupported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.transcript$.next(transcript);
      };

      this.recognition.onend = () => {
        this.isListening$.next(false);
      };

      this.recognition.onerror = () => {
        this.isListening$.next(false);
      };
    }

    if (this.ttsSupported) {
      const loadVoices = () => {
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          this.voices$.next(voices);
          this.restoreOrAutoSelect(voices);
        }
      };
      this.synthesis.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    }

    this.autoPlay$.subscribe(val => localStorage.setItem('voice_autoplay', String(val)));
  }

  private restoreOrAutoSelect(voices: SpeechSynthesisVoice[]): void {
    const savedName = localStorage.getItem('voice_preferred_name');
    if (savedName) {
      const saved = voices.find(v => v.name === savedName);
      if (saved) {
        this.selectedVoice = saved;
        this.selectedVoiceName$.next(saved.name);
        return;
      }
    }
    this.autoSelectTamilVoice(voices);
  }

  autoSelectTamilVoice(voices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const list = voices ?? this.voices$.value;
    const found = list.find(v => v.lang.startsWith('ta'));
    if (found) {
      this.selectedVoice = found;
      this.pitch = 0.85;
      this.rate = 0.9;
      localStorage.setItem('voice_preferred_name', found.name);
      this.selectedVoiceName$.next(found.name);
    }
    return found ?? null;
  }

  startListening(): void {
    if (!this.sttSupported || this.isListening$.value) return;
    this.transcript$.next('');
    this.recognition.start();
    this.isListening$.next(true);
  }

  stopListening(): void {
    if (!this.sttSupported || !this.isListening$.value) return;
    this.recognition.stop();
    this.isListening$.next(false);
  }

  speakMessage(messageId: number, text: string): void {
    // Call speak() first — it internally calls stop() which resets activeMessageId$ to null.
    // Set activeMessageId$ afterwards so it is non-null when onstart fires.
    this.speak(text);
    this.activeMessageId$.next(messageId);
  }

  private sanitizeForTts(text: string): string {
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // emojis
      .replace(/#{1,6}\s+/g, '')           // markdown headings
      .replace(/\*\*(.+?)\*\*/g, '$1')     // bold **text**
      .replace(/\*(.+?)\*/g, '$1')         // italic *text*
      .replace(/`{1,3}[^`]*`{1,3}/g, '')  // inline code / code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links [label](url)
      .replace(/[_~>|]/g, '')              // underscores, strikethrough, blockquotes, tables
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak(text: string): void {
    if (!this.ttsSupported) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(this.sanitizeForTts(text));
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.onstart = () => {
      this.isSpeaking$.next(true);
      this.isPaused$.next(false);
    };
    utterance.onend = () => {
      this.isSpeaking$.next(false);
      this.isPaused$.next(false);
      this.currentUtterance = null;
      this.activeMessageId$.next(null);
    };
    utterance.onerror = () => {
      this.isSpeaking$.next(false);
      this.isPaused$.next(false);
      this.currentUtterance = null;
      this.activeMessageId$.next(null);
    };
    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  pause(): void {
    if (!this.ttsSupported) return;
    this.synthesis.pause();
    this.isSpeaking$.next(false);
    this.isPaused$.next(true);
  }

  resume(): void {
    if (!this.ttsSupported) return;
    this.synthesis.resume();
    this.isSpeaking$.next(true);
    this.isPaused$.next(false);
  }

  stop(): void {
    if (!this.ttsSupported) return;
    this.synthesis.cancel();
    this.isSpeaking$.next(false);
    this.isPaused$.next(false);
    this.currentUtterance = null;
    this.activeMessageId$.next(null);
  }
}
