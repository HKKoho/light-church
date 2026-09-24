# Architecture — Detailed Layer Specifications

## Layer 1: Data Collection (Human-Authenticated RPA)

### Purpose
Collect raw financial data from bank portals without ever handling credentials.

### Authentication Flow
```
1. Client opens FinPipeline Trigger UI (Next.js web app or Electron desktop)
2. Client clicks "Open Bank Portal" → launches or focuses browser
3. Client manually enters username + password on bank's own login page
4. Client completes 2FA / OTP on their own device (SMS, authenticator app)
5. Client is now on authenticated bank dashboard
6. Client clicks "Start Extraction" in FinPipeline UI
7. Power Automate Desktop (or Playwright) attaches to the existing session
8. Extraction begins — no credentials involved from this point
```

### Browser Session Attachment (Playwright)
```typescript
// Playwright attaches to existing Chrome session via remote debugging port
// Chrome must be launched with: --remote-debugging-port=9222
const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0]; // reuse existing authenticated context
const page = context.pages()[0];       // reuse existing page/tab
```

### Bank-Specific Extractors
Each bank gets its own extractor class extending a base interface:
- `BNUExtractor` — Banco Nacional Ultramarino (Macau)
- `StandardExtractor` — fallback for generic bank layouts
- Extractors are configured via `banks.config.ts` (CSS selectors, URLs, table mappings)

### Data Output (Staging)
Raw extracted data is written to a local staging area as:
- `raw_transactions_[bankId]_[timestamp].json`
- `raw_statements_[bankId]_[timestamp].pdf`

No cloud upload occurs until Layer 2 is triggered.

---

## Layer 2: AI Intelligence (Transform, Classify, Validate)

### Purpose
Take raw, messy bank data and produce clean, warehouse-ready structured records.

### Sub-components

#### 2a. Document AI (AI Builder / Custom)
- Processes PDFs (bank statements, invoices, remittance advices)
- Extracts: date, amount, counterparty, reference number, description
- Uses Microsoft AI Builder prebuilt Invoice/Document model
- Alternatively: custom Python script with Claude API for non-standard docs

#### 2b. LLM Classification (Claude or GPT)
- Input: raw transaction description (e.g. "TRF TO ACCT 1234 GUANGDONG CEMENT")
- Output: structured classification
  ```json
  {
    "category": "Trade Payment",
    "sub_category": "Raw Materials",
    "gl_code": "5100",
    "cost_center": "OPERATIONS",
    "confidence": 0.94,
    "flag": null
  }
  ```
- Prompt is deterministic and auditable (see `/layer2-ai/prompts/classify.ts`)
- Low-confidence results (< 0.80) are queued for human review

#### 2c. Validation Rules Engine
- Checks: duplicate detection, amount range validation, required field presence
- Cross-references: known counterparty list, chart of accounts
- Rejects or flags records that fail validation

#### 2d. Data Warehouse Write
- Clean records written to: Azure SQL / PostgreSQL / Dataverse
- Schema: see `DATA_SCHEMA.md`
- Each record tagged with: `source_bank`, `extraction_timestamp`, `pipeline_run_id`

### LLM Prompt Design Principles
- Never include credentials, session tokens, or PII in prompts
- Input is transaction data only (amounts, descriptions, dates)
- System prompt enforces JSON output format
- Temperature set to 0 for deterministic classification
- All LLM calls logged for audit trail

---

## Layer 3: Client Reporting (Excel / Power BI)

### Purpose
Deliver clean financial data in formats the finance team already knows and trusts.

### Excel Output
- Power Automate cloud flow triggers on new warehouse records
- Populates pre-formatted Excel templates:
  - `Monthly_Transactions_[YYYYMM].xlsx`
  - `GL_Mapping_Summary_[YYYYMM].xlsx`
  - `Anomaly_Review_[YYYYMM].xlsx` (flagged items only)
- Excel files saved to SharePoint / OneDrive / client-specified folder

### Power BI Dashboard
- Real-time push dataset connected to Azure SQL
- Panels:
  - Pipeline health (extraction status per bank, per run)
  - Transaction volume by category / GL code
  - Anomaly count and review queue
  - Monthly trend comparisons

### Client Interaction Model
- Finance team opens Excel as normal — no new tools to learn
- Power BI link shared via email or Teams
- No finance team member ever interacts with Layer 1 or Layer 2 directly

---

## Inter-Layer Communication

```
Layer 1 → Layer 2:  Local file staging (JSON/PDF) + webhook trigger
Layer 2 → Layer 3:  Database write + Power Automate cloud flow trigger
Monitoring:         All layers emit events to central logger (shared/utils/logger.ts)
```

---

## Monitoring Dashboard (Internal Ops)

A separate Next.js dashboard for the AIbyML.com team / client IT ops:
- Live pipeline run status
- Per-bank extraction success/failure rates
- LLM classification confidence distribution
- Human review queue management
- Audit log viewer
