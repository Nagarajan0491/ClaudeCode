# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise AI chatbot system. Angular 21 frontend talks to a .NET 8 Web API backend that supports
two swappable AI providers (Ollama local LLM or Google Gemini), and persists conversations in
PostgreSQL. The chatbot is also embeddable as a plugin in other Angular apps via the
`chatbot-plugin` Angular library.

```
ChatbotSystem/
├── ChatbotAPI/                  ← .NET 8 Web API (port 5112)
├── chatbot-app/                 ← Angular 21 frontend (port 4200)
│   ├── projects/chatbot-plugin/ ← Embeddable Angular library (SDK)
│   ├── standalone-widget/       ← Framework-agnostic Web Component (vanilla JS)
│   └── dist/chatbot-plugin/     ← Built library output (ng build chatbot-plugin)
```

## Prerequisites

PostgreSQL must be running before the app works end-to-end. Ollama is only required when using the
Ollama provider.

```bash
# PostgreSQL (Docker)
docker run -d --name chatbot-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=Chatbot \
  -p 5432:5432 postgres:16

# Ollama (only required when AIProvider:Provider = Ollama)
ollama serve          # keep running in background
ollama pull phi3:mini # one-time model download (or whichever model you configure)
```

## Backend Commands (`ChatbotAPI/`)

```bash
cd ChatbotAPI

dotnet build                          # compile
dotnet run                            # start on http://localhost:5112
dotnet run --launch-profile https     # start with HTTPS

# EF Core migrations (run when adding/changing models)
dotnet ef migrations add <Name>
dotnet ef database update

# Add a NuGet package — IMPORTANT: pin to 8.x for EF Core / Npgsql
# (v10+ of those packages targets .NET 10, not net8.0)
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.x
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.x
```

Swagger UI available at `http://localhost:5112/swagger` in development.

## Frontend Commands (`chatbot-app/`)

```bash
cd chatbot-app

ng serve                              # dev server at http://localhost:4200
ng build                              # production build to dist/
ng build --configuration development  # dev build
ng build chatbot-plugin               # build the embeddable library → dist/chatbot-plugin/
ng test                               # run unit tests (Karma)
ng test --include='**/chat.service.spec.ts'  # single test file
ng lint                               # ESLint
```

**Do not add `tailwind.config.js`** — Angular 21 auto-detects it and attempts to use Tailwind v4
as a PostCSS plugin, which breaks the build. Tailwind v4 requires `@tailwindcss/postcss` instead.

---

## Backend Architecture

**Request flow:** `Controller → IChatService → IAIProvider (OllamaService | GeminiService) + IMessageRepository`

### Program.cs

DI wiring, middleware pipeline, CORS (origins read from `Cors:AllowedOrigins` in config),
`EnsureCreated()` on startup. Provider selection happens at startup time — the active provider is
compiled into the DI container.

Reads `GEMINI_API_KEY` environment variable and injects it into `IConfiguration["Gemini:ApiKey"]`
before validation, so the rest of the app reads the key from config only.

### Services

- `Services/Interfaces/IAIProvider.cs` — interface with `GenerateResponseAsync` and
  `StreamResponseAsync`. `ChatMessage` record (Role, Content) is also defined here.
- `Services/ChatService.cs` — `SendMessageAsync`, `StreamMessageAsync`, and `StreamSdkMessageAsync`.
  `BuildSystemPrompt(activePlugins, hostContext?, hostActions?)` injects host context key/value pairs
  and host action descriptions into the system prompt when provided. Existing callers pass `null` —
  backward-compatible. Auto-titles the conversation from the first message content (first 50 chars).
- `Services/OllamaService.cs` — HTTP client to Ollama at `http://localhost:11434`. Calls
  `/api/chat` for both regular and streaming requests. Timeout: 5 minutes.
- `Services/GeminiService.cs` — Uses Semantic Kernel `IChatCompletionService` registered via
  `AddGoogleAIGeminiChatCompletion`. Converts `ChatMessage` list to Semantic Kernel `ChatHistory`.

### Phase 3 — Server-Side Plugin Service

- `Services/Interfaces/IPluginService.cs` — interface for plugin management and execution.
- `Services/PluginService.cs` — full CRUD on `PluginRegistrations` table; `ExecuteAsync()` calls
  plugin HTTP endpoints (GET/POST/PUT) with optional Bearer token auth; `TryAutoInvokeAsync()`
  parses `plugin_call` JSON emitted by the AI, looks up the matching active plugin by name, and
  executes it automatically.
