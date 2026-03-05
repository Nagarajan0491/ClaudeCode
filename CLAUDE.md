# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise AI chatbot system. Angular 21 frontend talks to a .NET 8 Web API backend, which routes messages through Ollama (local LLM) and persists conversations in PostgreSQL.

```
ChatbotSystem/
├── ChatbotAPI/        ← .NET 8 Web API (port 5000)
└── chatbot-app/       ← Angular 21 frontend (port 4200)
```

## Prerequisites

All three must be running before the app works end-to-end:

```bash
# PostgreSQL (Docker)
docker run -d --name chatbot-postgres \
  -e POSTGRES_PASSWORD=chatbot123 -e POSTGRES_DB=ChatbotDb \
  -p 5432:5432 postgres:16

# Ollama
ollama serve          # keep running in background
ollama pull llama2    # one-time model download
```

## Backend Commands (`ChatbotAPI/`)

```bash
cd ChatbotAPI

dotnet build                          # compile
dotnet run                            # start on http://localhost:5000
dotnet run --launch-profile https     # start with HTTPS

# EF Core migrations (run when adding/changing models)
dotnet ef migrations add <Name>
dotnet ef database update

# Add a NuGet package — IMPORTANT: pin to 8.x for EF Core / Npgsql
# (v10+ of those packages targets .NET 10, not net8.0)
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.x
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.x
```

Swagger UI available at `http://localhost:5000/swagger` in development.

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

**Do not add `tailwind.config.js`** — Angular 21 auto-detects it and attempts to use Tailwind v4 as a PostCSS plugin, which breaks the build. Tailwind v4 requires `@tailwindcss/postcss` instead.

## Backend Architecture

**Request flow:** `Controller → IChatService → IAIProvider (OllamaService) + IMessageRepository`

- `Program.cs` — DI wiring, middleware pipeline, CORS (`localhost:4200`), `EnsureCreated()` on startup
- `Services/Interfaces/` — `IAIProvider`, `IChatService`, `IConversationRepository`, `IMessageRepository` — add new capabilities by implementing these interfaces
- `Services/OllamaService.cs` — HTTP client to Ollama at `http://localhost:11434`; supports both regular (`/api/generate`) and SSE streaming
- `Services/ChatService.cs` — uses **Semantic Kernel `ChatHistory`** to build conversation-aware prompts before calling `IAIProvider`
- `Data/ChatDbContext.cs` — EF Core with PostgreSQL; stub tables for Phase 3/4 (`PluginRegistration`, `DataSource`, `RegisteredAction`) already in schema
- `Middleware/ExceptionHandlingMiddleware.cs` — maps `OllamaConnectionException → 503`, `ConversationNotFoundException → 404`, others → 500

**Configuration** (`appsettings.json`):
```json
{
  "Ollama": { "BaseUrl": "http://localhost:11434", "DefaultModel": "llama2" },
  "ConnectionStrings": { "DefaultConnection": "Host=localhost;Port=5432;Database=ChatbotDb;Username=postgres;Password=chatbot123" }
}
```

## Frontend Architecture

**Angular 21 quirks in this project:**
- Uses **NgModule** (not standalone) — new components must have `standalone: false` in `@Component` decorator explicitly
- `app.ts` / `app-module.ts` (not `app.component.ts` / `app.module.ts`) — Angular 21 changed default file naming
- All components declared in `src/app/app-module.ts`

**Data flow:** `chatbot.component.ts` (container) → `ConversationService` (BehaviorSubject state) + `ChatService` (HTTP) → backend API

- `chatbot/services/conversation.service.ts` — owns the reactive conversation list (`BehaviorSubject<Conversation[]>`); all CRUD goes through here so the sidebar auto-updates
- `chatbot/services/chat.service.ts` — `sendMessage()` (HTTP POST) and `streamMessage()` (EventSource SSE)
- `interceptors/error.interceptor.ts` — catches `status === 0` (network unreachable) and shows `MatSnackBar` toast
- `src/environments/environment.ts` — `apiUrl: 'http://localhost:5000'` (dev); production uses `apiUrl: '/api'`
- Proxy config in `proxy.conf.json` routes `/api/*` → `localhost:5000` during `ng serve`

## API Contract

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations` | List all (ordered by `UpdatedAt` desc) |
| GET | `/api/conversations/{id}` | Get with full message history |
| DELETE | `/api/conversations/{id}` | Delete (cascades messages) |
| POST | `/api/chat/send-message` | `{conversationId, content, inputMethod}` → response |
| GET | `/api/chat/stream/{id}?message=` | SSE token streaming |
| GET | `/api/health` | `{status, ollamaReachable, timestamp}` |

## Phase Roadmap (Architecture Decisions)

Phase 1 (current) is deliberately structured for later phases:
- **Phase 3 — Plugins**: `IAIProvider` is swappable; stub DB tables already exist; `ChatService.SendMessageAsync` is the single entry point where intent detection will plug in
- **Phase 4 — RAG**: PostgreSQL is already running; add `pgvector` extension + `dotnet ef migrations add AddVectorSearch`; Semantic Kernel function calling integrates into `ChatService`
