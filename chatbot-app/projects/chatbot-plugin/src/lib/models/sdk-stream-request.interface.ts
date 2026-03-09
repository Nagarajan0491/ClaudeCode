import { HostActionDescriptor } from './host-action.interface';

export interface SdkStreamRequest {
  conversationId: number;
  content: string;
  inputMethod: string;
  hostContext?: Record<string, string>;
  hostActions?: HostActionDescriptor[];
  hostAppId?: string;
}
