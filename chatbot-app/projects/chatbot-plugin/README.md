# Chatbot Plugin

A modern, reusable Angular chatbot widget with a beautiful UI inspired by ChatGPT. This plugin can be embedded in any Angular application.

## Features

- 🎨 Modern, professional UI with gradient colors
- 💬 Floating or inline chat widget
- 🎤 Voice input support (Speech-to-Text)
- 🔊 Text-to-Speech for bot responses
- 📱 Responsive design
- 🎯 Material Design icons
- ⚡ Streaming message support
- 🔌 Extensible action system

## Installation

### Option 1: Build and Link Locally

From the root of the chatbot-app project:

```bash
# Build the plugin library
npm run build chatbot-plugin

# Link it locally (from dist folder)
cd dist/chatbot-plugin
npm link

# In your target application
npm link chatbot-plugin
```

### Option 2: Install from Tarball

```bash
# Build the plugin
npm run build chatbot-plugin

# Create tarball
cd dist/chatbot-plugin
npm pack

# In your target application
npm install /path/to/chatbot-plugin-0.1.0.tgz
```

### Option 3: Publish to NPM (for production)

```bash
# Build the plugin
npm run build chatbot-plugin

# Publish to npm
cd dist/chatbot-plugin
npm publish
```

## Peer Dependencies

Make sure your Angular application has these installed:

```json
{
  "@angular/common": ">=21.0.0",
  "@angular/core": ">=21.0.0",
  "@angular/forms": ">=21.0.0",
  "@angular/material": ">=21.0.0"
}
```

## Usage

### 1. Import the Module

In your `app.module.ts` or component:

```typescript
import { ChatbotPluginModule, PLUGIN_CONFIG, PluginConfig } from 'chatbot-plugin';

const chatbotConfig: PluginConfig = {
  apiUrl: 'http://localhost:8000/api/chat',
  enableVoice: true,
  title: 'AI Assistant'
};

@NgModule({
  imports: [
    ChatbotPluginModule,
    // ... other imports
  ],
  providers: [
    { provide: PLUGIN_CONFIG, useValue: chatbotConfig }
  ]
})
export class AppModule { }
```

### 2. Use the Floating Widget

Add to any component template:

```html
<!-- Floating chat button (bottom-right corner) -->
<chatbot-widget 
  [isFloating]="true"
  [title]="'AI Assistant'">
</chatbot-widget>
```

### 3. Use as Inline Widget

```html
<!-- Embedded in a container -->
<div style="width: 100%; height: 600px;">
  <chatbot-widget 
    [isFloating]="false"
    [title]="'Customer Support'">
  </chatbot-widget>
</div>
```

### 4. Register Custom Actions

```typescript
import { ActionRegistryService, HostAction } from 'chatbot-plugin';

@Component({ /* ... */ })
export class MyComponent implements OnInit {
  constructor(private actionRegistry: ActionRegistryService) {}

  ngOnInit() {
    // Register a custom action
    this.actionRegistry.register({
      actionId: 'get-user-info',
      handler: async () => {
        return { name: 'John Doe', email: 'john@example.com' };
      }
    });
  }
}
```

## Configuration Options

```typescript
interface PluginConfig {
  apiUrl: string;             // Backend chat API endpoint
  enableVoice?: boolean;      // Enable speech features (default: true)
  enableHistory?: boolean;    // Enable conversation history (default: false)
  title?: string;             // Widget title (default: 'Chat')
  theme?: 'floating' | 'inline'; // Widget display mode 
}
```

## Component Inputs

### ChatbotWidgetComponent

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `isFloating` | `boolean` | `true` | Floating button or inline widget |
| `title` | `string` | `'Chat'` | Widget header title |
| `userId` | `string` | `''` | User ID (auto-enables history when provided) |
| `enableHistory` | `boolean` | Auto* | Enable conversation history |

*Auto: Automatically enabled when `userId` is provided (user is logged in)

## Styling

The plugin comes with built-in modern styles. If you need to customize:

```css
/* In your global styles.css */
.cp-panel {
  /* Override panel styles */
}

.cp-fab {
  /* Override floating button */
  bottom: 20px !important;
  right: 20px !important;
}
```

## API Backend Requirements

Your backend should provide a POST endpoint that accepts:

```json
{
  "message": "User message text",
  "conversationId": "optional-conversation-id"
}
```

And returns:

```json
{
  "response": "Bot response text",
  "conversationId": "conversation-id"
}
```

For streaming responses, use Server-Sent Events (SSE).

## Browser Requirements

- Modern browsers with ES2020+ support
- Web Speech API for voice features (Chrome, Edge, Safari)

## Example Application

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>My Application</h1>
      <!-- Your app content -->
      
      <!-- Floating chatbot widget -->
      <chatbot-widget 
        [isFloating]="true"
        [title]="'Support Assistant'">
      </chatbot-widget>
    </div>
  `
})
export class AppComponent { }
```

## Development

Build the plugin:
```bash
ng build chatbot-plugin
```

Watch mode:
```bash
ng build chatbot-plugin --watch
```

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