- `Controllers/PluginsController.cs` — REST API for managing and executing registered plugins.

### Middleware

- `Middleware/ExceptionHandlingMiddleware.cs` — centralised error→HTTP status mapping
- `Middleware/LoggingMiddleware.cs` — request/response logging via Serilog

### Exception → HTTP Status Mapping

| Exception | HTTP Status |
|-----------|-------------|
| `OllamaConnectionException` | 503 Service Unavailable |
| `GeminiConnectionException` (401/403 inner) | 401 Unauthorized |
| `GeminiConnectionException` (other) | 503 Service Unavailable |
| `ConversationNotFoundException` | 404 Not Found |
| `InvalidMessageException` | 400 Bad Request |
| Unhandled | 500 Internal Server Error |

### Database

EF Core with PostgreSQL. Schema is created with `EnsureCreated()` at startup — no migration runner
needed for day-to-day development.

**Active tables:**
- `Conversations` — id, title, createdAt, updatedAt
- `Messages` — id, conversationId (cascade delete), role ("user"/"assistant"), content,
  inputMethod ("text"/"voice"), timestamp

**Phase 3 tables (server-side plugins — active):**
- `PluginRegistrations` — fully managed by `PluginService.cs` (full CRUD + auto-invoke via
  `TryAutoInvokeAsync`)

**Phase 5 stub tables (reserved for RAG):**
- `DataSources`, `RegisteredActions` — schema exists, not yet used by any service logic.

---

## AI Providers

### Selecting a Provider

Set `AIProvider:Provider` in `appsettings.json` (or an environment variable):

```json
"AIProvider": {
  "Provider": "Gemini",       // "Gemini" or "Ollama"
  "DefaultModel": "gemini-2.5-flash",
  "HistoryLimit": 10
}
```

The provider is selected once at application startup. Changing it requires a restart.

### Ollama (local, default)

- No API key required.
- `OllamaService` calls `POST /api/chat` with `{ model, messages, stream }`.
- Configure base URL: `Ollama:BaseUrl` (default `http://localhost:11434`).
- Common models: `phi3:mini`, `llama3`, `mistral`.

### Gemini (Google AI)

- Requires a valid API key.
- `GeminiService` uses Semantic Kernel registered via `AddGoogleAIGeminiChatCompletion(model, apiKey)`.
- **API key is read from the `GEMINI_API_KEY` environment variable** (injected into IConfiguration
  at startup in `Program.cs`). The `Gemini:ApiKey` entry in `appsettings.json` is intentionally
  blank — do not put the live key there.
- If neither the env var nor config provides the key, startup throws
  `InvalidOperationException: Gemini:ApiKey must be configured…`.

**Setting the environment variable:**

```powershell
# PowerShell — session only
$env:GEMINI_API_KEY = "YOUR_KEY"
dotnet run

# PowerShell — persistent (current user)
[System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "YOUR_KEY", "User")
```

```bash
# bash / WSL
export GEMINI_API_KEY="YOUR_KEY"
dotnet run
```

---

## Configuration (`appsettings.json`)

```json
{
  "AIProvider": {
    "Provider": "Gemini",
    "DefaultModel": "gemini-2.5-flash",
    "HistoryLimit": 10
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434"
  },
  "Gemini": {
    "ApiKey": ""
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:4200",
      "http://localhost:4300"
    ]
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=Chatbot;Username=postgres;Password=postgres"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": { "Microsoft": "Warning", "System": "Warning" }
    }
  }
}
```

---

