# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm run dev              # Start API (:3001) + Web (:3000) with hot-reload
pnpm run build            # Build all packages
pnpm run lint             # ESLint + TypeScript type-check
pnpm run lint:fix         # Auto-fix lint issues
pnpm run format           # Prettier write
pnpm run typecheck        # Type-check only (builds shared + generates Prisma first)

# Testing
pnpm run test                            # Run all tests
pnpm run test:coverage                   # Tests with coverage (80% threshold enforced)
vitest run packages/api/src/engine/__tests__/agent-runner.service.test.ts  # Single test file

# Database
pnpm run db:migrate       # Prisma migrate dev + generate
pnpm run db:seed          # Seed initial data (reads .env for provider keys)
pnpm run db:studio        # Prisma Studio GUI
pnpm run db:reset         # Reset and re-migrate (destructive)

# Infrastructure (local dev)
pnpm run docker:dev       # Start Postgres (5433), Redis, pgAdmin
pnpm run docker:dev:down  # Stop local infra

# Production deployment
pnpm run install:clawix   # Interactive first-time setup: generates .env, builds images, starts stack
pnpm run update:clawix    # Rebuild + restart (use after git pull or config changes)
pnpm run update:clawix -- --pull    # git pull --ff-only, then rebuild + restart
pnpm run uninstall:clawix           # Remove containers/images/volumes
pnpm run uninstall:clawix -- --full # Also remove .env, data/, skills/custom/

# NGO-specific setup
node scripts/seed-ngo-agents.mjs    # Create five NGO specialist agents
node scripts/setup-ngo.mjs          # Seed 28-folder workspace structure + skill files
```

**Fresh clone setup order:**

1. `cp .env.example .env` and fill in keys
2. `pnpm install`
3. `pnpm --filter @clawix/shared run build`
4. `docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .`
5. `pnpm run docker:dev` (starts Postgres + Redis)
6. `pnpm run db:migrate && pnpm run db:seed`
7. `pnpm run dev`

**Before running `typecheck` or `build`**, `@clawix/shared` must be built first — the root `typecheck` script handles this automatically, but if running per-package, run `pnpm --filter @clawix/shared run build` first.

## Architecture

Clawix is a **self-hosted multi-agent AI orchestration platform** — every agent runs in its own isolated Docker container. The system is a pnpm monorepo with three packages:

- **`packages/api`** — NestJS 11 + Fastify server; handles all orchestration, auth, channels, engine, and database access.
- **`packages/web`** — Next.js 15 + Tailwind + shadcn/ui admin dashboard.
- **`packages/shared`** — cross-package types, Zod schemas, provider interfaces, and the logger. Must be built before API/web type-check.

### Core Engine (`packages/api/src/engine/`)

The engine is the critical path for every agent invocation:

1. **`AgentRunnerService`** — entry point; acquires a warm container from `ContainerPoolService`, builds context, and drives the reasoning loop.
2. **`ReasoningLoop`** — multi-turn LLM loop: calls provider → receives `assistant` or `tool_call` → dispatches to `ToolRegistry` → feeds result back. Terminates on text-only response or max iterations (default 40).
3. **`RecoveryLoop`** — wraps every `provider.chat()` call; classifies failures into retry (with jitter backoff), compress (transforms messages and retries), or surface (budgets exhausted or unrecoverable).
4. **`ContextBuilderService`** — assembles the system prompt each turn: agent SOUL.md + USER.md bootstrap files + skills manifest + visible memory items (capped ~2000 tokens).
5. **`SessionManagerService`** — one active session per `(userId, agentDefinitionId, channelId)`; persists `SessionMessage` with monotonic ordering; supports compaction. Three message-store variants: `message-store.ts` (base), `session-message-store.ts`, `task-run-message-store.ts`.
6. **`MemoryConsolidationService`** — triggers when a session exceeds 65,536 tokens; summarizes with an LLM; falls back to raw archival after 3 LLM failures.
7. **`ContainerPoolService` + `ContainerRunner`** — Docker-CLI-based container lifecycle; warm pool for primary agents (~50ms cold start); sub-agents are ephemeral. Hardened: UID 1000, `--network none`, PID 256, no-new-privileges, CPU 0.5/mem 512 MB.
8. **`CronSchedulerService`** — polls every 30s for due `Task` rows; `CronGuardService` enforces concurrency (20 global, 2 per user) and auto-disables tasks after 3 consecutive failures.

### Tool Registry (`packages/api/src/engine/tools/`)

Tools are registered TypeScript modules — not MCP (MCP is pending). Current tools: `shell`, `file-io` (read/write/edit/list), `memory`, `spawn` (creates sub-agent containers), `cron`, `web` (fetch + search with SSRF protection). All tool invocations run inside the agent container, never on the host.

### Channel System (`packages/api/src/channels/`)

Channels are pluggable adapters translating platform events into `InboundMessage` / `OutboundMessage`:

- **`ChannelManagerService`** — lifecycle (start/stop/reload); delivers async agent output back via Redis pub/sub.
- **`MessageRouterService`** — user lookup → auth check → command detection → concurrency guard (one run/user) → `AgentRunner`.
- **Telegram** (`grammy`, polling default or webhook) — supports voice messages (transcribed via OpenAI Whisper) with TTS replies.
- **Web** — WebSocket gateway on `/ws/chat` with JWT auth.
- **WhatsApp** — via `@whiskeysockets/baileys`.

### Providers (`packages/api/src/engine/providers/`)

Current providers: `anthropic-provider.ts`, `openai-provider.ts` (also handles Responses API for codex/gpt-5 models via `openai-responses-provider.ts`), `gemini-provider.ts`. Provider resolution goes through `provider-factory.ts` → `api-key-resolver.ts` (decrypts AES-256-GCM secrets). All LLM calls are funneled here for token accounting — never call providers directly from outside the engine.

### Skills System

Skills are filesystem-only knowledge packages (a directory + `SKILL.md`). Builtin skills live in `skills/builtin/`; user-created skills live in `<workspace>/skills/`. `SkillLoaderService` loads summaries at agent boot; full content is fetched only when the agent requests a skill. No database involvement — the filesystem is the sole source of truth.

### Invariants

- **No direct LLM calls outside the engine** — all provider calls go through `engine/providers/*` for token accounting.
- **No agent code on the host** — agents execute exclusively inside Docker sandboxes.
- **Append-only audit log** — `AuditLog` rows have no update/delete API surface.
- **Zod-validated inputs at the API boundary** — all request bodies go through Zod schemas in `packages/shared/src/schemas`.
- **Encrypted secrets** — provider API keys and channel secrets (e.g. `bot_token`) are AES-256-GCM encrypted via `PROVIDER_ENCRYPTION_KEY`.

### Configuration precedence

DB-backed config (cached 60s) → env vars → defaults. Required production env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PROVIDER_ENCRYPTION_KEY`, `CORS_ALLOWED_ORIGINS`. See `docs/SPEC.md §4` for the full table.

## Code Conventions

- **TypeScript strict mode** — `strict: true`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`. No `any`.
- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- **File size limit** — keep files under 400 LOC.
- **ESM throughout** — all packages use `"type": "module"`; use `.js` extensions in imports even for `.ts` source files (Node16 module resolution).
- **Shared logger** — use `createLogger('module:name')` from `@clawix/shared`, not `console.*`.

## Testing Notes

Tests use Vitest with SWC. Integration tests in `packages/api/src/__tests__/` require a running database — unit tests in subdirectory `__tests__/` folders mock dependencies. Coverage threshold is 80% across lines/functions/branches/statements.
