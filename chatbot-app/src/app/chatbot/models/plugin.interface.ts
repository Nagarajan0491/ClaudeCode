export interface Plugin {
  id: number;
  name: string;
  description: string;
  url: string;
  httpMethod: string;
  isActive: boolean;
  authType?: string;
  authToken?: string;
}

export interface PluginExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
}
