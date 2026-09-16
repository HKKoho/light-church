# ClearClawix — IP Audit & Rewrite Plan

**Purpose:** Document which parts of this codebase are derived from the public
upstream (`ClawixAI/clawix`, MIT licensed) and which are original, so that a
buyer can receive clean-title assignment with no third-party copyright
obligations. Also outlines the short-term rewrite tasks that eliminate the
remaining upstream dependency entirely.

---

## 1. Background

`ClawixeaServer` was built starting from, or in parallel with, the open-source
project `ClawixAI/clawix` (MIT, first pushed 2026-04-08, last upstream push
2026-08-10, 25 stars). Both share the same monorepo layout, tech stack, package
names, and lifecycle scripts.

The local repo was initialized on **2026-06-03** (commit `c4bf10e`). By
**2026-09-16** it has grown to ~261,000 lines of TypeScript across five packages
— roughly **2.5 × the upstream size**.

| Metric | Upstream (ClawixAI/clawix) | This repo |
|---|---|---|
| First commit | 2026-04-08 | 2026-06-03 |
| Last push | 2026-08-10 | 2026-09-16 |
| Est. TS lines | ~105,000 | ~261,500 |
| Prisma migrations | ~40 | ~65 |
| API modules (packages/api/src/) | ~22 | ~34 |
| packages/engine (own package) | No | Yes |
| gRPC / HAProxy / MQTT / A2A | No | Yes |

---

## 2. What `git log --follow` Means

`git log --follow <file>` traces the full history of a single file, following
it through renames and moves. It answers "when did this file first appear in
this repo and was it ever renamed?"

For this audit the relevant command is:

```bash
# See when a file was first introduced and by which commit
git log --oneline --diff-filter=A --follow -- packages/api/src/auth/auth.service.ts

# See every commit that touched a file
git log --oneline --follow -- packages/engine/src/engine/reasoning-loop.ts
```

