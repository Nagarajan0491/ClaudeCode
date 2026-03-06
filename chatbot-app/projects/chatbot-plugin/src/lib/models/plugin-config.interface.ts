export interface PluginConfig {
  apiUrl: string;
  enableVoice?: boolean;
  defaultModel?: string;
  theme?: 'floating' | 'inline';
  title?: string;
}
