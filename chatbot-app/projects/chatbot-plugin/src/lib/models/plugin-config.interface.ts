export interface PluginConfig {
  apiUrl: string;
  enableVoice?: boolean;
  enableHistory?: boolean;
  defaultModel?: string;
  theme?: 'floating' | 'inline';
  title?: string;
}