Files that trace back to commit `c4bf10e` ("initial commit — Clawix multi-agent
platform with HA layer", 2026-06-03) are the upstream-seed files. Files first
introduced in later commits are original additions.

---

## 3. Upstream-Derived Files (require rewrite for clean title)

These modules were present in the initial commit and correspond structurally
to files that exist in `ClawixAI/clawix`. MIT obliges nothing more than keeping
the copyright notice — but for clean-title assignment, these are the targets.

### 3.1 Core Engine — highest priority

| File | Lines | Why it matters |
|---|---|---|
| `packages/engine/src/engine/reasoning-loop.ts` | ~385 | Central LLM ↔ tool loop |
| `packages/engine/src/engine/container-runner.ts` | ~641 | Docker CLI management |
| `packages/engine/src/engine/agent-runner.service.ts` | ~1,092 | 22-step run lifecycle |
| `packages/engine/src/engine/container-pool.service.ts` | ~432 | Warm container pool |
| `packages/engine/src/engine/context-builder.service.ts` | ~548 | System prompt assembly |
| `packages/engine/src/engine/compressor.ts` + `microcompact.ts` | ~280 | Context window compression |
| `packages/engine/src/engine/skill-loader.service.ts` | — | SKILL.md loader |
| `packages/engine/src/engine/memory-consolidation.service.ts` | — | Post-run memory write-back |

**Note:** The `packages/engine` package itself (its Prisma schema, gRPC module,
fine-tuning pipeline, identity module, MCP integration, tools/spawn.ts) was
built entirely in this repo — only the eight files above are upstream-seed.

### 3.2 API — auth, agents, channels (medium priority)

| Path | Approx lines | Notes |
|---|---|---|
| `packages/api/src/auth/` (excl. `quantum-jwt.service.ts`, TOTP methods) | ~800 | JWT strategy, guards, login/register |
| `packages/api/src/agents/` | ~436 | Agent CRUD controller/service |
| `packages/api/src/channels/` (base manager + web adapter) | ~700 | Channel registry, message router, web WebSocket |
| `packages/api/src/common/` | ~578 | Crypto helper, throttle, audit interceptor |
| `packages/api/src/app.module.ts` | ~111 | NestJS module wiring |
| `packages/api/src/bootstrap.ts` | ~350 | Fastify setup |

**Already original within these files:** `quantum-jwt.service.ts`, all TOTP
methods in `auth.service.ts`, Slack adapter, MQTT-aware channel wiring,
`policy-feature.guard.ts`.

### 3.3 Database repositories (lower priority — largely safe)

`packages/api/src/db/` (~4,258 lines) holds Prisma repositories for every
model. Most models (gRPC nodes, A2A tasks, MQTT peers, MCP servers, fine-tuning
jobs, tool-approval requests, tokenization) were added in this repo and are
entirely original. The repositories for `User`, `AgentDefinition`, `AgentRun`,
`Channel`, `Group`, `AuditLog`, `Policy`, and `Session` correspond to upstream
models and their repositories.

### 3.4 Shared package

`packages/shared/src/` — Zod schemas, provider registry, logger. The logger and
base provider-registry pattern are upstream-derived; the A2A schemas, DID types,
tokenization schemas, and industry-pack types are original.

### 3.5 Web frontend scaffold

`packages/web/src/` — Next.js pages, components, hooks. The dashboard layout,
authentication pages, agents list, and conversation view are upstream-derived
scaffolding. Pages for governance (HA nodes, MQTT federation, A2A, MCP, tool
approval, TOTP, fine-tuning, identity) are original.

### 3.6 Worker package

`packages/worker/` — BullMQ consumer shell is upstream-derived. The engine
invocation and cross-node relay integration were added here.

---

## 4. 100% Original — No Upstream Counterpart

These modules, files, and packages do not exist in `ClawixAI/clawix` and are
fully owned by this repo. **No rewrite required.**

### API modules (packages/api/src/)
| Module | First commit | Description |
|---|---|---|
| `a2a/` | `c10ea60` | A2A protocol — DID auth, task queue, SSE stream |
| `identity/` | `c10ea60` | DID identity, peer discovery |
| `mcp/` | `ec869a5` | MCP server catalog, OAuth, stdio transport |
| `mqtt/` | `a66bb8c` | MQTT federation, mTLS, IP allow-list, audit |
| `notifications/` | `4c3617f` | In-app notification system |
| `provider-config/` | `4c3617f` | Per-org LLM provider configuration |
| `tokenization/` | `c10ea60` | Smart-contract tokenization layer |
| `tool-approval/` | `30d9ac0` | Human-gated tool approval workflow |

### Engine modules (packages/engine/src/engine/)
| File / directory | Description |
|---|---|
| `grpc/` | gRPC cluster node scheduling + mTLS |
| `identity/` | Node identity and peer signing |
| `mcp/` | MCP client in engine |
| `fine-tuning-*.ts` (4 files) | Fine-tuning export, formatting, job management, quality filter |
| `node-identity.service.ts` / `node-registry.service.ts` | Federated node management |
| `tool-approval.service.ts` | Human-gate integration in engine |
| `prompt-injection-scanner.ts` | Input sanitisation layer |
| `drift-monitor.ts` | Context drift detection |
| `recovery-loop.ts` + types | Agent recovery / resume loop |
| `tools/a2a-client.ts` | A2A outbound tool call |
| `tools/stream/` | Live token/tool-event SSE streaming |

### Infrastructure
| Path | Description |
|---|---|
| `infra/docker/haproxy/` | HAProxy load balancer with zero-downtime reload |
| `infra/docker/mosquitto/` + `mosquitto-proxy/` | MQTT broker + nginx-stream IP-filter proxy |
| `infra/docker/api/`, `worker/`, `web/` | Production Dockerfiles (built in this repo) |
| `infra/docker/python-runner/` | Python execution sidecar |
| `infra/launchd/` | macOS launchd smoke-test plist |
| `infra/nginx/` | PQC-TLS nginx config |

### Skills
| Skill | Description |
|---|---|
| `skills/builtin/node-provisioner/` | Autonomous node provisioning skill |
| `skills/builtin/federation-builder/` | Autonomous N-node cluster build skill |

### Docs & design artefacts
All files in `docs/agent-network/`, all `20260703_*` and later dated docs, and
`docs/ClearClawix.md` itself are original.

### Auth additions (within upstream-seed files)
- `packages/api/src/auth/quantum-jwt.service.ts` — entirely original
- TOTP methods in `auth.service.ts` — entirely original
- TOTP endpoints in `auth.controller.ts` — entirely original

---

## 5. Short-Term Rewrite Plan

**Goal:** Replace all upstream-seed code with original implementations so the
entire codebase carries no third-party copyright. Estimated effort: **3–4 weeks**
for one engineer familiar with the stack.

Work in dependency order — engine core first, then API, then shared/web.

---

### Phase R-1 — Engine core (Week 1)

These are the highest-value rewrite targets: the files the buyer would inspect
first for IP provenance.

| Task | File(s) | Approach |
|---|---|---|
| R-1-A | `reasoning-loop.ts` | Rewrite as an async generator loop; same interface, entirely new implementation. Keep: tool-dispatch logic (original additions). |
| R-1-B | `container-runner.ts` | Rewrite using Dockerode (Node Docker API library) instead of CLI shelling. Same security model (non-root 1000:1000, `--network none`, PID 256). |
| R-1-C | `container-pool.service.ts` | Rewrite pool as a priority-queue with configurable drain strategy; same interface. |
| R-1-D | `agent-runner.service.ts` | Rewrite the 22-step lifecycle orchestration. The HA additions (gRPC forwarding, heartbeat, stale-run reaper) are original and stay as-is. |
| R-1-E | `context-builder.service.ts` | Rewrite prompt assembly. The structure (identity + workspace + memory + wiki + skills) can be expressed as a pipeline of builder stages — a different architectural pattern from upstream. |
| R-1-F | `compressor.ts` / `microcompact.ts` | Rewrite summarisation prompts and sliding-window logic from scratch. |
| R-1-G | `skill-loader.service.ts` / `memory-consolidation.service.ts` | Rewrite loaders. The SKILL.md format (with `enabled-by-default` / `enable-requires` frontmatter) is original to this repo — keep the format, rewrite the parser. |

---

### Phase R-2 — API auth and wiring (Week 2)

| Task | File(s) | Approach |
|---|---|---|
| R-2-A | `auth/auth.service.ts` | Rewrite login/register/token refresh. Keep TOTP methods (original), keep `quantum-jwt.service.ts` (original). Replace bcrypt usage with argon2id for differentiation. |
| R-2-B | `auth/jwt.strategy.ts` + guards | Rewrite as a single NestJS `AuthGuard` with a pluggable verifier interface (supports both standard JWT and quantum JWT). |
| R-2-C | `app.module.ts` + `bootstrap.ts` | Rewrite NestJS module wiring and Fastify bootstrap. The guard ordering (JWT → Roles → PolicyThrottler) is a business decision that stays; only the wiring boilerplate changes. |
| R-2-D | `agents/agents.controller.ts` + `agents.service.ts` | Rewrite agent CRUD. Use CQRS pattern (Commands + Queries) for differentiation. |
| R-2-E | `common/` | Rewrite crypto helper (use Node 22 native `crypto.subtle` instead of custom AES helper), throttle config, audit interceptor. |

---

### Phase R-3 — Channels, repositories, shared (Week 3)

| Task | File(s) | Approach |
|---|---|---|
| R-3-A | `channels/` base | Rewrite `ChannelManagerService`, `MessageRouterService`, `ChannelRegistry`. Keep Slack, MQTT, Telegram adapters unchanged (original or heavily modified). |
| R-3-B | `db/` upstream-seed repositories | Rewrite the eight base repositories (`User`, `AgentDefinition`, `AgentRun`, `Channel`, `Group`, `AuditLog`, `Policy`, `Session`) using a typed `BaseRepository<T>` class. All post-init repositories (gRPC nodes, A2A, MCP, fine-tuning, etc.) stay unchanged. |
| R-3-C | `packages/shared/` | Rewrite logger (use `pino` directly with a typed wrapper) and provider registry (use a `Map`-based registry class). Keep all A2A, DID, tokenization, and system-settings schemas (original). |
| R-3-D | `packages/worker/` | Rewrite BullMQ consumer setup. Keep cross-node relay integration (original). |

---

### Phase R-4 — Web frontend (Week 4)

| Task | Files | Approach |
|---|---|---|
| R-4-A | Dashboard layout + auth pages | Rewrite the shell layout (sidebar, topbar, nav) using a different component library (e.g. shadcn/ui instead of whatever upstream used) or restructure the component tree. |
| R-4-B | Agents list / conversation view | Rewrite the two main views. Data-fetching hooks can be rewritten using TanStack Query for differentiation. |
| R-4-C | `packages/web/` scaffolding | `next.config.ts`, provider wrappers, API client. Rewrite from scratch. |

All governance pages (HA nodes, MQTT, A2A, MCP, tool approval, TOTP, fine-tuning,
identity) are **already original** — do not rewrite.

---

## 6. What Stays the Same (by design)

After the rewrite, these things remain unchanged because they are original to
this repo or are non-copyrightable:

- The **interface contracts** (same API endpoints, same WebSocket events, same
  Prisma schema column names) — data schemas and API contracts are not
  copyrightable.
- All **gRPC, MQTT, A2A, MCP, TOTP, tool-approval, fine-tuning, and HA code** —
  entirely original.
- All **skills** in `skills/builtin/` — the SKILL.md content is original prose.
- All **infrastructure** in `infra/` — entirely original.
- The **`packages/engine` package structure** — original architecture decision.

---

## 7. Effort Summary

| Phase | Target | Est. effort |
|---|---|---|
| R-1 | Engine core (7 files, ~3,600 lines) | 5–7 days |
| R-2 | API auth + wiring (5 tasks, ~2,300 lines) | 4–5 days |
| R-3 | Channels, repositories, shared (~5,200 lines) | 5–7 days |
| R-4 | Web scaffold (~TBD) | 3–5 days |
| **Total** | | **17–24 engineering days** |

At completion: **zero files in the repository trace copyright to any third
party**. The buyer receives full, unencumbered title to the entire codebase.

---

## 8. MIT Compliance Until Rewrite Is Complete

If the codebase is sold before the rewrite completes, MIT compliance requires
only one thing: keep the following text in the repository (e.g. in a
`NOTICES.md` or `LICENSE-UPSTREAM` file):

```
Portions of this software are derived from Clawix (https://github.com/ClawixAI/clawix)
Copyright (c) ClawixAI contributors
Licensed under the MIT License
```

That single notice satisfies the MIT license in full. The buyer can close-source
the product, charge for it, sublicense it, or do anything else — MIT imposes no
other restrictions.

---

*Audit performed 2026-09-16. Re-run `git log --diff-filter=A --oneline -- <path>`
on any file to verify its origin commit before the rewrite of that file begins.*
