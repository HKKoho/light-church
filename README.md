<p align="center">
  <h1 align="center">Light Church</h1>
  <p align="center">
    <strong>Your ministry's own team of AI assistants.</strong>
    <br />
    They help you draft outreach plans, stewardship reports, discipleship indicators and Scripture-rooted games — while keeping your data private and always leaving the final decision to a person.
  </p>
</p>

---

> **Who this guide is for**
>
> This page is written for the people who **use** Light Church every day — ministry coordinators, stewardship and grants staff, discipleship/impact teams, communications teams and field or mission-trip coordinators. **You do not need to be technical.** If you can send a message in a chat app, you can use Light Church.
>
> If you are the person who *installs or maintains* Light Church on a server, skip to [**For administrators**](#for-administrators-technical-setup) at the bottom.

---

## What is Light Church?

Light Church gives your ministry or mission organization a small **team of AI assistants** that work the way your real team does. Instead of one generic chatbot, you get a coordinator at the "front desk" and specialists behind it — each trained for a specific part of ministry work, from outreach planning to stewardship letters to Scripture-rooted games for kids' ministry.

You talk to them in plain language, the same way you'd brief a colleague. They do the heavy lifting — research, first drafts, structuring data — and hand the result back to **you** to review, finish and send.

Light Church is a ministry configuration of **Clawix**, a self-hosted multi-agent AI platform. Its working assumptions come from a simple theological frame: the Great Commission (Matthew 28:19–20), the Great Commandment (Matthew 22:37–39), and faithful stewardship of what's been entrusted to your organisation. Four promises sit underneath everything it does:

- 🧑‍⚖️ **A human is always in charge.** Light Church only ever produces *drafts*. It never sends an email, posts to social media, publishes a game for children, or submits anything to a supporter on its own. A person always presses "send" — or "approve".
- 🔒 **Your data stays yours.** Light Church runs on your organisation's own server. Beneficiary and congregant names and personal details are deliberately kept out of its memory.
- ✅ **It won't make things up.** If a figure or fact is missing, the assistants mark it clearly (e.g. `[FILL: 2024 baptisms count]`) rather than inventing a number.
- 🙏 **Prayerful discernment, not autopilot.** Every response carries the reminder that these are drafts from a capable assistant, not spiritual authority — your team's judgment and discernment always finish the work.

---

## Meet your ministry team

At the front desk is the **Ministry Coordinator** (shown in-app as the primary assistant). This is who you talk to first. You describe what you need in everyday words, and it quietly hands the job to the right specialist — one at a time — then brings the result back to you. You rarely need to talk to the specialists directly.

| The specialist | Shown in the app as | Ask them for… |
| --- | --- | --- |
| **Ministry Coordinator** | *Ministries* | Workplans, partner/church registers, activity trackers, weekly status notes |
| **Stewardship** | *Stewardship* | Proposals, supporter reports, log-frames, and research into Christian foundations and faith-based grants |
| **Kingdom Impact** | *Kingdom Impact* | Indicators that go beyond outputs — salvations, baptisms, discipleship depth — plus data-collection forms and dashboard summaries |
| **Proclamation** | *Proclamation* | Newsletters, social posts, op-eds, advocacy and witness content |
| **Mission Field** | *Mission Field / Safeguarding* | Logistics lists, trip risk registers, and writing up safeguarding incident records *after* a person has handled the situation |
| **Game Studio** | *Projector* | Short, Scripture-rooted narrative games for VBS, youth ministry and family devotion — built storyboard-first, with a human approving the story before anything gets built |

Each specialist has been given a set of **best-practice guides** ("skills") to read before it drafts — for example, how funders like FCDO, USAID and Christian foundations expect proposals to be structured, the theological/audience framing to use with different stakeholders, or the data-protection rules for handling sensitive information. So you're not just getting generic text; you're getting drafts that follow the standards your ministry and sector expect.

---

## Prayer requests

Anyone on any connected channel — web, Telegram, WhatsApp — can submit a prayer request with a simple command:

```
/prayer Please pray for our team's safety on the Nairobi mission trip next week.
```

This doesn't call an AI agent — it's a direct, lightweight command that saves the request straight into your workspace. It shows up in the **Prayer Requests** dashboard with three simple stages: **new** → **praying** (a person has picked it up) → **answered**. Nothing here is drafted or interpreted by an assistant; it's just a fast, reliable way to capture requests so your prayer team doesn't lose track of them.

---

## Getting started in 4 steps

### 1. Open Light Church

Your administrator will give you one of these:

- **A web address** (for example `https://mission.your-org.org`) — open it in any browser, just like a normal website.
- **A Telegram bot** — open Telegram, search for the bot name they gave you, and start a chat.

### 2. Sign in

Use the email and password your administrator set up for you. (On Telegram, your account is linked for you — just start chatting.)

### 3. Say hello to the Ministry Coordinator

In the web dashboard, open **Conversations** and choose the primary assistant. On Telegram, just send a message. A simple "Hi, what can you help me with?" is a fine way to start — or pick one of the quick-start prompts (Gospel Outreach, Stewardship Search, Ministry Proposal, Church Partnership, Kingdom Impact, Game Builder) on the conversations screen.

### 4. Ask in plain English

Describe what you need the way you'd ask a colleague. You don't need special commands or keywords. For example:

> *"Find Christian foundations that fund water and sanitation work in West Africa."*
> → The Stewardship agent researches funders and saves a shortlist for you to review.

> *"Design Kingdom Impact indicators for our discipleship program."*
> → You get a ready-to-edit set of indicators that go beyond attendance counts, following M&E best practice.

> *"Draft this month's newsletter using our recent outreach updates."*
> → A first draft of the newsletter from Proclamation, written in accessible, dignity-preserving language.

> *"Build a short game about the Good Samaritan for our VBS kids."*
> → Game Studio drafts a storyboard first and asks you to approve it — it never builds before a human signs off on the story.

> *"/prayer Please pray for the Nunez family as they finalize their adoption."*
> → Saved instantly to Prayer Requests → *new*, ready for your prayer team.

---

## Where your work is saved

The dashboard has a dedicated page for each area of ministry work: **Ministries**, **Stewardship**, **Kingdom Impact**, **Proclamation**, **Mission Field**, **Safeguarding**, and **Prayer Requests**. Anything a specialist drafts also lands as a file in a tidy set of workspace folders — for example `proposals/`, `reports/`, `mne/`, `comms/drafts/`, `field-ops/` and so on — so you can open it, edit it, and finish it your way from either the dashboard page or the conversation.

Games and interactive tools that Game Studio builds show up in **Projector**, a page where you can launch and preview them instantly — they run fully sandboxed with no network access, so nothing they do can reach outside the browser tab.

Nothing in a "drafts" folder or on the Projector page has been sent or published anywhere. Sending — to a supporter, a mailing list, social media, or publishing a game for kids to play — is always a deliberate step **you** take.

---

## The ground rules that keep you safe

These rules are built into Light Church. Knowing them helps you trust what it gives you:

1. **Drafts only — a human always sends.** Emails, supporter submissions, and social posts are prepared for you, never sent automatically.
2. **Beneficiary and congregant privacy is protected.** Personal details of the people you serve are kept out of the assistants' memory. When incidents are written up, real names are replaced with pseudonyms; the key linking them is kept in an access-controlled folder.
3. **Safeguarding comes first.** Mission Field will **not** handle a safeguarding disclosure or make first-contact decisions. A trained person deals with the situation; the assistant only helps *document* it afterwards, and mandatory-reporting flags can't be quietly removed.
4. **No invented facts or figures.** Missing data is flagged for you to fill in, not guessed.
5. **Games are storyboard-gated.** Game Studio always designs the story first and waits for a human to approve it — theologically and for age-appropriateness — before building anything. Built games run with no network access and use no combat, fear or shame mechanics.
6. **One specialist at a time.** The Ministry Coordinator routes each request to a single specialist — there's no uncontrolled chain of agents acting on their own.
7. **Everything is logged.** Each action is recorded in a tamper-evident activity log, so there's always a clear trail of what was done.

---

## What Light Church will *not* do

So there are no surprises, Light Church deliberately **does not**:

- Send emails, submit proposals, or publish posts on its own.
- Store or remember beneficiaries' or congregants' personal information.
- Make safeguarding or protection *decisions* — that's always a person's job.
- Invent statistics, quotes, or results to fill a gap.
- Publish a game or interactive tool for children without a human approving the story first.
- Act on a story without consent — beneficiary and testimony stories are only used when the source is marked as shareable.

---

## Tips for getting great results

- **Be specific.** "Draft a 2-page concept note for a $50,000 discipleship and livelihoods project in rural Kenya" beats "write a proposal".
- **Point to context.** Mention the program, the supporter, or the time period so the assistant uses the right material.
- **Review every draft.** Treat it as a strong first draft from a capable colleague — your judgement, local knowledge, and discernment make it final.
- **Fill in the `[FILL: …]` marks.** These are deliberate prompts where only you have the real number or detail.
- **Ask follow-ups.** "Make it shorter", "use a more formal tone", or "add a risk section" all work in the same conversation.

---

## Getting help

- **Something looks wrong, or you're stuck?** Contact whoever set Light Church up for your organisation (your administrator or IT focal point).
- **Want a new kind of assistant or skill?** Those can be added — pass the request to your administrator.

---
---

## For administrators (technical setup)

> The section above is for everyday users. The rest of this document is for the person installing or maintaining Light Church on a server.

Light Church is a ministry configuration built on **Clawix**, a **self-hosted multi-agent AI orchestration platform**: every agent runs in its own isolated Docker container, with full audit logging, role-based access, token budgets, and encrypted secrets. It's a pnpm monorepo (`packages/api` — NestJS + Fastify; `packages/web` — Next.js dashboard; `packages/shared`). The underlying repository, package name, and Docker services are still named `clawix` — that's the platform layer; "Light Church" is the branding and configuration applied on top of it for this deployment.

**Full guides:**
- **Server / cloud deployment (DigitalOcean, domains, SSL):** see [`DO_deploy.md`](DO_deploy.md)
- **Railway deployment (managed web/API + VPS agent containers):** see [`Railway_install.md`](Railway_install.md)
- **Codebase architecture & developer commands:** see [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/)
- **Deferred engineering backlog (accepted risks, Phase 2 hardening items):** see [`docs/PHASE2.md`](docs/PHASE2.md)

### Install (first run)

```bash
# Clone, then run the interactive installer — it generates .env
# (secrets, DB password), builds the images, and starts the stack.
git clone https://github.com/aibyml-ngo/clawix-ngo.git clawixngo
cd clawixngo
pnpm run install:clawix
```

There is also a one-step bootstrapper that clones *and* installs: `./setup-clawix.sh` (interactive) or `./setup-clawix.sh --auto --provider anthropic --api-key sk-ant-xxx` (unattended). Use it for **first-time installs only** — never for updates.

### Update / restart

```bash
pnpm run update:clawix              # rebuild + restart
pnpm run update:clawix -- --pull    # git pull --ff-only, then rebuild + restart
pnpm run update:clawix -- --no-build # plain restart, reuse existing images
```

Your `.env`, the `postgres_data` volume, and `redis_data` are preserved across updates.

### Uninstall

```bash
pnpm run uninstall:clawix            # remove containers/images/volumes, keep host data
pnpm run uninstall:clawix -- --full  # also remove .env, ./data/, ./skills/custom/
```

### Seed the ministry configuration

The ministry team (six specialists + primary orchestrator) and the workspace folder structure are created by:

```bash
node scripts/seed-ngo-agents.mjs    # create the six specialist agents (incl. game-studio)
node scripts/setup-ngo.mjs          # seed the 31-folder workspace + skill files
```

All reference material behind the ministry configuration (agent definitions, skill packages, architecture notes) lives under `reference/Clawix SKILL and Agent/`. Note that those reference docs still use generic "NGO" language throughout — they're the underlying legal/architecture layer that Light Church's branding sits on top of, not something end users see.

### Local development

```bash
pnpm install
cp .env.example .env                 # set PROVIDER_ENCRYPTION_KEY, provider key, etc.
pnpm --filter @clawix/shared run build
docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .
pnpm run docker:dev                  # Postgres (5433) + Redis
pnpm run db:migrate && pnpm run db:seed
pnpm run dev                         # API on :3001, dashboard on :3000
```

### Supported AI providers

| Provider | Status |
| --- | --- |
| Anthropic (Claude) | Available |
| OpenAI (GPT) | Available |
| Z.AI Coding (GLM) | Available |
| Any OpenAI-compatible endpoint (Ollama, vLLM, …) | Available |
| Azure, DeepSeek, Gemini, Kimi, OpenRouter | Planned |

### Channels

| Channel | Status |
| --- | --- |
| Web dashboard | Available |
| Telegram | Available |
| WhatsApp, Slack | Planned |

---

## Ministry configuration reference

A complete multi-agent setup for small-to-mid-size mission organizations and NGOs (10–80 staff, multi-supporter, often field-based). All reference files live under `reference/Clawix SKILL and Agent/`.

### The six specialist agents

Created via `scripts/seed-ngo-agents.mjs` — each with `role: worker`, `isOfficial: true`:

| Agent (internal name) | Shown in-app as | Responsibility | Tools | Reads skills |
|---|---|---|---|---|
| `program-coordinator` | Ministries | Workplan, partner/church register, activity tracker, weekly status notes | Read, Write, Edit, Grep, Glob | safeguarding, ngo-comms |
| `donor-engagement` | Stewardship | Proposals, narrative reports, log-frames, supporter research | Read, Write, Edit, Grep, Glob, WebSearch (domain-allowlisted) | donor-proposal, grant-research, impact-report, data-protection |
| `monitoring-evaluation` | Kingdom Impact | Indicators, data-collection forms, period validation, dashboard summaries | Read, Write, Edit, Grep, Glob, Bash (read-only allowlist) | mne, data-protection |
| `communications` | Proclamation | Newsletters, social posts, op-eds, advocacy briefs | Read, Write, Edit, Grep, Glob | ngo-comms, data-protection |
| `field-operations` | Mission Field / Safeguarding | Logistics lists, risk register, safeguarding incident records (post-triage only) | Read, Write, Edit, Grep, Glob | safeguarding, data-protection |
| `game-studio` | Projector (Game Builder) | Short, Scripture-rooted narrative games for VBS/youth ministry, storyboard-first, human-approved before build | Read, Write, Edit, spawn `coder` sub-agent (build phase only) | game-builder, gospel-mission |

### The primary orchestrator

The user-facing agent (shown as the Ministry Coordinator / primary assistant). It knows all six specialists, when to spawn each, the full workspace layout, and enforces the security principles:

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

Game Studio's output goes to `workspace/games/<slug>/` and `workspace/projector/<slug>/`, created on demand rather than pre-seeded.

- **7 reference skill files** (`donor-proposal`, `mne`, `safeguarding`, `data-protection`, `impact-report`, `grant-research`, `ngo-comms`) copied from `reference/` into `workspace/skills/`
- `.clawix/audit.log` initialised (append-only)
- A workspace `README.md` explaining the layout and agent roster

### Skill packages

Read-only reference packages — encoded best practice the relevant agent reads before drafting. They grant no new tool access.

| Skill | Location | Agent(s) | Content |
|---|---|---|---|
| `donor-proposal/SKILL.md` | `reference/…/skills/` | Stewardship | Drafting order (Theory of Change → log-frame → activities → budget → risk → sustainability); indicator alignment for FCDO, USAID, ECHO, GAC, SDC, BMZ, private foundations; common rejection reasons |
| `mne/SKILL.md` | `reference/…/skills/` | Kingdom Impact | SMART indicator YAML template; baseline/midline/endline structure; OECD-DAC evaluation criteria; data-validation rules; anonymization recipe |
| `safeguarding/SKILL.md` | `reference/…/skills/` | Mission Field, Ministries | PSEA principles, child safeguarding, incident triage decision tree, mandatory reporting triggers, record structure with pseudonym convention |
| `data-protection/SKILL.md` | `reference/…/skills/` | Kingdom Impact, Stewardship, Proclamation, Mission Field | GDPR + ICRC/IASC guidance; `pii: true` convention; consent capture; anonymization steps |
| `impact-report/SKILL.md` | `reference/…/skills/` | Stewardship | Narrative report structure by supporter type; financial reporting touchpoints; beneficiary story consent rules; variance reporting standard |
| `grant-research/SKILL.md` | `reference/…/skills/` | Stewardship | Supporter scanning checklist; eligibility filters; deadline tracking; fit-scoring rubric (1–5) |
| `ngo-comms/SKILL.md` | `reference/…/skills/` | Proclamation, Ministries | Accessible language standards; do-no-harm storytelling; dignity-preserving imagery; advocacy framing; status-note classification |
| `game-builder/SKILL.md` | `skills/builtin/` | Game Studio | Enforces STORYBOARD → APPROVE → BUILD → DELIVER; games render in a sandboxed, network-free iframe; permitted genres (puzzle, platformer, narrative, collector — no combat/arena); content rules (no fear/shame mechanics, theologically sound, age-appropriate, antagonists drawn with dignity) |
| `gospel-mission/SKILL.md` | `skills/builtin/` | Game Studio (tone cross-check); available platform-wide | Theological foundation (Great Commission, Great Commandment, stewardship); stakeholder messaging profiles for Christian foundations, church partners, individual supporters/intercessors, beneficiaries, and secular/institutional funders |
| `aria-foundation/SKILL.md` | `skills/builtin/` | Any specialist (loaded on demand) | Stakeholder audience profiles, communication principles, dignity in storytelling, impact framing (output → outcome → impact) |
| `projector-creator/SKILL.md` | `skills/builtin/` | Any agent building a Projector tool | General-purpose guidance for building sandboxed, no-network interactive tools that appear on the Projector page (Game Studio is one specialization of this) |

### Architecture docs

| File | Purpose |
|---|---|
| `reference/Clawix SKILL and Agent/README.md` | Architecture diagram, folder layout rationale, deployment runbook, operating rules for staff, what the configuration does not do (still uses generic "NGO" framing) |
| `reference/Clawix SKILL and Agent/PROPOSAL.md` | Strategic case; 10 non-negotiable security principles; full agent + skill roster; MCP connectors (KoboToolbox, PowerBI, Google Drive, Mailchimp — all gated); 90-day impact targets; phased rollout |

### What's next

The dashboard's Phase 2 roadmap card tracks planned features (estimates, not commitments): Partners Directory, Mission Trip Fields, and Kingdom Impact Indicators in the near term; an Evangelism & Outreach agent and Financial Stewardship & Ledger Export shortly after; and further out, a Scripture & Literacy Tracker, a Consent & Story Permissions Tracker, and finishing the Game Studio build pipeline ("Game Studio live wiring"). See [`docs/PHASE2.md`](docs/PHASE2.md) for the separate engineering hardening backlog.

---

## Security model

Light Church follows a **zero-trust architecture** for agent execution:

| Threat | Mitigation |
| --- | --- |
| Cross-user data access | Workspaces only mounted into the owner's container |
| Sub-agent privilege escalation | Sub-agents get read-only curated context, never the full workspace |
| Memory poisoning | Agent context regenerated from the database each run |
| Disk exhaustion | Per-user quota enforcement (default 500 MB) |
| Path traversal | All paths validated to stay under `data/org/` |
| Secret leakage | API keys encrypted at rest (AES-256-GCM) |
| Untrusted code execution | All agent code runs inside sandboxed containers, never on the host |
| Unreviewed content reaching a browser | Game Studio / Projector output renders in a sandboxed iframe with no network access, and never builds before a human approves the storyboard |

---

## Acknowledgments

Light Church is a ministry configuration of Clawix, which builds on ideas from [nanoClaw](https://github.com/qwibitai/nanoclaw) (container-isolated agent execution) and [nanobot](https://github.com/HKUDS/nanobot) (multi-provider AI design patterns).

## License

This project is **dual-licensed**:

- **Core Clawix platform** — [MIT License](LICENSE). Free to use, modify, and distribute, including commercially.
- **NGO/ministry-specific components** — [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). Noncommercial use only — but the PolyForm Noncommercial terms expressly permit charities, educational institutions, public research/health/safety bodies, environmental organizations, and governments, so **NGOs, ministries, and nonprofits may use them freely.**

See the [NOTICE](NOTICE) file for the exact list of paths covered by each license (it's still titled "Clawix for NGOs" — that's the legal/platform identity these paths are governed under, distinct from the "Light Church" branding applied in this deployment). The ministry-specific directories (`reference/Clawix SKILL and Agent/`, `skills/ARIA/`, `skills/builtin/aria-foundation/`) also carry their own local `LICENSE` files.

---

<p align="center">
  <sub>Built for missions and ministries that need AI agents they can actually trust.</sub>
</p>
