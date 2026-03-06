export interface Plugin {
  id: number;
  name: string;
  description: string;
  endpointUrl: string;
  httpMethod: string;
  hasAuthToken: boolean;
  parameterSchema: string;
  isActive: boolean;
  registeredAt: string;
  lastInvokedAt?: string;
}

export interface CreatePluginRequest {
  name: string;
  description: string;
  endpointUrl: string;
  httpMethod: string;
  authToken?: string;
  parameterSchema: string;
  isActive: boolean;
}

export interface UpdatePluginRequest extends CreatePluginRequest {}

export interface ExecutePluginRequest {
  parameters?: Record<string, unknown>;
}

export interface PluginExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
  statusCode: number;
}
