import { Injectable } from '@angular/core';
import { HostAction, HostActionDescriptor } from '../models/host-action.interface';

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
}
