# Clawix-based AI Assistant for NGOs — Strategic Proposal

**Reference architecture:** Clawix / ClawX (desktop GUI for OpenClaw-style autonomous agents) running an Anthropic-compatible **Agent + Skill + MCP** stack.
**Constraint:** every component must respect the base security principles of an AI Assistant deployment — sandboxed workspace, scoped tool access, explicit human approval for outbound actions, no autonomous money movement, no silent persistence of beneficiary PII.

---

## 1. Objective

Equip a small-to-mid-size NGO (10–80 staff, multi-supporter, often field-based) with a **multi-agent AI assistant** running locally inside Clawix, so that the NGO can:

1. Compress the time spent on supporter-facing paperwork (proposals, narrative reports, log-frames) by at least half.
2. Raise the quality and traceability of monitoring & evaluation (M&E) data without adding headcount.
3. Keep beneficiary data, safeguarding records, and supporter-restricted information inside a defensible, auditable boundary.
4. Free program staff to spend more time on field delivery and partner relationships, less on document plumbing.

The assistant is **not** a replacement for staff judgment. It is a drafting, structuring, and verification layer that always returns a human-reviewable artifact before any external action.

---

## 2. Security Principles (non-negotiable baseline)

These mirror Anthropic's published AI-Assistant principles and must be honored by every agent and skill in this proposal.

| #   | Principle                                         | How it is enforced in Clawix                                                                                                                                |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Scoped file access**                            | Each agent has an explicit `working_dir`. No agent may read or write outside its declared scope. The NGO workspace is the only mounted folder.              |
| 2   | **Tool whitelisting**                             | `allowed-tools` is declared per agent. New tools require human approval via `request_access`.                                                               |
| 3   | **No autonomous money movement**                  | No agent may execute a transfer, payment, supporter refund, or trade. Agents may _prepare_ a payment instruction; a named human signs off out-of-band.      |
| 4   | **Outbound comms are draft-only**                 | Email, SMS, social posts, supporter portal submissions are drafted into files. Sending requires a human click.                                              |
| 5   | **Beneficiary PII handling**                      | Names, contact details, photos, case notes are tagged `pii:true` and never written to agent memory. Agents read them in-session, then forget.               |
| 6   | **Web access**                                    | Limited to a domain allowlist (supporter portals, OECD-DAC, ReliefWeb, government registries). Suspicious links are surfaced to a human, never auto-opened. |
| 7   | **Audit log**                                     | Every agent action appends one line to `.clawix/audit.log` (timestamp, agent, tool, target, outcome). The log is append-only and human-readable.            |
| 8   | **Refusals carry through**                        | If a skill or agent declines a task (e.g., "draft a misleading supporter narrative"), no other agent in the system may complete it on its behalf.           |
| 9   | **Skills are read-only knowledge, not authority** | Skills cannot grant new tool access. They only encode _how_ to do work the agent is already permitted to do.                                                |
| 10  | **Human-in-the-loop on irreversible actions**     | Submitting a proposal, publishing a report, signing an MOU, sharing data with a third party — all require explicit human confirmation.                      |

---

## 3. Concrete features

### 3.1 The agent roster

Five specialized agents, each narrowly scoped. Specialization is a security feature — it shrinks the blast radius of any single agent.

| Agent                   | Primary responsibility                                                 | Tools                                       | Reads skills                                  |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| `program-coordinator`   | Maintain workplan, partner register, activity tracker; flag deviations | Read, Write, Edit, Grep                     | safeguarding, ngo-comms                       |
| `donor-engagement`      | Draft proposals, narrative + financial reports, supporter research     | Read, Write, Edit, WebSearch (allowlisted)  | donor-proposal, grant-research, impact-report |
| `monitoring-evaluation` | Indicator design, data-collection form drafting, dashboard refresh     | Read, Write, Edit, Bash (read-only on data) | mne, data-protection                          |
| `communications`        | Newsletters, social posts, op-eds, advocacy briefs                     | Read, Write, Edit                           | ngo-comms                                     |
| `field-operations`      | Logistics list, risk register, safeguarding incident triage            | Read, Write, Edit                           | safeguarding, data-protection                 |

Agents talk to each other through **shared files**, not direct delegation. The Program Coordinator drops a brief into `briefs/`; the Supporter Engagement agent picks it up. This keeps each agent's authority narrow and the audit trail clean.

### 3.2 The skill library

Skills are reference packages — encoded best practice the relevant agent reads _before_ drafting.

