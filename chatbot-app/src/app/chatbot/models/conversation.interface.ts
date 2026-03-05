import { Message } from './message.interface';

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: Message[];
}
