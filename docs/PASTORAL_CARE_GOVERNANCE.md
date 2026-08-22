# Pastoral Care Agent — Governance Model

> Scope: the `pastoral-care` worker agent and its dashboard menu. This document
> describes the implementation as it exists on `origin/main` — the local
> working copy at time of writing is missing these files (see
> [Implementation status](#implementation-status)).

The Pastoral Care agent offers AI-assisted spiritual/pastoral support
conversations (active listening, prayer, Scripture reflection) for Grace
Mission. It is explicitly **not** a therapist, licensed counselor, or
substitute for in-person clergy care — every design decision below traces
back to enforcing that boundary.

Sources: `packages/api/prisma/seed-ngo-agents.ts:438-495` (agent persona),
`skills/builtin/pastoral-care/SKILL.md` (situational technique),
`packages/web/src/app/(dashboard)/ngo/pastoral-care/` (dashboard menu),
`packages/shared/src/schemas/congregation-profile.schema.ts` (tagging
taxonomy), `packages/api/src/common/frontmatter.ts` (record metadata).

---

## 1. Interaction Style, Limits & Data Protection

**Style.** The agent listens and reflects before advising, offers prayer and
Scripture only when invited, and limits self-disclosure to brief empathetic
statements — it never fabricates a personal history, congregation, or
relationships (`seed-ngo-agents.ts:451-454`).

**Interaction limits (hard boundaries the agent cannot be talked out of):**

| Boundary | Enforcement |
|---|---|
| No diagnosis, no medication advice | Refused; redirected to a licensed professional or pastor (`seed-ngo-agents.ts:448, 467, 490`) |
| No impersonating a human pastor/chaplain/counselor | Refused explicitly, including under direct pressure (`seed-ngo-agents.ts:466, 488`) |
| Crisis content (self-harm, abuse, danger to others) always triggers the crisis workflow | Not skippable by a later instruction in the same conversation (`seed-ngo-agents.ts:450, 491`) |

**Data protection at the conversation layer:**

- **Pseudonym discipline** — session notes reference the person by pseudonym only; real names/addresses/identifying detail are a disallowed action (`seed-ngo-agents.ts:455, 468`).
- **Identity mapping is human-only** — the agent can never read or write `pastoral-care/keys/`; only a `super_admin` sees that folder in the dashboard (`pastoral-care/page.tsx` — `ADMIN_FOLDER` gated on `user?.role === 'super_admin'`).
- **Confidentiality between subjects** — the agent is instructed not to reference one person's situation while talking to another (`SKILL.md` conversation checklist).

---

## 2. Data Storage — Appropriateness & Legality (Pastoral Care Menu)

The dashboard's **Pastoral Care menu** (牧養關懷) exposes four workspace
folders as columns, each backed by plain files under `/pastoral-care/`:

| Folder | Contents | Who sees it |
|---|---|---|
| `records/` | Pseudonymized session notes, written at natural conversation close | All care-team roles |
| `flagged/` | Crisis follow-up notes (factual, pseudonymized) requiring human action | All care-team roles |
| `sampled/` | QA sampling of conversations | All care-team roles |
| `keys/` | Pseudonym → real-identity mapping | `super_admin` only |

**Optional tagging.** Care-team members may attach coarse, self-reported tags
to a records/flagged file via `TagProfileDialog`: age band, economic tier,
ethnic group, education level, and — separately, labeled "for pastoral
approach" — MBTI and Enneagram type. Tags are written as YAML frontmatter
directly into the pseudonymized file (`common/frontmatter.ts`,
`PATCH /files/frontmatter`), not into a separate identity-linked record. The
UI copy is explicit that this is "no real identity involved" and fields are
left blank if unknown.

**Legality assessment:**

- **Pseudonymization, not anonymization.** Because `keys/` maps pseudonyms
  back to real people, the record set is still personal data under most
  privacy regimes (GDPR, Taiwan PDPA) even though the note body itself
  carries no direct identifier. The legal protection comes entirely from
  restricting `keys/` access to `super_admin`, not from the data being
  legally anonymous.
- **Special-category data.** Session notes can contain religious/spiritual
  disclosure, mental-health-adjacent content (grief, addiction, crisis), and
  the optional tags include personality typing — several of these fall into
  "special category" data under GDPR Art. 9 (health, religious belief) even
  when pseudonymized. This raises the bar on legal basis and access control
  beyond ordinary personal data.
- **No documented retention or deletion policy.** The repo does not currently
  define how long `records/`, `flagged/`, `sampled/`, or `keys/` entries are
  retained, or a deletion workflow for a person requesting erasure. This is
  the largest open legality gap — recommend defining a retention period and
  a `keys/`-mediated deletion procedure before onboarding real
  congregants.
- **No explicit legal basis captured per conversation.** Consent is implied
  by continuing the conversation after the AI/crisis disclosure, but there is
  no record of *when* that disclosure was given or acknowledged. If this
  needs to stand up to a legal request, capturing a timestamped disclosure
  acknowledgment would close that gap.

---

## 3. System Recognition & Reputation

- **AI identity is mandatory, not a preference.** The agent must state it is
  an AI pastoral-care assistant in its first reply to a new person, and again
  if asked; it cannot claim clergy credentials or ordination
  (`seed-ngo-agents.ts:447`). Refusal patterns explicitly cover "pretend
  you're a real pastor" and "skip the disclaimer" (`seed-ngo-agents.ts:488-489`).
- **Institutional attribution.** The dashboard page labels the feature
  "Pastoral Care" / "牧養關懷" and states it is "Managed by the Pastoral Care
  agent" — the AI is presented as a Light Church service, not an
  independent or third-party product.
- **Reputational risk is concentrated at the crisis workflow.** A mishandled
  crisis disclosure (missed escalation, cold/mechanized response) is the
  scenario most likely to damage trust in the whole platform, which is why
  it's the one workflow marked non-optional and not overridable by
  conversation-level instructions.

---

## 4. Service Users' Understanding & Awareness

- **Upfront, plain-language disclosure** is required before anything
  sensitive is likely to come up, not buried in a terms-of-service screen
  (`seed-ngo-agents.ts:449, 475`).
- **Users can request the disclosure again at any time**, and the agent must
  give it, even in abbreviated form (`seed-ngo-agents.ts:489`).
- **Gap:** disclosure currently lives entirely in the agent's own first
  message — there is no separate consent screen, banner, or logged
  acknowledgment in the dashboard UI before a user starts a Pastoral Care
  conversation (the `page.tsx` "Start conversation" button goes straight to
  `/conversations`). If a paper trail of informed consent is needed (e.g.
  for minors, or for a board/compliance review), that's a UI/data-model
  addition, not just a prompt-engineering one.
- **Gap:** the optional demographic/personality tagging is self-reported
  "for pastoral approach," but the tagged individual is not shown what tags
  exist on their own record or given a way to review/correct them —
  worth deciding whether that transparency is needed.

---

## Implementation status

As of this document, the agent persona, skill file, dashboard menu, and
tagging schema exist on `origin/main` but are **absent from the local working
copy** used in this session (see git diff against `origin/main` for the full
list: `packages/api/src/congregation-profile/*`,
`packages/web/src/app/(dashboard)/ngo/pastoral-care/*`,
`packages/api/src/common/frontmatter.ts`, and related schema/migration
files). Confirm which state is authoritative before treating this document as
a description of what's actually deployed.

---

## Recommendations summary

| Gap | Suggested next step |
|---|---|
| No retention/deletion policy for `pastoral-care/*` | Define a retention period and a `keys/`-mediated erasure workflow |
| No timestamped consent record | Log disclosure-acknowledgment at conversation start, not just in the transcript |
| No user-facing consent screen | Add a one-time consent step before first Pastoral Care conversation |
| Local checkout drift from `origin/main` | Reconcile before further pastoral-care work — see prior note in this session |
