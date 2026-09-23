# AI Adoption Phases — Light Church Development Strategy

This plan organises Light Church's development around **how a church team's
relationship with AI matures**, using the tiers in the _AIbyML AI Industry
Positioning & Partnership Playbook_ (September 2026). Each phase is a stage of
trust: the church moves up only when the previous stage has earned it.

| Phase  | Deacons treat AI as…               | Playbook tier                       | Sidebar group                     | Status            |
| ------ | ---------------------------------- | ----------------------------------- | --------------------------------- | ----------------- |
| **1**  | a **tool** they pick up and use    | Tier 3 — Horizontal tools/platforms | AI Tools                          | **Building now**  |
| **2**  | a **worker / volunteer**           | Tier 2b — Agentic operations        | AI Volunteers                     | TO BE CONSTRUCTED |
| **3a** | a **delegate** for ministry & care | Tier 2a — Scripted operations       | Ministry Delegation               | TO BE CONSTRUCTED |
| **3b** | an accountable system              | Governance, assurance & liability   | Governance, Assurance & Liability | TO BE CONSTRUCTED |
| **3c** | a system grounded in _our_ sources | Data & domain curation              | Data & Domain Curation            | TO BE CONSTRUCTED |

> **A note on tier order.** In the playbook, Tier 2a (scripted, low autonomy) is
> the pilot that comes _before_ Tier 2b (agentic). Here, Phase 2 uses the agents
> already built into Light Church as supervised helpers, and Phase 3a then turns
> chosen ministry work into **defined, monitored workflows** — the 2a posture.
> This matches the playbook's Light Church case study: _"Tier 2b architecture,
> wearing Tier 2a's trust posture."_ Pastoral care also sits higher on the
> **trust** axis, closer to Tier 1, so Phase 3a care delegation is gated on 3b.

---

## How phase status works in the product

Phase status lives in one file:
`packages/web/src/components/dashboard/adoption-phases.ts`.

- `building` — the phase currently under development (Phase 1 today).
- `planned` — the sidebar group shows **TO BE CONSTRUCTED**, and brand-new
  pages for that phase show a TO BE CONSTRUCTED placeholder
  (`components/dashboard/to-be-constructed.tsx`).
- `live` — the phase is complete; the label disappears.

The Conversations quick-start cards are phase-tagged the same way
(`conversations/chat-input.tsx`): the four P1 AI Tool cards (Game Builder,
Mission/Camp Companion, Roll Call, Sunday Service Bulletin) show now; Gospel
Outreach, Stewardship Search and Ministry Proposal (P2), Church Partnership
(P3a) and Kingdom Impact (P3b) reappear when their phase is built.

Pages that already exist (Conversations, Agents, Pastoral Care, Audit Logs, …)
stay reachable under their phase's group while it is marked TO BE CONSTRUCTED,
so current users are not cut off.

**Completing a phase:** when its exit criteria (below) are met, set its status to
`live` and set the next phase to `building`.

---

## Phase 1 — AI as a Tool (Tier 3) · _Building now_

**Who:** deacons and volunteers with no AI experience. They don't want to set up
or brief an agent; they want a button that does one useful thing.

**Playbook role:** Tier 3 is the low-trust, low-autonomy, self-serve funnel. It
builds familiarity and trust cheaply, so the church is ready for Phase 2.

### Shipped in this iteration

- **Sidebar → AI Tools group** with an "All AI Tools" page and **one entry per
  tool, listed by name**.
