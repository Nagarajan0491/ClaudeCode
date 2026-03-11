import { HostActionDescriptor } from './host-action.interface';

export interface SdkStreamRequest {
  conversationId: number | null;
  content: string;
  inputMethod: string;
  hostContext?: Record<string, string>;
  hostActions?: HostActionDescriptor[];
  hostAppId?: string;
  userId?: string;
}
