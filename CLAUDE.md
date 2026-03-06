# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise AI chatbot system. Angular 21 frontend talks to a .NET 8 Web API backend that supports
two swappable AI providers (Ollama local LLM or Google Gemini), and persists conversations in
PostgreSQL.

```
ChatbotSystem/
├── ChatbotAPI/        ← .NET 8 Web API (port 5112)
└── chatbot-app/       ← Angular 21 frontend (port 4200)
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

DI wiring, middleware pipeline, CORS (`localhost:4200`), `EnsureCreated()` on startup.
Provider selection happens at startup time — the active provider is compiled into the DI container.

Reads `GEMINI_API_KEY` environment variable and injects it into `IConfiguration["Gemini:ApiKey"]`
before validation, so the rest of the app reads the key from config only.

### Services

- `Services/Interfaces/IAIProvider.cs` — interface with `GenerateResponseAsync` and
  `StreamResponseAsync`. `ChatMessage` record (Role, Content) is also defined here.
- `Services/ChatService.cs` — `SendMessageAsync` and `StreamMessageAsync`. Prepends a system
  prompt ("You are a helpful AI assistant. Be concise, accurate, and friendly."), appends the last
  `HistoryLimit` messages from the conversation, then calls `IAIProvider`. Persists user and
  assistant messages. Auto-titles the conversation from the first message content (first 50 chars).
- `Services/OllamaService.cs` — HTTP client to Ollama at `http://localhost:11434`. Calls
  `/api/chat` for both regular and streaming requests. Timeout: 5 minutes.
- `Services/GeminiService.cs` — Uses Semantic Kernel `IChatCompletionService` registered via
  `AddGoogleAIGeminiChatCompletion`. Converts `ChatMessage` list to Semantic Kernel `ChatHistory`.

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

**Stub tables (Phase 3 / Phase 4 forward-compatibility):**
- `PluginRegistrations`, `DataSources`, `RegisteredActions` — schema exists, not yet used by any
  service logic.

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
| GET | `/api/health` | — | `{status, ollamaReachable, timestamp}` |

**`SendMessageRequest` constraints:** `content` 1–10 000 chars; `inputMethod` max 20 chars
(values: `"text"` or `"voice"`).

**`ChatResponse`:** `{ id, conversationId, content, role, timestamp }`

**SSE format:** each event is `data: "<json-encoded-string-chunk">\n\n`. The frontend
`EventSource` parses each chunk with `JSON.parse`.

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

## Phase Roadmap (Architecture Decisions)

Phase 1 (current) is deliberately structured for later phases:

- **Phase 2 (current)** — Voice input/output via Web Speech API; Gemini as a second AI provider;
  `inputMethod` tracked per message.
- **Phase 3 — Plugins**: `IAIProvider` is swappable; stub DB tables (`PluginRegistrations`,
  `DataSources`, `RegisteredActions`) already in schema; `ChatService.SendMessageAsync` is the
  single entry point where intent detection will plug in.
- **Phase 4 — RAG**: PostgreSQL is already running; add `pgvector` extension +
  `dotnet ef migrations add AddVectorSearch`; Semantic Kernel function calling integrates into
  `ChatService`.

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
