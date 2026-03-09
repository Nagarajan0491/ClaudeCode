import { Injectable } from '@angular/core';
import { HostAction, HostActionDescriptor, RegisteredHostAction } from '../models/host-action.interface';

@Injectable()
export class ActionRegistryService {
  private actions = new Map<string, HostAction>();

  registerAction(action: HostAction): void {
    this.actions.set(action.name, action);
  }

  unregisterAction(name: string): void {
    this.actions.delete(name);
  }

  getAction(name: string): HostAction | undefined {
    return this.actions.get(name);
  }

  getActionDescriptors(): HostActionDescriptor[] {
    return Array.from(this.actions.values()).map(({ name, description, parameterSchema }) => ({
      name, description, parameterSchema
    }));
  }

  /**
   * Register (or upsert) a server-side host action via POST /api/host-actions/register.
   * Safe to call on app startup — idempotent by (name, hostAppId).
   */
  async registerServerAction(apiUrl: string, request: RegisteredHostAction): Promise<void> {
    const response = await fetch(`${apiUrl}/api/host-actions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      throw new Error(`Failed to register server action '${request.name}': HTTP ${response.status}`);
    }
  }
}
