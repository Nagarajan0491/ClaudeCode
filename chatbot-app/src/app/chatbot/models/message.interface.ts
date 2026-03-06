export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  inputMethod: string;
  timestamp: string;
  isError?: boolean;
  isStreaming?: boolean;
}
