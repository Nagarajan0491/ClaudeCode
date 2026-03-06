import { InjectionToken } from '@angular/core';
import { PluginConfig } from '../models/plugin-config.interface';

export const PLUGIN_CONFIG = new InjectionToken<PluginConfig>('PLUGIN_CONFIG');
