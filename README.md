<p align="center">
  <h1 align="center">Light Church</h1>
  <p align="center">
    <strong>AI for your church — introduced one step of trust at a time.</strong>
    <br />
    Start with simple AI tools, grow into AI volunteers, and only then delegate ministry work — with governance and trusted sources built in before anything sensitive is handed over.
  </p>
</p>

---

> **Who this guide is for**
>
> This page is for the people who **use** Light Church every day — deacons, ministry leaders, cell-group leaders, admin staff and volunteers. **You do not need to be technical.** If you can open a website or send a chat message, you can use Light Church.
>
> If you _install or maintain_ Light Church on a server, skip to [**For administrators**](#for-administrators-technical-setup).

---

## What is Light Church?

Light Church gives your church AI help that grows with your team's confidence. Most deacons don't start out wanting an "AI agent". They want one thing done well, like an announcement drafted, a verse found or a prayer list tidied. So Light Church starts there, and adds more only when the church is ready.

It runs on your church's own server. It is built on **Clawixea**, a self-hosted multi-agent AI platform, and its working assumptions come from a simple theological frame: the Great Commission (Matthew 28:19–20), the Great Commandment (Matthew 22:37–39), and faithful stewardship of what's been entrusted to you. Four promises hold at every phase:

- 🧑‍⚖️ **A human is always in charge.** Light Church produces _drafts_. It never sends an email, posts to social media, publishes a game for children or contacts a member on its own. A person always presses "send", or "approve".
- 🔒 **Your data stays yours.** It runs on your own server. Members' and beneficiaries' personal details are deliberately kept out of AI memory.
- ✅ **It won't make things up.** Missing facts are marked clearly (e.g. `[FILL: 2024 baptisms count]`), never invented.
- 🙏 **Prayerful discernment, not autopilot.** Every output is a draft from a capable assistant, not spiritual authority. Your team's judgment finishes the work.

---

## How Light Church grows with your church

Development follows three phases of AI adoption, based on the _AIbyML AI Industry Positioning & Partnership Playbook_. Each phase is a step up in trust. The sidebar is grouped the same way, and a group shows **TO BE CONSTRUCTED** until its phase is complete.

| Phase  | Your team treats AI as…               | What you get                                                                      | Status            |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------- | ----------------- |
| **1**  | a **tool**                            | **AI Tools**: ready-made tools you open and use, no setup                         | **Building now**  |
| **2**  | a **worker / volunteer**              | **AI Volunteers**: the built-in agents you brief like a church volunteer          | TO BE CONSTRUCTED |
| **3a** | a **delegate** for ministry and care  | **Ministry Delegation**: defined, monitored workflows with human checkpoints      | TO BE CONSTRUCTED |
| **3b** | an **accountable** system             | **Governance, Assurance & Liability**: escalation, override, assurance reports    | TO BE CONSTRUCTED |
| **3c** | a system grounded in **your sources** | **Data & Domain Curation**: a reviewed corpus of Scripture, theology and teaching | TO BE CONSTRUCTED |

The full plan, with work items and "done when" criteria for each phase, is in [`docs/AI_ADOPTION_PHASES.md`](docs/AI_ADOPTION_PHASES.md).

### Phase 1 — AI Tools _(building now)_

For deacons and volunteers who are new to AI. Open **AI Tools** in the sidebar and every tool your church has installed is listed by name. Click one and use it. There's no agent to brief and nothing to configure.

- In the sidebar, **AI Tools** opens the overview, and its dropdown lists every tool: **Game Builder**, **Finance Pipeline**, **Mission/Camp Companion**, **Roll Call**, **Quick Roll Call** and **Sunday Service Bulletin** (in Chinese: 遊戲工坊, 財務流程, 訪宣/營會指南, 點名, 快速點名, 主日崇拜週刊).
- Tools come in three kinds: **built-in** (a Light Church page, e.g. Game Builder; Mission/Camp Companion — where ministry leaders plan a trip or camp's schedule, devotionals, songs, photos and notes for the whole team; and Roll Call — attendance with history, pastoral-care follow-up prompts and forecasts, plus optional sign-in-sheet reading by a local Ollama model so member names never leave the server), **hosted** (a ready-made app that runs inside Light Church in a locked-down sandbox, e.g. Quick Roll Call and Sunday Service Bulletin) and **external links** (open in a new tab, with a reminder not to paste members' personal data, e.g. Finance Pipeline).
- Hosted tools remember your work. Roll Call's attendance list is saved to your own account on the church server, never to an AI agent's workspace. Sunday Service Bulletin's AI analysis of past bulletins arrives in a later phase.
- Your administrator adds, replaces or removes tools on the **AI Tools** page.

### Phase 2 — AI Volunteers _(to be constructed)_

When your team is comfortable with tools, they can start briefing AI like a volunteer: "draft this", "research that", "remind me every Monday". Phase 2 uses the agents already built into Light Church, found under **AI Volunteers**: Conversations, Agents, Talking Face, Skills, Scheduled Tasks and Workspace. See [Meet your AI volunteers](#meet-your-ai-volunteers) below.

### Phase 3 — Delegation, with governance and curation _(to be constructed)_

When deacons want to hand over parts of ministry work, and eventually parts of pastoral care, the church also needs accountability and trusted sources. Phase 3 therefore has three parts, built in order:

- **3a · Ministry Delegation.** A **Delegation Register** records which work is delegated to which agent, who is accountable, and which human checkpoint approves it. **WkFlow Generation** (formerly _Projector_) becomes a workflow generator: the agent drafts a ministry workflow, and a person approves it before it runs. **Pastoral Care** stays draft-only until 3b is live.
- **3b · Governance, Assurance & Liability.** **Escalation & Override** sends deviations and pastoral red flags to a named person, who can override, pause or take over. Accountability is agreed in advance, and a one-click **assurance pack** covers the board, insurer or auditor. This builds on the existing Dashboard, Token Usage and Audit Logs.
- **3c · Data & Domain Curation.** **Knowledge Curation** is a reviewed library of Bible datasets, theological reading, soul-care content and your own teaching, with sources and licences recorded. It includes a clear rule for anything said in the church's or a teacher's name: defer to a human, decline, or answer with a stated confidence.

---

## Meet your AI volunteers

_(Phase 2)._ At the front desk is the **Ministry Coordinator**, the primary assistant. You tell it what you need in everyday words, and it hands the job to the right specialist, one at a time, then brings the result back to you.

| Specialist               | Shown in the app as            | Ask them for…                                                                                                                |
| ------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ministry Coordinator** | _Ministries_                   | Workplans, partner/church registers, activity trackers, weekly status notes                                                  |
| **Stewardship**          | _Stewardship_                  | Proposals, supporter reports, log-frames, research into Christian foundations and faith-based grants                         |
| **Kingdom Impact**       | _Kingdom Impact_               | Indicators beyond outputs (salvations, baptisms, discipleship depth), data-collection forms, dashboard summaries             |
| **Proclamation**         | _Proclamation_                 | Newsletters, social posts, op-eds, advocacy and witness content                                                              |
| **Mission Field**        | _Mission Field / Safeguarding_ | Logistics lists, trip risk registers, safeguarding incident write-ups _after_ a person has handled the situation             |
| **Game Studio**          | _AI Tools → Game Builder_      | Short, Scripture-rooted narrative games for VBS, youth and family devotion. Storyboard first, human-approved before building |
| **Church Ministries**    | _via the Coordinator_          | Sermon prep, Sunday-school lessons, Bible studies, worship planning, prayer guides, church communications, church admin      |

Each specialist reads a set of **best-practice guides** ("skills") before it drafts. These cover things like how funders expect proposals to be structured, the right audience framing, and the data-protection rules for sensitive information.

---

## Prayer requests

Anyone on a connected channel (web, Telegram or WhatsApp) can submit a prayer request:

```
/prayer Please pray for our team's safety on the Nairobi mission trip next week.
```

No AI is involved. The request is saved straight to **Prayer Requests** and moves through three stages: **new** → **praying** (a person has picked it up) → **answered**.

---

## Getting started

1. **Open Light Church.** Your administrator will give you a web address (e.g. `https://church.your-org.org`) or a Telegram bot name.
2. **Sign in** with the email and password your administrator set up. On Telegram your account is linked for you.
3. **Start with AI Tools.** Open **AI Tools** in the sidebar and try one. That's all Phase 1 asks of you.
4. **When you're ready, brief a volunteer.** Open **Conversations**, choose the primary assistant, and ask in plain language:

> _"Draft this Sunday's bulletin announcements from these notes."_
> _"Design Kingdom Impact indicators for our discipleship program."_
> _"Build a short game about the Good Samaritan for our VBS kids."_ → Game Studio drafts a storyboard and waits for your approval first.

---

## Where your work is saved

Each area of ministry has its own dashboard page, and anything a specialist drafts lands as a file in your workspace folders (`proposals/`, `reports/`, `mne/`, `comms/drafts/`, `field-ops/`, …). Games and interactive tools built by agents (projectors) appear in the **Workspace** under `projector/`, marked **Projector**. Use the **Projectors** button to jump there, and click one to play it right in the Workspace.

Nothing in a drafts folder, a projector or an AI Tool has been sent or published anywhere. Sending is always a deliberate step **you** take.

---

## Talk face-to-face (experimental)

If your administrator has set it up, **Talking Face** (under AI Volunteers) shows a speaking avatar of your assistant with lip-synced audio: either a 3D face or, for admin staff who've uploaded a photo, a photo-realistic video. The ground rules below still apply.

---

## The ground rules that keep you safe

1. **Drafts only — a human always sends.** Emails, supporter submissions and social posts are prepared for you, never sent automatically.
2. **Member and beneficiary privacy is protected.** Personal details are kept out of AI memory. Incident write-ups use pseudonyms, and the key that links them to real names is kept in an admin-only folder.
3. **Safeguarding comes first.** Mission Field never handles a disclosure or makes a first-contact decision. A trained person does; the assistant only helps _document_ it afterwards, and mandatory-reporting flags can't be quietly removed.
4. **No invented facts or figures.** Missing data is flagged, not guessed.
5. **Games are storyboard-gated.** A human approves the story, both theologically and for age-appropriateness, before anything is built. Games have no network access and no combat, fear or shame mechanics.
6. **One specialist at a time.** No uncontrolled chains of agents acting on their own.
7. **AI Tools are sandboxed.** A tool page can't see your login, your data or the rest of the dashboard.
8. **Everything is logged.** Every action is recorded in an append-only audit log.

## What Light Church will _not_ do

- Send emails, submit proposals or publish posts on its own.
- Store or remember members' or beneficiaries' personal information.
- Make safeguarding or pastoral-crisis _decisions_. That's always a person's job.
- Invent statistics, quotes or results.
- Publish a game or tool for children without a human approving it first.
- Use a testimony or beneficiary story unless its source is marked as shareable.

## Tips for great results

- **Be specific.** "Draft a 2-page concept note for a $50,000 discipleship and livelihoods project in rural Kenya" beats "write a proposal".
- **Point to context.** Name the program, supporter or time period.
- **Review every draft.** Your judgment, local knowledge and discernment make it final.
- **Fill in the `[FILL: …]` marks.** Only you have the real number or detail.
- **Ask follow-ups.** "Shorter", "more formal" and "add a risk section" all work in the same conversation.

## Getting help

Contact whoever set up Light Church for your church. They can also add new AI Tools, assistants or skills.

---

---

## For administrators (technical setup)

> Everything above is for everyday users. What follows is for the person installing or maintaining Light Church.

Light Church is a ministry configuration of **Clawixea**, a **self-hosted multi-agent AI orchestration platform**. Every agent runs in its own isolated Docker container, with audit logging, role-based access, token budgets and encrypted secrets. It's a pnpm monorepo: `packages/api` (NestJS + Fastify), `packages/web` (the Next.js dashboard) and `packages/shared`. The repository, package names, scripts and Docker services still use the `clawix` name, which is the platform layer.

**Guides:**

- **Development strategy (adoption phases 1 → 3c):** [`docs/AI_ADOPTION_PHASES.md`](docs/AI_ADOPTION_PHASES.md)
- **DigitalOcean deployment (domains, SSL):** [`DO_deploy.md`](DO_deploy.md)
- **Hetzner / VPS deployment:** [`docs/Hetzner.md`](docs/Hetzner.md), [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md)
- **Railway deployment (managed web/API + VPS agent containers):** [`Railway_install.md`](Railway_install.md)
- **Codebase architecture and developer commands:** [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/)
- **Engineering hardening backlog:** [`docs/PHASE2.md`](docs/PHASE2.md). This is separate from adoption Phase 2.

### Install (first run)

```bash
# Clone, then run the interactive installer. It generates .env
# (secrets, DB password), builds the images and starts the stack.
git clone https://github.com/HKKoho/light-church.git
cd light-church
pnpm run install:clawix
```

A one-step bootstrapper that clones _and_ installs also exists: `./setup-clawix.sh` (interactive) or `./setup-clawix.sh --auto --provider anthropic --api-key sk-ant-xxx` (unattended). Use it for **first-time installs only**, never for updates.

### Update / restart

```bash
pnpm run update:clawix              # rebuild + restart
pnpm run update:clawix -- --pull    # git pull --ff-only, then rebuild + restart
pnpm run update:clawix -- --no-build # plain restart, reuse existing images
```

Your `.env`, the `postgres_data` volume and `redis_data` are kept across updates.

### Uninstall

```bash
pnpm run uninstall:clawix            # remove containers/images/volumes, keep host data
pnpm run uninstall:clawix -- --full  # also remove .env, ./data/, ./skills/custom/
```

### Phase 1: managing AI Tools

AI Tools are shared by the whole church. They live under `<WORKSPACE_BASE_PATH>/AITools/` (default `./data/AITools/`), one folder per tool, and the folder name is the name shown in the sidebar:

```
data/AITools/
  Sermon Outline Helper/
    index.html        # self-contained HTML tool, rendered in a sandboxed iframe
    tool.json         # optional: { "description": "…" }
  Bible Chat/
    tool.json         # link tool: { "url": "https://…", "description": "…" }
```

- **Upload from the dashboard:** as super admin, open **AI Tools**, enter a tool name and choose one `.html` file (max 2 MB). Uploading an existing name replaces that tool.
- **API:** `GET /api/v1/ai-tools`, `GET /api/v1/ai-tools/:name` (any signed-in user); `POST /api/v1/ai-tools` (multipart `name` + file) and `DELETE /api/v1/ai-tools/:name` (super admin only).
- Tool pages run with `allow-scripts` but **without** `allow-same-origin`, so they can't read the dashboard session or call the API.
- **Default tools** live in the repo under `ai-tools/` (`finance-pipeline`, `roll-call`, `sunday-service-bulletin`). A `tool.json` may use `${VAR:-default}` placeholders, filled from the environment or `.env` at install time — e.g. the Finance Pipeline link reads `FINANCE_PIPELINE_URL` (default `http://localhost:3030`). Each folder name is the tool's id; `tool.json` sets `displayName` and `description` per language (`{ "en": "…", "zh-TW": "…" }`). Install them with `node scripts/seed-ai-tools.mjs`; existing tools are kept unless you pass `--force`.
- **Hosting a built web app as a tool:** `node scripts/build-ai-tool-bundle.mjs <dist-dir> "ai-tools/<Tool Name>" --description "…"` inlines a static build (e.g. Vite `dist/`) into one `index.html` (max 2 MB). Roll Call was built from `reference/RollCall/dist`; Sunday Service Bulletin has its own recipe in `scripts/ai-tool-builds/sunday-service-bulletin/build.sh`.
- **Saved data:** tool pages can't use real browser storage (opaque-origin sandbox), so the viewer injects a `localStorage` stand-in and saves it per user via `GET/PUT /api/v1/ai-tools/:name/storage` to `<WORKSPACE_BASE_PATH>/AITools-data/<userId>/<tool>.json` (max 1 MB), outside agent workspaces.
- **Server calls from tools:** a tool page has no session, so its own relative-URL calls (e.g. `/api/analyze-bulletins`) are forwarded to the dashboard, which only allows the routes listed per tool in `packages/web/src/lib/ai-tool-server-routes.ts`. Sunday Service Bulletin's uploads are archived in Postgres (`BulletinArchive`, deduplicated per church) via `POST /api/v1/bulletin-archive`. They never appear in the weekly editor; staff can list them with `GET /api/v1/bulletin-archive`.
- **Built-in tools** (e.g. Game Builder → `/game-studio`) are listed in `packages/web/src/components/dashboard/built-in-ai-tools.ts`.
- **Phase status** (which sidebar groups show TO BE CONSTRUCTED) is set in `packages/web/src/components/dashboard/adoption-phases.ts`.

### Seed the ministry configuration

The specialist agent bundles are managed as **Ministry Packs** — install and toggle them from **Settings → Ministry Packs** in the dashboard (super admin only), or headlessly from the CLI:

```bash
node scripts/seed-ngo-agents.mjs      # create the 10 NGO Operations agents (incl. pastoral-care, game-studio)
node scripts/seed-church-agents.mjs   # create the 7 Church Ministries agents (sermon prep, Sunday school, worship, …)
node scripts/setup-ngo.mjs            # seed the workspace folder structure + skill files
```

Both seed scripts are idempotent — safe to re-run; existing agents are skipped, not duplicated. The dashboard tab and the CLI scripts share the same agent definitions (`packages/api/src/packs/definitions/`), so installing via one is visible in the other.

All reference material behind the ministry configuration (agent definitions, skill packages, architecture notes) lives under `reference/Clawix SKILL and Agent/`. Note that those reference docs still use generic "NGO" language throughout — they're the underlying legal/architecture layer that Light Church's branding sits on top of, not something end users see.

### Local development

```bash
pnpm install
cp .env.example .env                 # set PROVIDER_ENCRYPTION_KEY, provider key, etc.
pnpm --filter @clawix/shared run build
docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .
pnpm run docker:dev                  # Postgres (5443) + Redis
pnpm run db:migrate && pnpm run db:seed
pnpm run dev                         # API on :3001, dashboard on :3000
```

### Supported AI providers

| Provider                                         | Status    |
| ------------------------------------------------ | --------- |
| Anthropic (Claude)                               | Available |
| OpenAI (GPT)                                     | Available |
| Z.AI Coding (GLM)                                | Available |
| Any OpenAI-compatible endpoint (Ollama, vLLM, …) | Available |
| Azure, DeepSeek, Gemini, Kimi, OpenRouter        | Planned   |

### Channels

| Channel         | Status    |
| --------------- | --------- |
| Web dashboard   | Available |
| Telegram        | Available |
| WhatsApp, Slack | Planned   |

### Talking face avatar (optional)

At `/talkingface` (sidebar → AI Volunteers → Talking Face), the primary assistant can appear as a speaking avatar with lip-synced audio.

- **3D avatar** (default): runs in the browser via `@met4citizen/talkinghead` and loads a `.glb` model from a CDN.
- **Photo-realistic video**: driven by the SadTalker sidecar (`infra/docker/`). The mode toggle only appears for `super_admin` / `admin_staff` users who've uploaded an avatar photo.
- Both modes need a **Piper TTS server**: set `TTS_PIPER_URL` in `.env`. None ships in `docker-compose.prod.yml`. Without one, the page loads but speaking fails with a clear `piper-tts` error.
- Code: `packages/api/src/talkingface/` (WebSocket `/ws/talkingface`), `packages/api/src/tts/`, `packages/web/src/app/(dashboard)/talkingface/`.

---

## Ministry configuration reference

A complete multi-agent setup for small-to-mid-size mission organizations and NGOs (10–80 staff, multi-supporter, often field-based). All reference files live under `reference/Clawix SKILL and Agent/`.

### The NGO Operations pack — 10 specialist agents

Installed as the `ngo` Ministry Pack (**Settings → Ministry Packs**, or `scripts/seed-ngo-agents.mjs`) — each with `role: worker`, `isOfficial: true`. Definitions live in `packages/api/src/packs/definitions/ngo-agents.data.ts`, the single source shared by the CLI script and the pack-installer API.

| Agent (internal name)   | Shown in-app as              | Responsibility                                                                                                                | Tools                                                            | Reads skills                                                                   |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `program-coordinator`   | Ministries                   | Workplan, partner/church register, activity tracker, weekly status notes                                                      | Read, Write, Edit, Grep, Glob                                    | safeguarding, ngo-comms                                                        |
| `donor-engagement`      | Stewardship                  | Proposals, narrative reports, log-frames, supporter research                                                                  | Read, Write, Edit, Grep, Glob, WebSearch (domain-allowlisted)    | donor-proposal, grant-research, impact-report, data-protection, gospel-mission |
| `monitoring-evaluation` | Kingdom Impact               | Indicators, data-collection forms, period validation, dashboard summaries                                                     | Read, Write, Edit, Grep, Glob, Bash (read-only allowlist)        | mne, data-protection                                                           |
| `communications`        | Proclamation                 | Newsletters, social posts, op-eds, advocacy briefs                                                                            | Read, Write, Edit, Grep, Glob                                    | ngo-comms, data-protection, gospel-mission                                     |
| `field-operations`      | Mission Field / Safeguarding | Logistics lists, risk register, safeguarding incident records (post-triage only)                                              | Read, Write, Edit, Grep, Glob                                    | safeguarding, data-protection                                                  |
| `game-studio`           | Game Studio                  | Short, Scripture-rooted narrative games for VBS/youth ministry, storyboard-first, human-approved before build                 | Read, Write, Edit, spawn `coder` sub-agent (build phase only)    | game-builder, gospel-mission                                                   |
| `pastoral-care`         | Pastoral Care                | AI-disclosed pastoral/spiritual support conversations — listening, prayer, Scripture; escalates crisis disclosures to a human | Read, Write (`pastoral-care/records/`, `pastoral-care/flagged/`) | pastoral-care                                                                  |
| `finance-assistant`     | Finance                      | Ledger entries, budget-vs-actual reports, reconciliation prep, bookkeeping exports — drafts only                              | Read, Write, Edit                                                | finance-steward                                                                |
| `evangelism-outreach`   | Outreach                     | Outreach campaign plans, gospel-proclamation content, church-planting briefs; never conditions aid on participation           | Read, Write, Edit                                                | gospel-mission                                                                 |
| `scripture-literacy`    | Scripture & Literacy         | Bible translation status, Scripture distribution records, mother-tongue literacy programmes                                   | Read, Write, Edit                                                | —                                                                              |

### The Church Ministries pack — 7 specialist agents

Installed as the `church` Ministry Pack (`scripts/seed-church-agents.mjs`). Definitions live in `packages/api/src/packs/definitions/church-agents.data.ts`.

| Agent (internal name)      | Responsibility                                                                                        | Reads skills                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `church-sermon-prep`       | Passage exegesis, outline construction, illustrations, application points, closing prayers            | `church-sermon-prep`         |
| `church-sunday-school`     | Age-banded lessons (nursery–senior high): teaching, crafts, memory verses, parent take-home notes     | `church-sunday-school`       |
| `church-bible-study`       | Small-group study guides, multi-week series, inductive discussion questions                           | `church-bible-study`         |
| `church-worship-planner`   | Song selection, liturgical flow, seasonal and special-service planning                                | `church-worship-planner`     |
| `church-prayer-journal`    | Prayer meeting guides, intercession lists, fasting guides, contemplative prayer                       | `church-prayer-journal`      |
| `church-communications`    | Congregation-facing newsletters, welcome emails, event invitations, testimonies                       | `church-communications`      |
| `church-admin-coordinator` | Full back-office: events, bulletins, volunteer rotas, facility booking, membership, minutes, calendar | the 9 `church-admin*` skills |

### The primary orchestrator

The user-facing agent (shown as the Ministry Coordinator / primary assistant). It knows the installed specialists, when to spawn each, the full workspace layout, and enforces the security principles:

- Routes requests to exactly one specialist at a time — no autonomous agent-to-agent chaining
- Enforces the PII boundary (beneficiary and congregant data never enters agent memory)
- Applies safeguarding-first logic (Mission Field is documentation-only, after human triage)
- Applies storyboard-first logic for Game Studio (never builds before a human approves the story)
- All outbound actions (email, supporter submission, social post, published game) are draft-only; a human sends or approves
- Every agent action appends to `.clawix/audit.log` (append-only)

### Workspace layout

Seeded via `scripts/setup-ngo.mjs` and `packages/api/prisma/setup-ngo.ts` — **31 folders** at `data/users/<userId>/workspace/`:

```
plans/, status/, briefs/, drafts/, donors/, partners/, programs/, activities/,
proposals/, reports/, donor-research/, skills/
mne/        raw/, processed/, indicators/, forms/, quality/, reports/, baselines/
comms/      drafts/, research/, published/
incidents/  triage/, records/, keys/   (human-access-only folder)
prayer-requests/  new/, praying/, answered/
field-ops/  logistics/, risk/, assets/
.clawix/    audit.log (append-only)
```

Game Studio's output goes to `workspace/games/<slug>/` and `workspace/projector/<slug>/` (playable from the **Workspace**, marked **Projector**), created on demand rather than pre-seeded.

- **7 reference skill files** (`donor-proposal`, `mne`, `safeguarding`, `data-protection`, `impact-report`, `grant-research`, `ngo-comms`) copied from `reference/` into `workspace/skills/`
- `.clawix/audit.log` initialised (append-only)
- A workspace `README.md` explaining the layout and agent roster

### Skill packages

Read-only reference packages — encoded best practice the relevant agent reads before drafting. They grant no new tool access.

| Skill                        | Location              | Agent(s)                                                 | Content                                                                                                                                                                                                                                                                                         |
| ---------------------------- | --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `donor-proposal/SKILL.md`    | `reference/…/skills/` | Stewardship                                              | Drafting order (Theory of Change → log-frame → activities → budget → risk → sustainability); indicator alignment for FCDO, USAID, ECHO, GAC, SDC, BMZ, private foundations; common rejection reasons                                                                                            |
| `mne/SKILL.md`               | `reference/…/skills/` | Kingdom Impact                                           | SMART indicator YAML template; baseline/midline/endline structure; OECD-DAC evaluation criteria; data-validation rules; anonymization recipe                                                                                                                                                    |
| `safeguarding/SKILL.md`      | `reference/…/skills/` | Mission Field, Ministries                                | PSEA principles, child safeguarding, incident triage decision tree, mandatory reporting triggers, record structure with pseudonym convention                                                                                                                                                    |
| `data-protection/SKILL.md`   | `reference/…/skills/` | Kingdom Impact, Stewardship, Proclamation, Mission Field | GDPR + ICRC/IASC guidance; `pii: true` convention; consent capture; anonymization steps                                                                                                                                                                                                         |
| `impact-report/SKILL.md`     | `reference/…/skills/` | Stewardship                                              | Narrative report structure by supporter type; financial reporting touchpoints; beneficiary story consent rules; variance reporting standard                                                                                                                                                     |
| `grant-research/SKILL.md`    | `reference/…/skills/` | Stewardship                                              | Supporter scanning checklist; eligibility filters; deadline tracking; fit-scoring rubric (1–5)                                                                                                                                                                                                  |
| `ngo-comms/SKILL.md`         | `reference/…/skills/` | Proclamation, Ministries                                 | Accessible language standards; do-no-harm storytelling; dignity-preserving imagery; advocacy framing; status-note classification                                                                                                                                                                |
| `game-builder/SKILL.md`      | `skills/builtin/`     | Game Studio                                              | Enforces STORYBOARD → APPROVE → BUILD → DELIVER; games render in a sandboxed, network-free iframe; permitted genres (puzzle, platformer, narrative, collector — no combat/arena); content rules (no fear/shame mechanics, theologically sound, age-appropriate, antagonists drawn with dignity) |
| `gospel-mission/SKILL.md`    | `skills/builtin/`     | Game Studio (tone cross-check); available platform-wide  | Theological foundation (Great Commission, Great Commandment, stewardship); stakeholder messaging profiles for Christian foundations, church partners, individual supporters/intercessors, beneficiaries, and secular/institutional funders                                                      |
| `projector-creator/SKILL.md` | `skills/builtin/`     | Any agent building a projector                           | General-purpose guidance for building sandboxed, no-network interactive tools that appear in the Workspace under `projector/` (Game Studio is one specialization of this)                                                                                                                       |

### Architecture docs

| File                                           | Purpose                                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference/Clawix SKILL and Agent/README.md`   | Architecture diagram, folder layout rationale, deployment runbook, operating rules for staff, what the configuration does not do (still uses generic "NGO" framing)                                 |
| `reference/Clawix SKILL and Agent/PROPOSAL.md` | Strategic case; 10 non-negotiable security principles; full agent + skill roster; MCP connectors (KoboToolbox, PowerBI, Google Drive, Mailchimp — all gated); 90-day impact targets; phased rollout |

### What's next

Development now follows the adoption phases in [`docs/AI_ADOPTION_PHASES.md`](docs/AI_ADOPTION_PHASES.md): finish **Phase 1** (starter AI Tools, link-tool form, usage signal), then Phase 2 (AI Volunteers), then 3a → 3b → 3c. The sidebar's _Phase 2 Roadmap_ card is older and tracks the separate feature backlog (attendance/roll-call, AI survey + QR registration). See [`docs/PHASE2.md`](docs/PHASE2.md) for the engineering hardening backlog.

---

## Security model

Light Church follows a **zero-trust architecture** for agent execution:

| Threat                                | Mitigation                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-user data access                | Workspaces only mounted into the owner's container                                                                                           |
| Sub-agent privilege escalation        | Sub-agents get read-only curated context, never the full workspace                                                                           |
| Memory poisoning                      | Agent context regenerated from the database each run                                                                                         |
| Disk exhaustion                       | Per-user quota enforcement (default 500 MB)                                                                                                  |
| Path traversal                        | Workspace and AI Tools paths validated to stay inside their root; tool names are single safe path segments                                   |
| Secret leakage                        | API keys encrypted at rest (AES-256-GCM)                                                                                                     |
| Untrusted code execution              | All agent code runs inside sandboxed containers, never on the host                                                                           |
| Unreviewed content reaching a browser | Game Studio / projector output renders in a sandboxed iframe with no network access, and never builds before a human approves the storyboard |
| Uploaded AI Tool pages                | Only super admins can upload; pages render in an opaque-origin sandbox (no `allow-same-origin`), so they can't reach the session or the API  |

---

## Acknowledgments

Light Church is a ministry configuration of Clawixea, which builds on ideas from [nanoClaw](https://github.com/qwibitai/nanoclaw) (container-isolated agent execution) and [nanobot](https://github.com/HKUDS/nanobot) (multi-provider AI design patterns). The phased development strategy follows the _AIbyML AI Industry Positioning & Partnership Playbook_ (September 2026).

## License

The whole repository is covered by **two licences, applied together**. There is no MIT-licensed core.

- **[PolyForm Noncommercial License 1.0.0](LICENSE)** covers the entire codebase. You may use, copy, modify and distribute it for any **noncommercial** purpose. Charities, educational institutions, public research, safety and health bodies, environmental organisations and government institutions may use it whatever their funding source. **Commercial use** needs a separate commercial licence from the maintainers. That includes selling the software, offering it as a paid SaaS, or using it to generate direct revenue.
- **[Christian Ministry Grant](LICENSE-CHURCH)** is an extra, royalty-free permission for Christian organisations: churches, denominations, mission societies, Christian schools and seminaries, and Christian healthcare, social-care and charitable bodies. They may use, self-host and adapt the whole platform for their ministry, including work involving tithes, offerings, tuition or donations, provided that:
  - it isn't resold or offered to outside parties as a standalone commercial product or SaaS;
  - the copyright and grant notices are kept;
  - the organisation's primary purpose remains Christian ministry.

See [NOTICE](NOTICE) for the full scope. Where a directory has its own `LICENSE` file (for example `reference/Clawix SKILL and Agent/` and `skills/ARIA/`), that file governs that directory. Third-party dependencies keep their own licences. Neither licence is OSI-approved open source. If you're unsure whether your organisation qualifies, contact the maintainers.

---

<p align="center">
  <sub>Built for churches that want AI they can grow into — and actually trust.</sub>
</p>