- **Shared tool directory** `<WORKSPACE_BASE_PATH>/AITools/<Tool Name>/`
  (default `./data/AITools/`). It is church-wide, unlike the per-user
  workspaces under `data/users/<id>/workspace`. A tool folder contains:
  - `index.html` — a self-contained HTML tool, shown inside a sandboxed iframe
    (`allow-scripts`, **no** `allow-same-origin`, so a tool cannot read the
    dashboard's session or call its API), and/or
  - `tool.json` — `{ "description"?: string, "url"?: "https://…" }`. A folder
    with only a `url` is an **external link tool**, opened in a new tab with a
    "no member personal data" warning.
- **API** `packages/api/src/ai-tools/`:
  `GET /api/v1/ai-tools`, `GET /api/v1/ai-tools/:name` (any signed-in user);
  `POST /api/v1/ai-tools` (multipart: `name` + one `.html`, max 2 MB) and
  `DELETE /api/v1/ai-tools/:name` (`super_admin` only). Tool names are single
  safe path segments: letters (incl. CJK), digits, spaces, `_`, `-` and `.`.
- **Admin upload / remove UI** on `/ai-tools`, with a confirmation before removal.

### Shipped: first tools from `reference/` (staged)

Sidebar: **AI Tools** (opens the overview) with a dropdown listing every tool.
Tool folders use plain ids; `tool.json` gives per-language `displayName` and
`description` (`{ "en": …, "zh-TW": … }`).

- **Game Builder / 遊戲工坊** — the existing Game Studio page, now a _built-in_
  AI Tool (`components/dashboard/built-in-ai-tools.ts`).
- **Roll Call / 點名** (`roll-call`) — `reference/RollCall` (no AI, no server) inlined into one
  HTML file by `scripts/build-ai-tool-bundle.mjs` and hosted in the sandbox.
  Its `localStorage` is bridged to per-user server storage
  (`/api/v1/ai-tools/:name/storage` → `AITools-data/<userId>/`), kept outside
  agent workspaces because attendance lists hold member names.
- **Mission/Camp Companion / 訪宣/營會指南** (`mission-camp-companion`) —
  `reference/CampMissionHdBk` as a link tool to its live deployment (its 151 MB
  of media rules out bundling).
- **Sunday Service Bulletin / 主日崇拜週刊** (`sunday-service-bulletin`) —
  `reference/SundayServices` bundled as one file; rebuild with
  `scripts/ai-tool-builds/sunday-service-bulletin/build.sh`. The build adds an
  in-memory IndexedDB fallback (the sandbox blocks IndexedDB), so uploaded past
  bulletins last for the session. Its AI "analyse past bulletins" call gets a
  clear "not yet enabled" reply from the tool shim until the AI stage below.
- Defaults live in `ai-tools/`; install with `node scripts/seed-ai-tools.mjs`.

**Bulletin archive (done):** past-bulletin PDFs uploaded in the tool are
archived in Postgres (`BulletinArchive`: file bytes, church, name, size,
sha256, uploader; deduplicated per church). The tool's `/api/analyze-bulletins`
call is forwarded by the dashboard (`lib/ai-tool-server-routes.ts`) to
`POST /api/v1/bulletin-archive`. The archive never appears in the weekly
editor; staff can list metadata via `GET /api/v1/bulletin-archive`.

**Next (needs the engine):** Sunday Service Bulletin's AI analysis — read the
archived PDFs (reuse the RAGplan Option B PDF→text/OCR converter) and draft next
week's bulletin through `engine/providers/*`, with `[FILL]` for what only a
person knows — and `reference/GetinBible` (Gemini/OpenAI/Google TTS
keys in the browser + its own Supabase). Their AI calls must move behind a
Light Church engine endpoint — no provider keys in tool pages, and all LLM
calls through `engine/providers/*` for token accounting — and GetinBible needs
a decision on keeping Supabase vs. moving student progress into Light Church.

### Remaining Phase 1 work

1. **Starter tool set.** Seed 5–8 tools deacons actually need: sermon-outline
   helper, bulletin/announcement writer, Bible-verse finder, prayer-list
   formatter, simple translation (EN ⇄ 繁中), event-poster text. Add a
   `scripts/seed-ai-tools.mjs`.
2. **Link-tool form.** Let admins create `tool.json` link tools (name, URL,
   description) from the UI instead of on disk.
3. **Tool descriptions and categories.** Show `tool.json` descriptions in the
   upload form; optional `category` for grouping once the list passes ~10.
4. **Usage signal.** Count opens per tool (an `AuditLog` entry is enough) so
   Phase 2 starts from the tools people really use.
5. **Adoption-phase gating (optional).** A church-level setting that hides groups
   for phases the church hasn't reached, so a Phase 1 church sees only AI Tools.
   It reuses the congregation-profile settings pattern (`governanceModel`).

**Exit criteria:** the starter set is live, deacons use at least 3 tools weekly,
and the admin can add or remove tools without developer help.

---

## Phase 2 — AI as a Worker / Volunteer (Tier 2b) · TO BE CONSTRUCTED

**Who:** deacons who've seen the tools work and now want to _brief_ AI like a
volunteer: "draft this, research that, remind me every Monday".

**Reuse, don't rebuild.** The built-in agents already cover this: Ministry
Coordinator + 10 NGO Operations + 7 Church Ministries agents, one specialist at
a time, draft-only, human sends.

**Sidebar (AI Volunteers):** Conversations, Agents, Talking Face, Skills,
Scheduled Tasks, Workspace. (Game Studio moved to AI Tools as the built-in **Game Builder**.)

**Projectors live in the Workspace.** Agent-built micro-tools and games
(`workspace/projector/<name>/index.html`) show in the Workspace listing as
**Projector** entries — alongside folders and files — and play in place
(`components/dashboard/projector-player.tsx`). A **Projectors** toolbar button
jumps to `projector/`. The old Projector page (now WkFlow Generation, P3a) is
kept for its future role as the workflow generator.

### Work items

1. **Tool → volunteer bridge.** From an AI Tool, offer "hand this to a volunteer
   agent" which opens a Conversation pre-filled with the tool's context.
2. **Volunteer roster view.** Present agents as named volunteers with a role
   card: what they do, what they never do, and who they report to.
3. **Talking Face as the volunteer's face** for announcements and kids' ministry
   (admin-only personal photo avatar stays as is).
4. **Onboarding script.** A guided first conversation per role (deacon, cell
   leader, admin staff).
5. **Staged-contract hook.** Record when a church moves from Phase 1 to 2. In the
   playbook this is the upsell trigger, not a new sale.

**Exit criteria:** each active deacon has a named volunteer agent they use
weekly; no draft left the system without a human sending it.

---

## Phase 3 — Delegation, with governance and curation built alongside

Once deacons want to **delegate** ministry work, and parts of pastoral care, the
church needs governance and trusted data _at the same time_. Phase 3 is split so
each part can ship on its own, in this order: **3a → 3b → 3c**. Two gates apply:

- pastoral-care delegation beyond draft-only needs **3b**, and
- anything the agent says _on behalf of_ the church's teaching needs **3c**.

### Phase 3a — Delegated Ministry & Pastoral Care (Tier 2a) · TO BE CONSTRUCTED

**Sidebar (Ministry Delegation):** Delegation Register _(new)_, WkFlow Generation,
Pastoral Care.

1. **WkFlow Generation** (was _Projector_). Today it hosts agent-built HTML
   micro-tools. Turn it into a **workflow generator**: the agent drafts a
   ministry workflow (steps, owner, checkpoints, escalation points) as a
   reviewable artifact, and a human approves it before it runs. Follow-ups:
   rename the `projector-creator` skill to `workflow-generator`, and move the
   `/projector` route and workspace folder to `/workflows`, with a redirect and
   a migration of existing `projector/` items.
2. **Delegation Register** (`/delegation`). A record of _which ministry task_ is
   delegated to _which agent_, the _accountable deacon/pastor_, the _human
   checkpoint_, and the _autonomy level_ (draft-only → send-with-approval).
3. **Low-risk delegation first:** rosters, bulletins, event logistics, follow-up
   reminders, reading plans.
4. **Pastoral care:** stays draft-only and human-sent until 3b is live. Build on
   `docs/PASTORAL_CARE_GOVERNANCE.md` and the governance-model setting
   (centralized vs. cell-group care).

**Exit criteria:** at least 3 ministry workflows run from the register with their
checkpoints honoured; zero pastoral outputs sent without human approval.

### Phase 3b — Governance, Assurance & Liability · TO BE CONSTRUCTED

The playbook calls this the **nearest live opportunity**: it's cross-cutting,
underpriced, and APAC SMEs/NGOs are the underserved market.

**Sidebar (Governance, Assurance & Liability):** Dashboard, Token Usage, Audit
Logs, Escalation & Override _(new)_, Settings.

1. **Escalation & Override** (`/governance/escalations`). When an agent deviates
   from its workflow, or hits a pastoral red flag (self-harm, abuse,
   mandatory-reporting), it escalates to a _named_ person who can override,
   pause or take over. Every escalation is written to the append-only
   `AuditLog`.
2. **Liability allocation**, recorded per delegated workflow: who is accountable
   when the agent deviates. This is the playbook's "clause every Tier 2 contract
   needs", drafted now while it's still a differentiator.
3. **Assurance pack export.** A one-click report for the church board, insurer
   or auditor: audit-log extract, approval-gate stats, escalations and outcomes,
   and PII-boundary attestations.
4. **Policy attestations.** Deacons acknowledge the AI-use policy; the
   acknowledgements are stored and shown in the pack.
5. **Service packaging (AIbyML).** Offer this as a separate assurance retainer,
   apart from the build.

**Exit criteria:** every delegated workflow has an escalation owner and a
liability entry; the assurance pack is generated and accepted by church
leadership.

### Phase 3c — Data & Domain Curation · TO BE CONSTRUCTED

**Sidebar (Data & Domain Curation):** Knowledge Curation _(new)_.

1. **Curated corpora** with provenance and licence per source: Bible datasets,
   theological reading (see `docs/RAGplan.md` Option A), Chinese soul-care
   content, and the church's own sermons and teaching.
2. **Review workflow.** Nothing enters the corpus unreviewed. Keep this separate
   from ad-hoc document reading (RAGplan Option B, already shipped).
3. **Attribution boundary.** When an answer draws on a named teacher or the
   church's own voice, the agent must do one of three things: _defer to a human,
   decline,_ or _extrapolate with disclosed confidence_. Decide this before
   launch, not after an incident (playbook, _Project TruthLight_).
4. **Reusable IP.** Price and license curated corpora as assets that can be used
   across churches, not absorbed into one deployment's fee.

**Exit criteria:** agents in 3a answer teaching questions from the reviewed
corpus with citations; the attribution rule is enforced and tested.

---

## Sidebar map (current code)

| Group (phase)                           | Items                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| AI Tools (P1)                           | All AI Tools, one entry per tool in `AITools/`                                  |
| AI Volunteers (P2)                      | Conversations, Agents, Talking Face, Skills, Scheduled Tasks, Workspace         |
| Care & Discipleship                     | Shown for decentralized (cell-group) churches only: Prayer, Scripture, Outreach |
| Ministry Delegation (P3a)               | Delegation Register, WkFlow Generation, Pastoral Care                           |
| Governance, Assurance & Liability (P3b) | Dashboard, Token Usage, Audit Logs, Escalation & Override, Settings             |
| Data & Domain Curation (P3c)            | Knowledge Curation                                                              |

## Housekeeping

- `app-sidebar.tsx` is over the 400-LOC limit. Next time it's touched, move its
  i18n messages into a separate file.
- The sidebar's existing _Phase 2 Roadmap_ card (`phase2-roadmap-card.tsx`)
  refers to the **development backlog** in `docs/PHASE2.md`, not to adoption
  Phase 2. Rename it (e.g. "Dev backlog") to avoid confusion.
