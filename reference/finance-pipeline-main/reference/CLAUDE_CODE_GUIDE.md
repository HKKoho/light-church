# Claude Code Build Guide
# How to use these reference files with Claude Code

## Step 1 — Copy this project to your working directory

```bash
cp -r finpipeline/ ~/your-project-dir/finpipeline
cd ~/your-project-dir/finpipeline
```

## Step 2 — Open Claude Code in that directory

```bash
claude
```

---

## Suggested Build Order & Prompts for Claude Code

### Phase 1 — Foundation

```
Read README.md and docs/ARCHITECTURE.md for full context.
Then set up the npm workspaces monorepo using package.json.
Install all dependencies across all workspaces.
Create tsconfig.json files for root, layer1-rpa, layer2-ai, layer3-client.
Create shared/package.json.
```

### Phase 2 — Shared Types

```
Read shared/types/transaction.types.ts and shared/types/pipeline.types.ts.
Create shared/utils/logger.ts — structured audit logger that writes to console 
and optionally to a PostgreSQL table named pipeline_audit_events.
Create shared/utils/errors.ts — custom error classes: ExtractionError, 
ClassificationError, ValidationError, WarehouseError.
```

### Phase 3 — Layer 1 RPA

```
Read layer1-rpa/src/session/session-attach.ts and layer1-rpa/src/extractors/bnu.extractor.ts.
Read layer1-rpa/config/banks.config.ts.
Build layer1-rpa/src/staging/staging-writer.ts — writes RawTransaction[] 
to JSON files in the staging directory with filename pattern: 
raw_[bankId]_[runId]_[timestamp].json
Build layer1-rpa/src/index.ts — main entry point that:
  1. Accepts CLI args: --bank BNU --from 2026-01-01 --to 2026-03-31 --run-id [uuid]
  2. Calls attachToSession()
  3. Verifies authentication
  4. Runs the appropriate extractor
  5. Writes output to staging
  6. Posts webhook to Layer 2 trigger URL
```

### Phase 4 — Layer 2 AI

```
Read layer2-ai/src/classifiers/llm.classifier.ts and layer2-ai/prompts/classify.ts.
Read docs/DATA_SCHEMA.md for type contracts.
Build layer2-ai/src/extractors/doc-processor.ts — reads staging JSON files, 
normalizes raw fields (parse dates, clean amounts, detect currency).
Build layer2-ai/src/validators/rules.engine.ts — validates ClassifiedTransaction 
against these rules: no null date, amount > 0, valid GL code format, duplicate check.
Build layer2-ai/src/warehouse/db.client.ts — PostgreSQL client using pg library,
with insert method for ClassifiedTransaction.
Build layer2-ai/src/index.ts — orchestrates: read staging → normalize → 
classify (batch) → validate → write to DB → trigger Layer 3 webhook.
```

### Phase 5 — Layer 3 Client

```
Build layer3-client/src/excel/excel-writer.ts — uses exceljs library to 
populate an Excel template with ClassifiedTransaction data formatted as ExcelReportRow.
Output filename pattern: Financial_Report_[bankId]_[YYYYMM].xlsx
Build layer3-client/src/scheduler/webhook-handler.ts — Express endpoint that 
receives trigger from Layer 2 and starts report generation.
Build layer3-client/src/index.ts — Express server on port 3002.
```

### Phase 6 — Monitoring Dashboard (Optional Next Phase)

```
Create a Next.js app in /monitoring-dashboard.
Pages needed:
  - /dashboard — pipeline run status overview
  - /runs/[runId] — drill-down on a single extraction run
  - /review — human review queue for flagged transactions
  - /audit — audit log viewer
Use the PipelineRun and AuditEvent types from shared/types.
Connect to the same PostgreSQL database as Layer 2.
```

---

## Key Files to Always Reference

| File | Purpose |
|------|---------|
| `README.md` | Overview and architecture diagram |
| `docs/ARCHITECTURE.md` | Detailed layer specs and data flows |
| `docs/SECURITY.md` | Trust boundary — what the system never does |
| `docs/DATA_SCHEMA.md` | All TypeScript interfaces as data contracts |
| `shared/types/*.ts` | Source of truth for all types |
| `.env.example` | All required environment variables |
| `layer1-rpa/config/banks.config.ts` | Bank selector mappings (update per client) |
| `layer2-ai/prompts/classify.ts` | LLM system prompt (tune per client's GL codes) |

---

## Notes for Customisation Per Client

1. **banks.config.ts** — CSS selectors must be verified by inspecting the 
   actual bank portal DOM during a client session. Placeholder selectors 
   are provided for BNU but need real values.

2. **classify.ts SYSTEM_PROMPT** — The GL code mapping in the prompt should 
   be updated to match the client's actual Chart of Accounts.

3. **Currency** — Default is MOP for BNU. Update `currency_default` in 
   banks.config.ts per bank.

4. **ANTHROPIC_API_KEY** — Use Claude Sonnet for cost efficiency on large 
   batches. Use Claude Opus for complex or ambiguous transaction descriptions.
