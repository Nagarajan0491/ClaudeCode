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