## API Contract

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| POST | `/api/conversations` | — | `ConversationDto` (201) |
| GET | `/api/conversations` | — | `ConversationDto[]` ordered by `UpdatedAt` desc |
| GET | `/api/conversations/{id}` | — | `ConversationDto` with `messages[]` |
| DELETE | `/api/conversations/{id}` | — | 204 No Content |
| POST | `/api/chat/send-message` | `{conversationId, content, inputMethod}` | `ChatResponse` |
| GET | `/api/chat/stream/{id}` | `?message=` | SSE stream (`text/event-stream`) |
| POST | `/api/chat/stream-sdk` | `SdkStreamRequest` (JSON body) | SSE stream (`text/event-stream`) |
| GET | `/api/health` | — | `{status, ollamaReachable, timestamp}` |
| GET | `/api/plugins` | — | `PluginDto[]` |
| GET | `/api/plugins/{id}` | — | `PluginDto` |
| POST | `/api/plugins` | `CreatePluginRequest` | `PluginDto` (201) |
| PUT | `/api/plugins/{id}` | `UpdatePluginRequest` | `PluginDto` |
| DELETE | `/api/plugins/{id}` | — | 204 No Content |
| PATCH | `/api/plugins/{id}/toggle` | — | `PluginDto` (toggles `IsActive`) |
| POST | `/api/plugins/{id}/execute` | `{parameters}` | `PluginExecuteResult` |

**`SendMessageRequest` constraints:** `content` 1–10 000 chars; `inputMethod` max 20 chars.
Optional SDK fields (always null from the main chatbot-app): `hostContext: Dictionary<string,string>`,
`hostActions: List<HostActionDescriptor>`.

**`SdkStreamRequest`:** `{conversationId, content, inputMethod, hostContext?, hostActions?}` —
used by the `chatbot-plugin` library. Unlike the GET stream endpoint, this is a POST so it can
carry a JSON body (EventSource cannot send a body).

**`ChatResponse`:** `{ id, conversationId, content, role, timestamp }`

**SSE format:** each event is `data: "<json-encoded-string-chunk">\n\n`. Sentinel events:
`data: "[DONE]"` (stream complete) and `data: "[STREAM_ERROR]:<message>"` (error after stream started).
The `chatbot-plugin` uses `fetch()` + `ReadableStream` (not `EventSource`) to parse POST SSE.

---

## Frontend Architecture

**Angular 21 quirks in this project:**
- Uses **NgModule** (not standalone) — new components must have `standalone: false` in
  `@Component` explicitly.
- `app.ts` / `app-module.ts` (not `app.component.ts` / `app.module.ts`) — Angular 21 changed
  default file naming.
- All components declared in `src/app/app-module.ts`.
- **`zone.js` is NOT listed in `package.json`** — this project runs without zone-based change
  detection. Always call `this.cdr.detectChanges()` explicitly after any async operation that
  updates component state. Failing to do so means the template will not re-render.
- `app.html` is the default Angular scaffold placeholder — it is **not used**. `app.ts` uses
  `template: '<app-chatbot></app-chatbot>'`.
- `src/environments/environment.ts` — `apiUrl: 'http://localhost:5112'` (dev);
  `environment.prod.ts` uses `apiUrl: '/api'`.

### Components

| Component | Selector | Purpose |
|-----------|----------|---------|
| `ChatbotComponent` | `app-chatbot` | Container — layout, conversation state, send/stream coordination |
| `ConversationListComponent` | `app-conversation-list` | Sidebar list with create/delete |
| `MessageItemComponent` | `app-message-item` | Renders a single message bubble; play/pause TTS per message |
| `MessageInputComponent` | `app-message-input` | Textarea, send, STT mic toggle, char counter |
| `TypingIndicatorComponent` | `app-typing-indicator` | Animated "..." while waiting for response |
| `VoiceSettingsComponent` | `app-voice-settings` | Auto-play toggle, voice selector, speed/pitch sliders |

### Services

- `chatbot/services/conversation.service.ts` — owns `BehaviorSubject<Conversation[]>` state; all
  CRUD goes through here so the sidebar auto-updates.
- `chatbot/services/chat.service.ts` — `sendMessage()` (HTTP POST) and `streamMessage()`
  (EventSource SSE). `sendMessage()` passes `inputMethod` to the backend so voice vs text is
  recorded.
- `chatbot/services/voice.service.ts` — STT and TTS wrapper (see Voice section below).
- `interceptors/error.interceptor.ts` — catches `status === 0` (network unreachable) and shows a
  `MatSnackBar` toast.

### Data flow

`ChatbotComponent` (container) → `ConversationService` (BehaviorSubject state) + `ChatService`
(HTTP/SSE) → backend API

---

## Voice Assistant Features

Voice support is implemented entirely in the browser using the Web Speech API. No backend changes
are required. Both STT and TTS availability are feature-detected at runtime.

### Speech-to-Text (STT)

