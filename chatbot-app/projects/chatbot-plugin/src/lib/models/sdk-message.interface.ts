export interface SdkMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  inputMethod: string;
  timestamp: string;
  isStreaming?: boolean;
  isError?: boolean;
}
