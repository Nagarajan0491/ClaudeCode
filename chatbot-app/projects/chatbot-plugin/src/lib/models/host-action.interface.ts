export interface HostAction {
  name: string;
  description: string;
  parameterSchema: string;
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>;
}

export interface HostActionDescriptor {
  name: string;
  description: string;
  parameterSchema: string;
}

/** Server-registered host action — no execute callback; backend calls the endpoint directly. */
export interface RegisteredHostAction {
  name: string;
  description: string;
  endpointUrl: string;
  httpMethod?: string;
  parameterSchema?: string;
  responseSchema?: string;
  authType?: string;
  authToken?: string;
  authHeaderName?: string;
  hostAppId?: string;
  fewShotExamples?: string;
  isActive?: boolean;
}
