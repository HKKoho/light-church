# Phase 3 Development Plan — Absorbing the Sunday-School AI Prototypes

This document plans how to bring the capabilities of two standalone prototype
apps — `ai-sunday-school.vercel.app` and `ai-admin-sunday-school.vercel.app` —
under Light Church / Clawix orchestration, instead of linking or iframing them
as-is. It follows the `docs/PHASE2.md` convention: numbered items, each with
Status/Priority/Effort, so they can be picked up independently.

---

## Investigation summary

Both apps were fetched and their built JS bundles (Vite output, no source
available — no repo, no sourcemaps) were inspected directly, since neither
app exposes an API or documentation. Findings:

**`ai-sunday-school.vercel.app`** — "基督教主日學AI" (Christian Sunday School
AI), zh-Hant / en. A **student-facing Biblical Hebrew & Greek language-learning
tool**:
- Letter/vocabulary lessons, pronunciation practice using the browser's speech
  recognition (mic permission, Chrome/Edge/Safari only) with AI-scored feedback
- "Character Decision Game" — choose-your-own-adventure scenarios built on
  biblical figures (Abraham, Elijah, Daniel, etc.)
- Quiz generation ("100-word listening challenge", vocabulary quizzes)
- YouTube-video-to-quiz conversion (via Google's "Opal" app)
- Free-form chat with an AI tutor persona, grounded with Google Search
- Progress tracked as "Hebrew Progress" / "Greek Progress" / mastery level —
  **stored in `localStorage` only**, per browser, not per person

**`ai-admin-sunday-school.vercel.app`** — "主日學教師支援" (Sunday School
Teacher Support). Despite the name, this is a **much broader church-admin
prototype**, not just Sunday school:
- Pastoral care AI assistant + sensitive-questionnaire generator
- "WhatsApp secretary" — QR-code connect flow, forwards receipts/invoices
- Attendance CSV upload + AI trend analysis (PandasAI/OpenAI mentioned in UI copy)
- Manual bookkeeping / receipts / financial transaction entry, with UI copy
  telling the user to "make sure the bookkeeping backend server is running
  locally or deployed to the cloud" — i.e. it expects an external service that
  isn't this app
- Event planning that "publishes to the church website" once confirmed
- Mentorship/legacy AI advisor persona
- PDF upload → AI analysis → regenerated PDF
- Sunday-school class scheduling ("查看及管理季度課程表與安排" — view/manage
  the quarterly curriculum schedule)
- Login screen literally says "Demo: use any email and password"

**Architecture, both apps:**
- Vite + React 19, pulling `react`/`react-dom`/`@google/genai` from
  `aistudiocdn.com` at runtime (no bundled deps) — consistent with apps
  exported from Google AI Studio / Opal rather than hand-built
- Call `generativelanguage.googleapis.com` **directly from the browser**, with
  a **hardcoded Gemini API key baked into the shipped JS bundle**:
  - student app: `AIzaSyDJS5...MmlRR8`
  - admin app: `AIzaSyCFwO...HX91rL0`
  - Anyone can extract these from the public bundle and use your quota. This
    is independent of anything else in this plan — **rotate/revoke both keys
    in Google AI Studio now**, whether or not the rest of this plan proceeds.
- No backend of their own. All persistence is `localStorage`. Auth is a demo
  stub. No audit trail, no admin visibility into another user's data, no
  cross-device sync.
- A third related app is referenced in the admin bundle:
  `whatsapp-secretary-ai.vercel.app` — same family, not separately
  investigated here since Light Church already has a native WhatsApp channel
  (`packages/api/src/channels`, via `baileys`).

## Why not just link/iframe them

Every one of Clawix's stated invariants (`CLAUDE.md`) cuts against embedding
these as-is:
- *"No direct LLM calls outside the engine"* — both apps call Gemini directly
  from client JS with an exposed key; token accounting and provider
  encryption are bypassed entirely.
- *"Zod-validated inputs at the API boundary"* / *"Append-only audit log"* —
  neither exists; `localStorage` has no audit trail and no admin visibility.
- Demo-only auth means there's no way to tie usage to a real `User` row, so
  RBAC (`@Roles`) can't apply.
- Data (pronunciation progress, attendance CSVs, financial receipts) never
  reaches Postgres, so nothing shows up on the dashboards this repo already
  has for membership/finance/attendance.

The `projector-creator` sandbox (Light Church's existing mechanism for
embedding self-contained interactive tools) is also not a fit for the
AI-driven parts: Projector iframes explicitly **forbid `fetch()`/network
calls** (`skills/builtin/projector-creator/SKILL.md:14`), so pronunciation
feedback, AI chat, and quiz generation can't run inside one. Projector is
only viable for the fully-static, no-AI subset (e.g. a pre-written character
decision game with baked-in branching, no live scoring).

**Recommendation:** treat these two apps as validated prototypes / feature
specs, not as code to port. Rebuild each capability natively through the
existing Clawix agent/skill/DB architecture, reusing what already overlaps
and adding only the genuinely new piece (Hebrew/Greek pronunciation
learning).

## Feature-parity map

| Prototype feature | Already covered natively? | Plan item |
|---|---|---|
| Pastoral care AI + sensitive questionnaires | Yes — `skills/builtin/pastoral-care` | none needed |
| WhatsApp "secretary" (QR connect, forward receipts) | Yes — native WhatsApp channel (`baileys`) | none needed; verify admin UI exposes a connect flow (P3-05) |
| Event planning → publish to site | Yes — `church-admin-event-planner`, `church-admin-calendar` | none needed |
| Mentorship/legacy AI persona | Partial — general chat via any agent | none needed, low value to formalize |
| Bookkeeping / receipts entry | **Guidance-only today** — `finance-steward`/`church-admin-finance-steward` explicitly generate templates, never store real figures | P3-01 (optional, low priority — real bookkeeping is a deliberate non-goal per those skills' `data_sensitivity` stance; confirm with user before building) |
| Attendance CSV + AI trend analysis | **Gap** — membership skill is guidance-only, no real headcount storage | P3-02 |
| Sunday-school class/curriculum scheduling | **Gap** — `church-sunday-school` skill drafts lesson content but has no persisted class list/schedule | P3-03 |
| PDF upload → AI analysis/regeneration | Partial — agents can read/write files via `file-io`; no dedicated PDF-analysis flow | not planned; low value vs. effort |
| Biblical Hebrew/Greek pronunciation learning | **Net-new** — nothing like this exists | P3-04 |
| YouTube-to-quiz | **Net-new**, smaller scope | P3-06 (optional stretch) |

---

## P3-01 — (Optional) Native bookkeeping / receipts

**Status:** Proposed, needs explicit user decision
**Priority:** Low
**Effort:** Medium

### Background

`finance-steward` and `church-admin-finance-steward` currently store **no**
real financial data by design (`data_sensitivity: financial`, explicit "never
stores actual financial figures" in the skill description). The admin
prototype does real receipt/transaction entry. Building this natively would
be a deliberate reversal of an existing design decision, not just a gap-fill.

**Do not implement without confirming with the user first** — this changes
the data-sensitivity posture of the finance skills.

---

## P3-02 — Attendance tracking + AI trend analysis

**Status:** Proposed — supersedes/absorbs the attendance half of the earlier
`stateless-wiggling-graham` plan (worship-service + service-attendance models)
**Priority:** Medium
**Effort:** Medium

### Plan

Reuses the design already drafted in the prior session's saved plan
(`WorshipService`, `ServiceAttendance` Prisma models, aggregate-only —
headcounts and breakdown counts, never names, matching the existing
no-PII stance in `church-admin-membership`):

1. Prisma models `WorshipService` / `ServiceAttendance` (see prior plan for
   exact shape) — `pnpm run db:migrate`.
2. Zod schemas in `packages/shared/src/schemas/` (`worship-service.schema.ts`,
   `service-attendance.schema.ts`), exported from `index.ts`.
3. `packages/api/src/db/worship-service.repository.ts` +
   `service-attendance.repository.ts`, mirroring `task.repository.ts`'s
   multi-record CRUD style (not `congregation-profile.repository.ts`'s
   singleton style — there can be many services/records).
4. `packages/api/src/worship-services/` module (controller/service/module),
   mirroring `packages/api/src/congregation-profile/` for Zod-pipe + RBAC
   conventions; `@Roles(super_admin, senior_pastor, pastor, admin_staff,
   ministry_leader)`.
5. CSV upload endpoint accepts a CSV of `date,headcount[,adults,children,visitors]`
   rows (server-side parse — do **not** let an agent container touch the raw
   file directly; agent containers have no DB-query tool per
   `container-runner.ts:11`).
6. On each new attendance record, write `church-admin/context/attendance-trend.json`
   (last ~8 records) into the workspace via a small `writeWorkspaceContext`
   helper (see P3-02a below), so `church-admin-membership`'s existing
   guidance skill can turn it into a pastoral-facing trend note — this is
   the "AI trend analysis" feature, done through the engine's provider
   funnel instead of client-side PandasAI/OpenAI.

### P3-02a — Workspace context writer (shared prerequisite)

Small new helper, `packages/api/src/engine/workspace-context-writer.ts`,
used by both P3-02 and P3-03:

```ts
export async function writeWorkspaceContext(
  userAgentRepo: UserAgentRepository,
  userId: string,
  agentDefinitionId: string,
  relativeFilePath: string,
  data: unknown,
): Promise<void> { ... }
```

**Correction vs. the prior session's plan:** `UserAgentRepository.findByUserId(userId)`
(`packages/api/src/db/user-agent.repository.ts:76`) filters to
`agentDefinition: { role: 'primary' }` — it will **not** resolve the workspace
for `church-sunday-school` or any other `role: 'worker'` agent, which is what
both `church-sunday-school` and the admin-coordinator's sub-skills are seeded
as (`prisma/seed-church-agents.ts:413`, `role: 'worker'`). The context writer
must take `agentDefinitionId` explicitly and look up the `UserAgent` by the
`(userId, agentDefinitionId)` pair (add a
`findByUserAndAgent(userId, agentDefinitionId)` method to
`UserAgentRepository` — `existsForUser` already queries that exact pair, so
this is a small addition, not new plumbing), rather than relying on the
primary-only lookup.

---

## P3-03 — Sunday-school class & curriculum scheduling

**Status:** Proposed — supersedes the Sunday-school half of the earlier plan
**Priority:** Medium
**Effort:** Small–Medium

### Plan

1. Prisma model `SundaySchoolClass` (age group enum, class name, teacher name
   as free text — no `Member` FK, no roster — curriculum theme, last-lesson
   file path) exactly as scoped in the prior session's plan.
2. `sunday-school-class.schema.ts` in shared schemas.
3. `packages/api/src/sunday-school/` module — CRUD, same RBAC band as P3-02.
   Every write refreshes `sunday-school/context/classes.json` via the P3-02a
   context writer (with `church-sunday-school`'s actual `agentDefinitionId`).
4. Additive note in `skills/builtin/church-sunday-school/SKILL.md`: when
   invoked with a current class-list context file present, generate one
   lesson per class into `sunday-school/lessons/<ageGroup>/<date>.md` instead
   of asking interactively — mirrors the existing convention used by
   `church-sermon-prep` reading prior context from `discipleship/sermons/`.
5. Dashboard page (`packages/web/src/app/(dashboard)/sunday-school/`) listing
   classes and their last-generated lesson, matching the existing
   Ministries/Stewardship/Kingdom-Impact page pattern described in `README.md`.

This is the natively-governed replacement for the prototype's "quarterly
schedule" screen — same feature, but the class list is a real DB table an
admin can see and edit, not text typed into a chat each time.

---

## P3-04 — Biblical Hebrew/Greek pronunciation learning (net-new)

**Status:** Proposed
**Priority:** Medium-High (the one prototype feature with no native
equivalent at all, and plausibly the most-used by end users)
**Effort:** High

### Why this doesn't fit the agent-container model

Agent containers (`--network none`, `shell`/`file-io`/`memory`/`spawn`/`cron`/`web`
tools, chat-turn-based) are the wrong shape for this: it needs live
microphone capture, browser speech recognition, and low-latency per-utterance
AI scoring inside a rich UI — not a multi-turn text chat loop. This has to be
a first-class **web feature**, calling the API directly, which in turn calls
through `engine/providers/*` (never the client) so token accounting and
provider-key encryption apply.

### Plan (high-level — deserves its own focused design pass before coding)

1. New Prisma models: `BibleLanguageProgress` (per-user, per-language —
   Hebrew/Greek — mastery level, last-practiced), and optionally
   `PronunciationAttempt` if per-attempt history is wanted (aggregate-only
   is simpler and matches the no-PII posture elsewhere; recommend starting
   aggregate-only).
2. New API module `packages/api/src/bible-language/` — an endpoint that
   accepts a recorded utterance (or a browser-side transcript, to avoid
   shipping audio to the server at all — cheaper and simpler) plus the
   target word/verse, and returns AI-scored feedback via the existing
   provider factory (`provider-factory.ts` → `api-key-resolver.ts`), not a
   new direct API call.
3. New web page under `packages/web/src/app/(dashboard)/` using the
   `MediaRecorder`/`SpeechRecognition` browser APIs client-side for capture,
   posting only text/short audio clips to the new endpoint.
4. Content (vocabulary lists, character-decision scenarios, quiz banks) can
   be authored as static JSON/markdown in the repo to start — no need to
   replicate the prototype's own content-generation flow on day one.
5. Explicitly **not** using `generativelanguage.googleapis.com` directly or
   any hardcoded key — goes through the existing provider abstraction so it
   respects whatever provider the deployment has configured.

**Recommend a dedicated plan-mode pass for this item specifically** before
implementation — it's the largest, most architecturally novel piece here and
deserves its own design review (audio handling approach, content authoring
workflow, whether attempt-level history is wanted) rather than being decided
inline in this document.

---

## P3-05 — WhatsApp connect UX check

**Status:** Proposed
**Priority:** Low
**Effort:** Small

Verify the admin dashboard already surfaces a WhatsApp QR-connect flow
equivalent to the prototype's (Light Church's WhatsApp channel already runs
on `baileys`, which supports QR-based session linking). If the connect UX
isn't currently exposed in `packages/web`, add it as a small settings-page
addition — this is a UI gap, not a backend one.

---

## P3-06 — (Optional stretch) YouTube-to-quiz

**Status:** Proposed, optional
**Priority:** Low
**Effort:** Small

The `web` tool already supports fetch; a YouTube transcript-to-quiz flow is
plausible as a new skill invoked conversationally (agent fetches transcript,
generates quiz text) rather than a bespoke UI feature. Lower priority than
P3-02–P3-04; revisit after those land.

---

## Sequencing recommendation

1. **Now, regardless of the rest of this plan:** rotate/revoke the two
   exposed Gemini API keys (user action, outside this repo).
2. P3-02a (context writer + `findByUserAndAgent` addition) — small,
   unblocks both P3-02 and P3-03.
3. P3-02 and P3-03 — same shape, can proceed in either order or together;
   both reuse the prior session's already-reviewed Prisma design.
4. P3-04 — schedule a dedicated plan-mode design pass before starting.
5. P3-05 — quick UI audit, fits anywhere in the sequence.
6. P3-01, P3-06 — defer pending user decision / bandwidth.

## Verification (per item, once implemented)

Same shape as `PHASE2.md`'s items: `pnpm run typecheck`, `pnpm run
db:migrate` against local Postgres, `pnpm run lint && pnpm run test`
(coverage threshold holds), plus a manual pass through the relevant new
dashboard page and API routes.
