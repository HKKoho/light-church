# SMEAdm — Porting the Finance & HR Specialist Agents to Another Clawix App

This is a step-by-step configuration guide for taking just the **Finance** (`finance-assistant` / FELIX) and **HR** (`human-resource` / HANA) specialist agents out of this SME setup and standing them up in a different Clawix deployment, without pulling in the other four SME specialists (operations, admin, marketing, sales).

## 1. What actually exists today

Clawix previously carried **two parallel definitions** of the Finance/HR specialists; only one was ever wired into the running engine.

| Layer                                                                                     | Location                                                                                                                                                                         | Wired into the engine?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent definition** (DB row: system prompt, provider, model, `skillIds`)                 | `packages/api/prisma/seed-sme-agents.ts` (base) + `packages/api/prisma/update-sme-agents.ts` (patched, spawn-capable version)                                                    | Yes — this is what `AgentRunnerService` actually loads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Skill content** (`SKILL.md`, loaded by `SkillLoaderService` into the agent's workspace) | `reference/Clawix SKILL and Agent/SME/SKILL_WORKER_Finance_FELIX.md` and `SKILL_WORKER_HR_HANA.md`, copied into each user's workspace by `packages/api/prisma/seed-sme-users.ts` | Yes — this is the actual FELIX/HANA persona content the agent reads.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ~~Rich skill catalog entry~~                                                              | ~~`skills/builtin/finance-felix/index.json` and `skills/builtin/hr-hana/index.json`~~                                                                                            | **Removed.** These were never read by anything in `packages/api/src` — `SkillLoaderService` only ever loads `SKILL.md` files — and their `systemPrompt` field pointed at a `system-prompt.md` that didn't exist on disk. Deleted from `skills/builtin/` to stop them being mistaken for the live definition. A fuller version of this spec (with a real `system-prompt.md` alongside the `index.json`) still exists under `ConnectorPackage/` if you want to resurrect the tool-schema/approval-gate design later — it was not touched here. |

So the thing to port is just the first two rows.

## 2. Files you need to copy into the target repo

```
reference/Clawix SKILL and Agent/SME/SKILL_WORKER_Finance_FELIX.md
reference/Clawix SKILL and Agent/SME/SKILL_WORKER_HR_HANA.md
packages/api/prisma/seed-sme-agents.ts        # trim to Finance + HR only (§4)
packages/api/prisma/update-sme-agents.ts      # optional patch, trim the same way — see caveat in §5
packages/api/prisma/seed-sme-users.ts         # trim to the two specialist users (§4)
packages/api/prisma/setup-sme.ts              # only needed if you also want the orchestrator's routing table to mention Finance/HR
scripts/seed-sme-agents.mjs
scripts/seed-sme-users.mjs
scripts/update-sme-agents.mjs                 # if you take the patch
```

`packages/api/package.json` needs matching script entries (already present here, copy them verbatim if the target repo doesn't have them):

```json
"seed:sme": "tsx prisma/seed-sme-agents.ts",
"seed:sme-users": "tsx prisma/seed-sme-users.ts"
```

## 3. Prerequisites in the target app

- Same Prisma schema fields: `AgentDefinition.orgType`, `AgentDefinition.skillIds`, `User.orgType`, `Policy` table with an `"Extended"` policy row (from the bootstrap seed — `pnpm run db:seed`).
- `clawix-agent:latest` container image built (`docker build -t clawix-agent:latest -f infra/docker/agent/Dockerfile .`).
- `.env` populated with: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DEFAULT_PROVIDER`, `DEFAULT_LLM_MODEL`, `AGENT_CONTAINER_IMAGE`, `DEFAULT_PASSWORD`.
- Bootstrap seed already run (`pnpm run db:migrate && pnpm run db:seed`) — the specialist-user seed hard-fails if the `"Extended"` policy isn't found.

## 4. Trimming the seed scripts to Finance + HR only

### `prisma/seed-sme-agents.ts`

In the `SME_AGENTS` array, delete the `operations`, `admin-secretary`, `marketing`, and `sales` entries. Keep only `finance-assistant` (skillIds: `['felix-finance']`) and `human-resource` (skillIds: `['hana-hr']`).

### `prisma/seed-sme-users.ts`

In `SKILL_CONTENT`, keep only:

```ts
const SKILL_CONTENT: Record<string, string> = {
  'felix-finance': readSkillFile('SKILL_WORKER_Finance_FELIX.md'),
  'hana-hr': readSkillFile('SKILL_WORKER_HR_HANA.md'),
};
```

In `SME_SPECIALISTS`, keep only the `Finance Officer` and `HR Officer` objects. This is what creates `finance@clawix.test` / `hr@clawix.test`, binds each to their one worker agent via `UserAgent`, and scaffolds their workspace folders (`finance/…`, `hr/…`) plus starter files (`finance/budget.md`, `finance/vendors.md`, `hr/policies/employment-policy.md`, `hr/policies/onboarding-template.md`, `hr/staff-records/headcount.md`).

### `prisma/setup-sme.ts` (optional)

Only needed if the target app also has a "Business Assistant" orchestrator that should route to these two. If so, trim the routing table in `SME_ORCHESTRATOR_PROMPT` to just the Finance and HR rows, and drop references to the other four specialists in the cross-functional coordination patterns section.

## 5. Run order

```bash
pnpm run db:migrate && pnpm run db:seed        # bootstrap: orgs, policies, base agents
node scripts/seed-sme-agents.mjs               # creates finance-assistant + human-resource AgentDefinitions
node scripts/setup-sme.mjs                     # only if porting the orchestrator too
node scripts/seed-sme-users.mjs                # creates finance@clawix.test / hr@clawix.test, binds agents, scaffolds workspaces
```

Each script is idempotent — re-running skips agents/users that already exist (`↩ skipped`), so it's safe to run again after adjusting the trimmed arrays.

### Optional: the "spawn-capable" prompt patch (`update-sme-agents.ts`)

`update-sme-agents.ts` (run via `node scripts/update-sme-agents.mjs`) overwrites `finance-assistant` and `human-resource` with a richer system prompt that delegates aggregation/research work to `spawn`-ed `coder`/`researcher` sub-agents and builds HTML dashboards via the `projector-creator` skill. **Caveat before adopting this version:** its `skillIds` reference builtin skill packages that don't exist in this repo yet — `double-entry-bookkeeping`, `financial-reporting`, `cashflow-analysis`, `balance-sheet`, `internal-audit` (finance) and `data-protection` (both; it exists only under `reference/Clawix SKILL and Agent/skills/data-protection`, not `skills/builtin/`). The prompt text tells the agent to `read_file("/skills/builtin/<name>/SKILL.md")` for each — if you take this patch, either:

- create those `skills/builtin/<name>/SKILL.md` files in the target app first, or
- strip the `# Skill usage` section lines that reference missing skills before seeding.

Otherwise the agent will hit a missing-file read and fall back to unguided behavior for that step.

## 6. Verify

- `pnpm run db:studio` → confirm `finance-assistant` / `human-resource` rows exist with `orgType: 'sme'`, and two `User` rows with matching `UserAgent` bindings.
- Check the target workspace on disk: `data/users/<userId>/workspace/skills/felix-finance/SKILL.md` and `.../hana-hr/SKILL.md` should contain the full FELIX/HANA persona text (not the placeholder "Skill reference file not found" — that placeholder means the `reference/Clawix SKILL and Agent/SME/` files weren't copied into the target repo per §2).
- `node scripts/audit-skill-coverage.mjs` — heuristic check that the sidebar's canned-prompt labels for Finance/HR are backed by real content in the skill files; only meaningful if you also ported `packages/web/src/components/dashboard/app-sidebar.tsx`'s `ExploreArea` entries for these two agents.
- Log in as `finance@clawix.test` / `hr@clawix.test` (password = `DEFAULT_PASSWORD` from `.env`) and confirm each is bound to exactly one worker agent, not the orchestrator.

## 7. What each agent will and won't do (for reference)

Both are hard-gated to **draft-only** behavior — no agent sends, pays, signs, hires, or publishes:

- **finance-assistant**: invoice processing, monthly expense reports, payroll summary drafts (reads `hr/staff-records/headcount.md`, writes `finance/payroll/summary-*.md` flagged `[PAYROLL REVIEW: CFO sign-off required]`), P&L reports. Refuses fund transfers, backdating, and including individual salaries outside `finance/payroll/`.
- **human-resource**: job posting drafts (with an EEO bias scan), CV shortlisting, interview scheduling, onboarding checklists, staff record updates. Refuses to issue binding offers, contact candidates on their own initiative, or write to `finance/payroll/` directly (drops a brief in `briefs/` instead).

Both append one line per action to `.clawix/audit.log` in their workspace.