- `VoiceService.startListening()` / `stopListening()` wrap `SpeechRecognition`.
- Configured: `continuous = true`, `interimResults = true`, `lang = 'en-US'`.
- Transcript is published to `transcript$` (BehaviorSubject). `MessageInputComponent` subscribes
  and updates `content` in real time as words are recognised.
- The final transcript event fires **after** `isListening` flips to false — the subscription must
  stay alive until after `stop()` returns to capture it.
- When a message is sent via voice, `inputMethod = 'voice'` is passed to the backend and persisted
  on the `Message` row.

### Text-to-Speech (TTS)

- `VoiceService.speak()` wraps `SpeechSynthesisUtterance`.
- Text is sanitised before speaking: emojis, markdown headings, bold/italic markers, inline code,
  links, underscores, strikethrough, and blockquote markers are stripped.
- `speakMessage(messageId, text)` sets `activeMessageId$` so `MessageItemComponent` can highlight
  the currently speaking message.
- Controls: `pause()`, `resume()`, `stop()`.

### User Settings (persisted in `localStorage`)

| Key | Default | Description |
|-----|---------|-------------|
| `voice_autoplay` | `false` | Auto-speak each AI response |
| `voice_preferred_name` | `''` | Selected voice name |
| `voice_rate` | `1` | Speech rate (0.5–2×) |
| `voice_pitch` | `1` | Speech pitch (0.5–2×) |

### VoiceSettingsComponent (toolbar UI)

- Auto-play slide toggle.
- Voice dropdown (all voices available in the browser).
- "Tamil Voice" button — calls `autoSelectTamilVoice()` which finds the first voice with
  `lang.startsWith('ta')` and sets rate 0.9, pitch 0.85.
- Speed and pitch range sliders (0.5–2, step 0.05).

---

## Chatbot Plugin SDK (`projects/chatbot-plugin/`)

The chatbot is embeddable as an Angular library in other apps (CRMs, ERPs, internal tools).

### Architecture

```
Host App imports ChatbotPluginModule.forRoot({ apiUrl, enableVoice, ... })
     ↓
<chatbot-widget [context]="{ userId, role }" theme="floating">
     ↓  POST /api/chat/stream-sdk
ChatbotAPI — injects hostContext + hostActions into system prompt
     ↓  AI responds with {"action_call": {"name": "...", "parameters": {...}}}
SDK intercepts action_call → runs host's JS callback → feeds result back to AI
     ↓
AI responds in natural language → displayed to user
```

### Library structure

```
projects/chatbot-plugin/src/lib/
├── models/
│   ├── plugin-config.interface.ts     — PluginConfig { apiUrl, enableVoice, theme, title, ... }
│   ├── host-action.interface.ts       — HostAction (with execute fn) + HostActionDescriptor (serializable)
│   ├── sdk-message.interface.ts       — SdkMessage { id, role, content, isStreaming, isError, ... }
│   └── sdk-stream-request.interface.ts
├── tokens/plugin-config.token.ts      — PLUGIN_CONFIG InjectionToken
├── services/
│   ├── action-registry.service.ts     — registerAction/unregisterAction/getActionDescriptors (NOT providedIn root)
│   ├── sdk-conversation.service.ts    — lazy conversation creation, one ID per widget lifetime
│   ├── sdk-chat.service.ts            — fetch() + ReadableStream POST SSE (not EventSource)
│   └── sdk-voice.service.ts           — copy of VoiceService, NOT providedIn root
└── components/
    ├── chatbot-widget/                — floating FAB or inline panel; action_call interception loop
    ├── sdk-message-item/              — message bubble with TTS speak button
    ├── sdk-message-input/             — textarea + send + optional mic button
    └── sdk-typing-indicator/          — animated dots while streaming
```

### Key design rules for the library

- All components: `standalone: false`, `ChangeDetectionStrategy.OnPush`, `cdr.detectChanges()` after every state mutation (no zone.js)
- CSS: all classes prefixed `cp-` to avoid host app style collisions
- Services are **not** `providedIn: 'root'` — declared in `ChatbotPluginModule.providers` so each widget boundary gets its own instance
- `ActionRegistryService.getActionDescriptors()` strips the `execute` function before sending to backend

### Host app integration