1. **donor-proposal** — log-frame structure, Theory of Change, OECD-DAC alignment, common supporter templates (FCDO, USAID, ECHO, GAC, SDC, BMZ, private foundations).
2. **mne** — SMART indicator design, baseline/midline/endline structure, qualitative coding, OECD-DAC evaluation criteria.
3. **safeguarding** — PSEA, child safeguarding, incident triage decision tree, mandatory reporting flags.
4. **data-protection** — GDPR + sectoral guidance (ICRC handbook, IASC), consent capture, anonymization recipes.
5. **impact-report** — narrative report structure by supporter, financial reporting touchpoints, beneficiary story consent rules.
6. **grant-research** — supporter scanning checklist, eligibility filters, deadline tracking format.
7. **ngo-comms** — accessible language, do-no-harm in storytelling, dignity-preserving imagery, advocacy framing.

### 3.3 MCP connectors (optional, gated)

Where the NGO already uses external systems, connect them via MCP rather than agent-side credentials.

- **KoboToolbox / ODK** — read-only ingest of survey responses to feed M&E.
- **PowerBI / Metabase** — refresh dashboards (read + refresh, no schema edits).
- **Google Drive / SharePoint** — read partner docs, write to a designated `Drafts/` folder.
- **Mailchimp / Action Network** — draft campaigns; sending stays manual.

Each MCP server is added with `request_access` on first use. The user sees, and approves, exactly which tools the connector exposes.

---

## 4. Deliverables

Files in this folder constitute the deliverable.

```
Clawix SKILL and Agent/
├── PROPOSAL.md                          ← this document
├── README.md                            ← architecture + deployment runbook
├── agents/
│   ├── program-coordinator.md
│   ├── donor-engagement.md
│   ├── monitoring-evaluation.md
│   ├── communications.md
│   └── field-operations.md
└── skills/
    ├── donor-proposal/SKILL.md
    ├── mne/SKILL.md
    ├── safeguarding/SKILL.md
    ├── data-protection/SKILL.md
    ├── impact-report/SKILL.md
    ├── grant-research/SKILL.md
    └── ngo-comms/SKILL.md
```

Each agent file is a self-contained Clawix agent definition (YAML frontmatter + system prompt). Each skill file is a self-contained reference doc the relevant agent reads on demand.

---

## 5. Measurable impact

| Metric                                                                     | Baseline assumption | Target after 90 days      | Method                                            |
| -------------------------------------------------------------------------- | ------------------- | ------------------------- | ------------------------------------------------- |
| Hours per supporter proposal (drafting only)                               | 35 hrs              | ≤ 17 hrs                  | Self-reported, comparing 3 proposals before/after |
| Narrative reports submitted on time                                        | 70%                 | ≥ 95%                     | Supporter portal submission logs                  |
| M&E indicators with documented baseline                                    | 60%                 | ≥ 90%                     | M&E plan audit                                    |
| Beneficiary records with consent flag                                      | unknown / informal  | 100%                      | Data-protection skill enforces flag               |
| Safeguarding incidents triaged within 24 hrs                               | varies              | 100%                      | Field-ops audit log                               |
| Communications backlog (drafts pending)                                    | rolling 2–3 weeks   | ≤ 5 days                  | Comms folder review                               |
| Audit-log integrity                                                        | n/a                 | 100% append-only, no gaps | Log review                                        |
| Security incidents (PII leak, unauthorized payment, off-policy publishing) | n/a                 | 0                         | Audit log review                                  |

A 30-day pulse check is run by the Program Coordinator agent itself: it reads the audit log, summarizes which agents acted on which artifacts, and emits a markdown report into `reports/30-day-review.md`.

---

## 6. Phased rollout

**Phase 0 — sandbox (week 1):** install Clawix, mount the NGO workspace, copy agents + skills, dry-run the Supporter Engagement agent on one historical proposal.

**Phase 1 — supporter cycle (weeks 2–6):** put Supporter Engagement and M&E agents into live use on the next proposal and the next narrative report. Program Coordinator runs in shadow mode (drafts only, no writes outside `drafts/`).

**Phase 2 — operations (weeks 7–10):** activate Field Operations and Communications agents. Connect KoboToolbox MCP if used. Begin 30-day pulse-check cadence.

**Phase 3 — review (week 12):** measure against the targets above; prune or extend skills based on what the agents actually reached for.

Each phase is gated by the Executive Director's sign-off. Nothing escalates automatically.
