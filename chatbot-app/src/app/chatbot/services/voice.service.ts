import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VoiceService implements OnDestroy {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private beforeUnloadHandler: (() => void) | null = null;
  private autoPlaySub: Subscription | null = null;
  private readonly isBrowser: boolean;

  readonly transcript$ = new BehaviorSubject<string>('');
  readonly isListening$ = new BehaviorSubject<boolean>(false);
  readonly isSpeaking$ = new BehaviorSubject<boolean>(false);
  readonly isPaused$ = new BehaviorSubject<boolean>(false);
  readonly activeMessageId$ = new BehaviorSubject<number | null>(null);
  readonly voices$ = new BehaviorSubject<SpeechSynthesisVoice[]>([]);
  readonly autoPlay$: BehaviorSubject<boolean>;
  readonly selectedVoiceName$: BehaviorSubject<string>;

  selectedVoice: SpeechSynthesisVoice | null = null;

  get rate(): number {
    return this.isBrowser ? parseFloat(localStorage.getItem('voice_rate') ?? '1') : 1;
  }
  set rate(v: number) {
    if (this.isBrowser) localStorage.setItem('voice_rate', String(v));
  }

  get pitch(): number {
    return this.isBrowser ? parseFloat(localStorage.getItem('voice_pitch') ?? '1') : 1;
  }
  set pitch(v: number) {
    if (this.isBrowser) localStorage.setItem('voice_pitch', String(v));
  }

  readonly sttSupported: boolean;
  readonly ttsSupported: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.autoPlay$ = new BehaviorSubject<boolean>(
      this.isBrowser ? localStorage.getItem('voice_autoplay') === 'true' : false
    );
    this.selectedVoiceName$ = new BehaviorSubject<string>(
      this.isBrowser ? (localStorage.getItem('voice_preferred_name') ?? '') : ''
    );

    this.sttSupported = this.isBrowser &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    this.ttsSupported = this.isBrowser && ('speechSynthesis' in window);

    if (this.isBrowser) {
      this.beforeUnloadHandler = () => {
        if (this.ttsSupported) this.synthesis!.cancel();
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

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
      this.synthesis = window.speechSynthesis;
      const loadVoices = () => {
        const voices = this.synthesis!.getVoices();
        if (voices.length > 0) {
          this.voices$.next(voices);
          this.restoreOrAutoSelect(voices);
        }
      };
      this.synthesis.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    }

    if (this.isBrowser) {
      this.autoPlaySub = this.autoPlay$.subscribe(val =>
        localStorage.setItem('voice_autoplay', String(val))
      );
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
    this.autoPlaySub?.unsubscribe();
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
      if (this.isBrowser) localStorage.setItem('voice_preferred_name', found.name);
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
    this.speak(text);
    this.activeMessageId$.next(messageId);
  }

  private sanitizeForTts(text: string): string {
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[_~>|]/g, '')
      .replace(/^[\s]*[-*•]\s+/gm, '')   // strip unordered list bullets
      .replace(/^[\s]*\d+\.\s+/gm, '')   // strip ordered list numbers
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
    this.synthesis!.speak(utterance);
  }

  pause(): void {
    if (!this.ttsSupported) return;
    this.synthesis!.pause();
    this.isSpeaking$.next(false);
    this.isPaused$.next(true);
  }

  resume(): void {
    if (!this.ttsSupported) return;
    this.synthesis!.resume();
    this.isSpeaking$.next(true);
    this.isPaused$.next(false);
  }

  stop(): void {
    if (!this.ttsSupported) return;
    this.synthesis!.cancel();
    this.isSpeaking$.next(false);
    this.isPaused$.next(false);
    this.currentUtterance = null;
    this.activeMessageId$.next(null);
  }
}