```typescript
// app.module.ts
ChatbotPluginModule.forRoot({
  apiUrl: 'http://localhost:5112',
  enableVoice: true,
  theme: 'floating',
  title: 'Support Assistant'
})

// template
<chatbot-widget [context]="{ userId: '42', role: 'admin' }" theme="floating">
</chatbot-widget>

// register host actions
actionRegistry.registerAction({
  name: 'getOrders',
  description: 'Returns recent orders for the current customer',
  parameterSchema: '{"customerId": "string"}',
  execute: (params) => orderService.getOrders(params['customerId'])
});
```

### action_call flow

1. AI streams a response matching `/^\s*\{"action_call"/`
2. Widget intercepts, shows `[Executing <name>...]`
3. Calls `hostAction.execute(parameters)` — runs host app's JavaScript callback
4. Sends `"Action result for <name>: <result>"` back to AI via a hidden second stream call
5. AI responds naturally — displayed to user

---

## Standalone Widget (`standalone-widget/`)

A framework-agnostic Web Component (pure vanilla JavaScript, zero dependencies) for embedding the
chatbot into **any** application — Angular 9+, React, Vue, or plain HTML. Unlike the
`chatbot-plugin` Angular library (which requires Angular 21), this works with any framework.

### Key facts

- Shadow DOM for full style isolation — no host app CSS bleeds in
- Floating FAB or inline embed controlled by the `floating` attribute
- Voice input/output via Web Speech API
- ~10 KB minified, ~4 KB gzipped; zero external dependencies

### Build commands

```bash
cd chatbot-app/standalone-widget
npm install
npm run build   # → dist/chatbot-widget.js + dist/chatbot-widget.min.js
npm run serve   # dev server at http://localhost:8080/demo.html
```

### Usage (any framework)

```html
<script src="chatbot-widget.min.js"></script>
<chatbot-widget
  api-url="http://localhost:5112/api/chat"
  title="AI Assistant"
  floating="true"
  enable-voice="true">
</chatbot-widget>
```

### Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `api-url` | `http://localhost:8000/api/chat` | Backend API endpoint |
| `title` | `AI Assistant` | Widget header title |
| `floating` | `true` | `true` = floating FAB; `false` = inline embed |
| `enable-voice` | `true` | Enable STT/TTS |

### Angular 9+ integration steps

1. Copy `dist/chatbot-widget.min.js` → `src/assets/js/`
2. Add to `angular.json` under `scripts`
3. Add `CUSTOM_ELEMENTS_SCHEMA` to your `NgModule`
4. Use `<chatbot-widget ...>` in any template

See `standalone-widget/README.md` and `standalone-widget/ANGULAR9_GUIDE.md` for full details
including React and Vue examples.

---

## Phase Roadmap (Architecture Decisions)

- **Phase 2 — DONE** — Voice input/output via Web Speech API; Gemini as a second AI provider; `inputMethod` tracked per message.
- **Phase 3 — DONE** — Server-side plugins: full CRUD via `PluginsController` + `PluginService`; `TryAutoInvokeAsync` in `ChatService` detects `plugin_call` JSON and calls registered plugin HTTP endpoints.
- **Phase 4 — DONE** — Chatbot Plugin SDK (`chatbot-plugin` Angular library) + Standalone Web Component (`standalone-widget`); `POST /api/chat/stream-sdk`; host context + host action callbacks; floating/inline widget.
- **Phase 5 (next) — RAG**: add `pgvector` extension + `dotnet ef migrations add AddVectorSearch`; `EmbeddingService` + `RAGService` with Ollama `nomic-embed-text` model; Semantic Kernel function calling integrates into `ChatService`.

---

## Known Bugs Fixed (session Mar 2026)

- `selectConversation`: `!conversation.messageCount` was truthy for `undefined` — changed to
  `=== 0` so messages load even when `messageCount` is missing.
- `sendMessage`: missing conversation-ID guard in async callbacks — response from a stale
  in-flight request was pushed to the wrong conversation's `messages` array; fixed by capturing
  `conversationId` before the call and guarding `next`/`error` callbacks.
- `MessageInputComponent`: `content` was not cleared on conversation switch (component is reused,
  not destroyed); added `reset()` method called from `selectConversation`.
- `cdr.detectChanges()` missing after `this.conversations = convs` and after
  `this.messages = conv.messages` — template was not re-rendering due to zoneless environment.
- STT final transcript dropped: the `transcript$` subscription was torn down on `stopListening()`,
  but the final `onresult` event fires after `onend`. Fixed by keeping the subscription alive
  until the next recording session starts or the message is sent.
