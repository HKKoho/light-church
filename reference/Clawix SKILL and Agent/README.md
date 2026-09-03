# Clawix NGO Assistant — Architecture & Deployment Runbook

This folder is a drop-in Clawix configuration for an NGO. It defines five agents, seven skills, and the security envelope they operate inside.

## Architecture at a glance

```
┌─────────────────────── Clawix desktop (user laptop) ───────────────────────┐
│                                                                            │
│   User                                                                     │
│    │                                                                       │
│    ▼                                                                       │
│  ┌──── Orchestrator (the user's chat with Clawix) ──────────────────────┐  │
│  │                                                                      │  │
│  │   Routes a request to ONE specialized agent at a time.               │  │
│  │   Never auto-chains agents across security boundaries.               │  │
│  │                                                                      │  │
│  └──┬─────────────┬────────────────┬──────────────┬─────────────────────┘  │
│     │             │                │              │                        │
│     ▼             ▼                ▼              ▼                        │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ program │ │ supporter│ │  monitoring  │ │  comms     │ │   field    │   │
│  │  coord  │ │ engagement│ │  evaluation │ │            │ │ operations │   │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘ └─────┬──────┘ └─────┬──────┘   │
│       │           │              │               │              │          │
│       │      reads skills (read-only)            │              │          │
│       └─────┬─────┴──────────────┴───────────────┴──────────────┘          │
│             ▼                                                              │
│        skills/ (donor-proposal, mne, safeguarding, data-protection, …)     │
│                                                                            │
│   File access: only this folder + designated NGO workspace                 │
│   Tools: only those declared in each agent's frontmatter                   │
│   MCP: only servers explicitly approved via request_access                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
        │                                                       │
        │ (gated by request_access, approved per use)           │
        ▼                                                       ▼
   KoboToolbox MCP                                       Supporter portal MCP
   (read-only survey ingest)                             (draft-submit only)
```

The orchestrator is just the user's chat. Agents are invoked one at a time by the user (or by the Program Coordinator dropping a brief into a shared folder). There is no autonomous agent-to-agent calling, by design — that's how blast radius is contained.

## Folder layout (and why)

```
.
├── PROPOSAL.md              ← strategic case + measurable impact
├── README.md                ← this file
├── agents/                  ← five Clawix agent definitions
└── skills/                  ← seven reference packages, read-only
```

The split between **agent** and **skill** is the security boundary:

- An **agent** has tools and authority. It can read, write, and (where allowed) call MCPs.
- A **skill** has knowledge but no authority. It is text the agent reads to learn how to do its job better.

Skills cannot grant new tools. Agents cannot embed credentials. This separation is the same pattern Anthropic uses in Claude Code / Cowork and is preserved here.

## Deployment runbook

1. **Mount the NGO workspace.** In Clawix, point the working directory at the folder where the NGO keeps proposals, M&E data, and partner records. Confirm the agents see only that folder.
2. **Install agents.** Copy `agents/*.md` into Clawix's agent directory. Verify each shows up with the declared `allowed-tools` list.
3. **Install skills.** Copy `skills/*` into Clawix's skill directory. Each agent's frontmatter lists which skills it consults.
4. **Approve MCPs (optional).** When an agent first asks for KoboToolbox or a supporter portal, the user gets a `request_access` prompt. Approve only what is needed.
5. **Set the audit log path.** The agents append to `.clawix/audit.log` in the workspace. Make this file append-only at the OS level if your platform supports it.
6. **Dry run.** Ask the Supporter Engagement agent to redraft a _finished_ proposal as a smoke test. Inspect the diff. Inspect the audit log.
7. **Phase 1 go-live.** See PROPOSAL.md §6.

## Operating rules for staff

- One named **AI Assistant Owner** at the NGO is accountable for the audit log, MCP approvals, and skill updates.
- No agent ever sends external comms or moves money. If an agent's draft is ready to send, a human sends it.
- Beneficiary PII goes into the workspace only inside files marked with `pii: true` in their YAML frontmatter or filename suffix `.pii.md`. The data-protection skill enforces this convention.
- Safeguarding incidents bypass the AI entirely for the first triage step. The field-ops agent only assists with documentation _after_ a human has assessed safety.
- Skills are reviewed quarterly. Supporter templates change; safeguarding policies tighten; the skill files must keep pace.

## What this configuration explicitly does NOT do

- It does not auto-send emails, supporter submissions, social posts, or SMS.
- It does not move money, sign contracts, or commit the NGO to anything.
- It does not store beneficiary PII in agent memory or any persistent assistant state.
- It does not chain agents autonomously across security boundaries.
- It does not fetch arbitrary URLs. Web access is allowlisted by the donor-engagement and grant-research skills.
- It does not replace safeguarding officers, M&E leads, or financial controllers. It assists them.
