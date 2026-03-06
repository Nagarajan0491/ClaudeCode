# ChatbotApp

A feature-rich chatbot application built with Angular 21, featuring real-time conversations, voice interaction, and an extensible plugin system.

## Features

- 💬 **Real-time Chat**: Interactive chatbot interface with message history
- 🗣️ **Voice Support**: Voice input and text-to-speech capabilities
- 🔌 **Plugin System**: Extensible architecture for custom integrations
- 📝 **Conversation Management**: Create and manage multiple conversations
- 🎨 **Material Design**: Beautiful UI built with Angular Material
- 📦 **Chatbot Plugin Library**: Reusable chatbot widget as a standalone library

## Tech Stack

- **Angular** 21.2.1
- **Angular Material** 21.2.1
- **RxJS** 7.8.0
- **TypeScript** 5.9.2
- **Vitest** 4.0.8 (Testing)

## Prerequisites

- Node.js (npm 10.8.2 or higher)
- Backend API server running on `http://localhost:5112`

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

> **Note:** The app expects a backend API. The proxy is configured to forward `/api` requests to `http://localhost:5000`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Project Structure

```
chatbot-app/
├── src/app/chatbot/              # Main chatbot application
│   ├── components/               # UI components
│   │   ├── chatbot/             # Main chatbot interface
│   │   ├── conversation-list/   # Conversation management
│   │   ├── message-input/       # Message input component
│   │   ├── message-item/        # Message display component
│   │   ├── plugin-management/   # Plugin configuration
│   │   ├── typing-indicator/    # Typing animation
│   │   └── voice-settings/      # Voice configuration
│   ├── models/                  # Data models & interfaces
│   ├── services/                # Core services
│   │   ├── chat.service.ts      # Chat/messaging service
│   │   ├── conversation.service.ts  # Conversation management
│   │   ├── plugin.service.ts    # Plugin system
│   │   └── voice.service.ts     # Voice input/output
│   └── interceptors/            # HTTP interceptors
│
└── projects/chatbot-plugin/      # Reusable chatbot library
    └── src/lib/
        ├── components/          # Widget components
        │   ├── chatbot-widget/  # Embeddable chatbot widget
        │   └── ...              # SDK components
        ├── services/            # SDK services
        └── models/              # Public interfaces

```

## Building

### Build the Application

```bash
ng build
```

This compiles your project and stores the build artifacts in the `dist/` directory.

### Build the Chatbot Plugin Library

```bash
ng build chatbot-plugin
```

This builds the reusable chatbot plugin library for integration into other applications.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Configuration

### Environment Settings

Update environment files for different configurations:

- Development: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`

Configure the backend API URL:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5112'
};
```

### Proxy Configuration

API requests are proxied to the backend. Modify `proxy.conf.json` to change the target:

```json
{
  "/api": {
    "target": "http://localhost:5000",
    "changeOrigin": true,
    "secure": false
  }
}
```

## Using the Chatbot Plugin Library

The `chatbot-plugin` library can be integrated into other Angular applications:

1. Build the library: `ng build chatbot-plugin`
2. Import the module in your app:

```typescript
import { ChatbotPluginModule, PluginConfig, PLUGIN_CONFIG } from 'chatbot-plugin';

const pluginConfig: PluginConfig = {
  apiUrl: 'your-api-url',
  // ... other configuration
};

@NgModule({
  imports: [
    ChatbotPluginModule.forRoot()
  ],
  providers: [
    { provide: PLUGIN_CONFIG, useValue: pluginConfig }
  ]
})
export class AppModule { }
```

3. Use the chatbot widget component:

```html
<chatbot-widget></chatbot-widget>
```

## Additional Resources

- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Angular Material Components](https://material.angular.io/)
- [RxJS Documentation](https://rxjs.dev/)
- [Vitest Testing Framework](https://vitest.dev/)
