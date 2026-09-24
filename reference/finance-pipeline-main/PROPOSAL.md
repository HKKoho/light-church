# FinPipeline — Intelligent Financial Data Pipeline

## Project Proposal

**Prepared by:** AIbyML.com
**Date:** March 2026
**Version:** 1.0

---

## Executive Summary

Financial institutions and enterprise clients across Asia-Pacific face a persistent challenge: extracting, classifying, and reporting on banking transaction data remains a manual, error-prone, and time-consuming process. Finance teams spend hundreds of hours per month copying data from bank portals, categorising transactions in spreadsheets, and reconciling records against the General Ledger.

**FinPipeline** is an AI-augmented financial data pipeline that automates this entire workflow across five distinct service layers — while never touching, storing, or transmitting bank credentials. The system is designed around a core principle:

> **"AI handles intelligence, not identity."**

The result is a secure, auditable, and compliant solution that reduces manual processing time by up to 90%, improves classification accuracy to over 95%, and delivers reports in the formats finance teams already use — Excel (for Power BI in future).

---

## The Problem

| Pain Point | Impact |
|------------|--------|
| Manual data extraction from multiple bank portals | 10-20 hours/month per bank account |
| Inconsistent transaction categorisation | GL mapping errors, audit findings |
| No standardised classification across banks | Cross-bank reporting requires manual reconciliation |
| Delayed reporting cycles | Monthly close extended by days |
| Credential sharing for automated access | Security risk, regulatory non-compliance |
| No audit trail for data transformation | Difficult to trace how raw data became a GL entry |

---

## Proposed Solution

FinPipeline addresses these challenges through a 5-layer architecture where each layer has a clear responsibility, a defined trust boundary, and no overlap with the others.

```
                         CLIENT TRUST ZONE
                    (credentials never leave here)
    ┌──────────────────────────────────────────────────────┐
    │  Power Automate opens bank portal for the user       │
    │  User logs in and completes 2FA/OTP (human step)     │
    │  Power Automate detects authenticated session        │
    └──────────────────────┬───────────────────────────────┘
                           │ authenticated session (read-only)
    ┌──────────────────────▼───────────────────────────────┐
    │  LAYER 1 — Power Automate - RPA                      │
    │  Power Automate Desktop handles login, 2FA,          │
    │  and browser automation to extract transactions      │
    │  Raw data staged locally as JSON/PDF                 │
    └──────────────────────┬───────────────────────────────┘
                           │ raw data files
    ┌──────────────────────▼───────────────────────────────┐
    │  LAYER 2 — AI Intelligence                           │
    │  Normalise, classify (LLM), validate                 │
    └──────────────────────┬───────────────────────────────┘
                           │ classified records
    ┌──────────────────────▼───────────────────────────────┐
    │  LAYER 3 — Client Reporting                          │
    │  Excel reports, Power BI dashboards, SharePoint      │
    └──────────────────────┬───────────────────────────────┘
                           │ classified data
    ┌──────────────────────▼───────────────────────────────┐
    │  LAYER 4 — AI Assistant (FinPilot)                   │
    │  Conversational AI for data integrity verification   │
    │  Human-in-the-loop audit, reclassification, analysis │
    │  Natural language queries, anomaly detection         │
    │  Bridges AI accuracy with human insight => 99%+      │
    └──────────────────────┬───────────────────────────────┘
                           │ verified, clean data
    ┌──────────────────────▼───────────────────────────────┐
    │  LAYER 5 — Data Warehouse Export                     │
    │  Multi-target export: PostgreSQL, JSON, CSV          │
    │  Configurable connectors, batch processing           │
    │  Only verified data reaches the warehouse            │
    └──────────────────────────────────────────────────────┘
```

---

## Layer 1: Power Automate - RPA (Data Collection)

### Overview

Layer 1 uses **Microsoft Power Automate Desktop** as the RPA engine to collect raw financial data from bank portals. Power Automate handles the entire browser interaction lifecycle — from launching the bank portal, guiding the user through login and 2FA authentication, to extracting transaction data from the authenticated session.

The key principle: **Power Automate orchestrates the flow, while the human provides identity.**

### How Power Automate - RPA Works

1. **Power Automate Desktop flow is triggered** — the user clicks "Start Extraction" in the FinPipeline dashboard or launches the flow directly from Power Automate
2. **Power Automate opens the bank portal** — the desktop flow launches Chrome and navigates to the bank's login page
3. **User authenticates via Power Automate's UI interaction** — Power Automate presents the login form and waits for the user to enter credentials and complete 2FA/OTP on their own device. Power Automate does **not** store or replay credentials — it simply waits for the human to authenticate
4. **Power Automate detects successful login** — the flow monitors the page for post-login indicators (e.g., account dashboard elements) to confirm the session is authenticated
5. **Power Automate extracts transaction data** — bank-specific extraction actions navigate to the transaction page, read table rows, handle pagination, and collect all visible transaction data
6. **Raw data is staged locally** — Power Automate writes the extracted data to a local staging directory as structured JSON files via Chrome DevTools Protocol (CDP)
7. **The flow completes** — the browser session remains intact for the user

### Power Automate Desktop Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│  POWER AUTOMATE DESKTOP FLOW                        │
│                                                     │
│  1. Launch Browser → Navigate to Bank Portal        │
│  2. Wait for User Login + 2FA (human interaction)   │
│  3. Detect Authenticated Session                    │
│  4. Navigate to Transaction Page                    │
│  5. Extract Table Rows (with pagination)            │
│  6. Write JSON to Staging Directory                 │
│  7. Signal Pipeline → Trigger Layer 2               │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Power Automate as the RPA engine** — Microsoft's enterprise-grade RPA platform provides reliable browser automation, UI interaction recording, and built-in error handling
- **No credential storage** — Power Automate waits for human authentication; it never captures, stores, or replays passwords or OTPs
- **Human-in-the-loop login** — The user authenticates manually within the Power Automate flow; the RPA handles everything before and after the login step
- **Bank-specific extraction flows** — Each bank portal has its own Power Automate sub-flow with configurable selectors, date formats, and pagination logic
- **CDP integration** — Power Automate connects to Chrome via DevTools Protocol for precise DOM interaction and data extraction
- **Local staging** — Raw data stays on the client's machine until Layer 2 is explicitly triggered

### Supported Banks (Initial)

| Bank | Region | Power Automate Flow Status |
|------|--------|---------------------------|
| Banco Nacional Ultramarino (BNU) | Macau | Flow configured with placeholder selectors |
| HSBC Hong Kong | Hong Kong | Flow template ready, selectors pending client session |

### Technology

- **Microsoft Power Automate Desktop** — Primary RPA engine for browser automation and UI interaction
- **Playwright** (TypeScript) — Programmatic extraction engine, triggered by Power Automate via CDP
- **Chrome DevTools Protocol** — Session attachment for DOM-level data extraction
- Configurable per-bank via `banks.config.ts` and Power Automate flow parameters

---

## Layer 2: AI Intelligence (Transform, Classify, Validate)

### Overview

Layer 2 takes raw, messy bank data and produces clean, warehouse-ready structured records. It is the intelligence core of the pipeline — powered by large language models for classification and a deterministic rules engine for validation.

### Processing Pipeline

```
Raw JSON ──> Normalise ──> LLM Classify ──> Validate ──> Warehouse
  (staging)    (dates,       (Claude API)    (rules       (database)
               amounts,                      engine)
               currency)
```

### Sub-Components

#### 2a. Document Processor

Normalises raw extracted data:
- Parses dates from multiple formats (DD/MM/YYYY, DD MMM YYYY, ISO 8601)
- Cleans and parses monetary amounts (handles commas, currency symbols)
- Detects transaction direction (DEBIT vs CREDIT)
- Maps to the standardised `ClassificationRequest` schema

#### 2b. LLM Classification Engine

Uses Claude (Anthropic API) to classify each transaction into structured categories:

**Input:** Raw transaction description, amount, direction, bank, date

**Output:**
```json
{
  "category": "Trade Payment",
  "sub_category": "Raw Materials",
  "gl_code": "5100",
  "cost_center": "OPERATIONS",
  "confidence": 0.94,
  "reasoning": "Payment to supplier for construction materials",
  "flag": null
}
```

**Classification Categories:**

| Category | GL Code | Description |
|----------|---------|-------------|
| Trade Payment | 5100 | Payments to suppliers for goods |
| Trade Receipt | 4100 | Receipts from customers |
| Payroll | 6100 | Salary and wage payments |
| Tax Payment | 7100 | Government tax payments |
| Utility Payment | 6200 | Electricity, water, telecoms |
| Interbank Transfer | 1200 | Transfers between own accounts |
| Loan Repayment | 2100 | Loan principal or interest |
| Investment | 1500 | Financial instrument purchases |
| Other Expense | 9100 | Unclassified outflows |
| Other Income | 9200 | Unclassified inflows |

**Design Principles:**
- Temperature set to 0 for deterministic, reproducible results
- System prompt enforces strict JSON output format
- GL code mappings are customisable per client's Chart of Accounts
- Batch processing (up to 20 transactions per LLM call) for cost efficiency
- All LLM calls logged for complete audit trail

#### 2c. Validation Rules Engine

Every classified transaction passes through a deterministic rules engine:

| Rule | Action on Failure |
|------|-------------------|
| Date must be valid | REJECTED |
| Amount must be > 0 | REJECTED |
| GL code must be 4-digit format | FLAGGED |
| Duplicate detection (description + amount + date) | FLAGGED |
| Classification confidence < 80% | FLAGGED — queued for human review |

Transactions with status **FLAGGED** are written to the warehouse but require human review before they are included in final reports. Transactions with status **REJECTED** are excluded from the warehouse entirely.

#### 2d. Data Warehouse

Clean, validated records are written to the database with full lineage:
- Every record tagged with `source_bank`, `pipeline_run_id`, `classification_model`
- Pipeline run metadata tracked (records extracted, classified, flagged, errors)
- Supports SQLite for development, PostgreSQL / Azure SQL for production

### Technology

- **Claude API** (Anthropic) for LLM classification
- **Custom TypeScript rules engine** for validation
- **SQLite / PostgreSQL** for data warehouse

---

## Layer 3: Client Reporting (Excel)

### Overview

Layer 3 delivers clean financial data in the formats finance teams already know and trust. No new tools to learn — the output is Excel spreadsheets.

### Excel Reports

Each pipeline run generates a multi-sheet Excel workbook:

| Sheet | Contents |
|-------|----------|
| **Transactions** | Full transaction list with date, description, debit/credit, GL code, cost center, status. Auto-filtered. Flagged rows highlighted in yellow. |
| **GL Summary** | Aggregated totals by GL code — total debit, total credit, transaction count per category. |
| **Anomaly Review** | Flagged transactions only — transaction ID, confidence score, validation flags, review status. |

**Output filename pattern:** `Financial_Report_[bankId]_[YYYYMM].xlsx`

### Client Interaction Model

- Finance team opens Excel as normal — no new tools to learn
- Power BI link shared via email or Microsoft Teams
- No finance team member ever interacts with Layer 1 or Layer 2 directly
- Reports delivered to SharePoint / OneDrive / client-specified folder

### Technology

- **ExcelJS** for programmatic Excel generation
- **Express.js** webhook handler for automated triggering

---

## Layer 4: AI Assistant — FinPilot

### Overview

FinPilot is a conversational AI engine that sits between reporting and warehouse export. It serves as the **human-in-the-loop intelligence layer** — helping finance teams verify data extraction integrity, audit AI classifications, and interactively transform data through natural language before it reaches the warehouse.

> **Design Goal:** Combine AI speed with human insight to achieve 99%+ data correctness.

Where Layer 2 provides automated classification, Layer 4 provides **supervised verification** — the AI Assistant proactively identifies potential issues and presents them to humans for review, explanation, and correction. Only data that passes this verification gate flows to the warehouse in Layer 5.

### Why an AI Assistant for Data Integrity?

| Challenge | How FinPilot Solves It |
|-----------|------------------------|
| RPA extraction may miss rows or capture garbage data | FinPilot audits extracted data against expected patterns and flags anomalies |
| LLM classification is ~95% accurate, not 100% | FinPilot presents low-confidence items with context for human review |
| Finance teams lack SQL skills to query data | FinPilot translates natural language to data queries |
| Reclassification requires developer intervention | FinPilot lets users reclassify via chat: "Move all Uber charges to Travel" |
| Export workflows are manual and error-prone | FinPilot triggers warehouse exports with filters via conversation |
| Anomaly detection requires custom rules | FinPilot scans for duplicates, outliers, and mismatches on demand |

### Capabilities

#### 1. Data Integrity Audit
- "Audit all transactions" — scans for missing dates, zero amounts, invalid GL codes
- "Show me anomalies" — identifies low-confidence, duplicate, and outlier transactions
- "Verify BNU extraction" — checks extracted data against expected bank patterns
- Proactive flagging: highlights issues before they reach the warehouse

#### 2. Interactive Classification
- "Reclassify all flagged items as Trade Payment" — bulk reclassification
- "Change tx-3 category to Utilities" — single transaction update
- "Why was this transaction flagged?" — explains classification reasoning
- Suggests GL codes based on description patterns

#### 3. Natural Language Query
- "Show me all transactions over $1,000" — filtered search
- "List flagged items from Chase Business" — bank + status filter
- "Find transactions from last month" — date range queries
- Results displayed inline with data tables

#### 4. Analysis & Reporting
- "Summarise by category" — aggregated totals per GL code
- "Top 10 expenses" — ranked by amount
- "Compare this month to last month" — trend analysis
- "Break down spending by bank" — multi-bank comparison

#### 5. Warehouse Export Trigger
- "Export all approved transactions as CSV" — filtered export
- "Push verified data to warehouse" — triggers Layer 5 export pipeline
- "Download flagged items as JSON" — targeted extraction

### How It Works

```
User (chat) ──> FinPilot AI Engine ──> Action Executor ──> Database
                     │                       │
                     │                       └──> Export Manager (Layer 5)
                     │
                     └──> Gemini API (for complex reasoning)
                          or Local Engine (for structured actions)
```

1. User types a natural language request in the chat panel
2. FinPilot interprets the intent and determines the action type
3. For data operations (classify, query, export), the Action Executor runs against the database
4. For complex reasoning (explain, audit, analyse patterns), the Gemini AI provides deeper analysis
5. Results are returned with inline data tables and suggested follow-up actions
6. Every interaction is logged to the audit trail

### The 99% Correctness Model

FinPilot achieves near-perfect data correctness through a layered verification approach:

```
Layer 2 Automated Classification ──────────────> ~95% accuracy
  + Layer 4 AI-Assisted Anomaly Detection ─────> catches 3-4% of remaining errors
  + Layer 4 Human Review Queue ────────────────> catches final 1%
  ─────────────────────────────────────────────
  = 99%+ verified correctness
  ─────────────────────────────────────────────
  Layer 5 Warehouse Export ────────────────────> only verified data exported
```

| Stage | Method | Error Caught |
|-------|--------|-------------|
| Automated (Layer 2) | LLM classification + rules engine | Obvious categorisation, format errors |
| AI-Assisted (Layer 4) | FinPilot anomaly scan, pattern analysis | Subtle mismatches, duplicates, outliers |
| Human Review (Layer 4) | Finance team via chat + review queue | Edge cases, business context, policy decisions |
| Warehouse Gate (Layer 5) | Only verified data passes through | Ensures 99%+ correctness in final warehouse |

### Technology

- **Gemini API** for natural language understanding and complex reasoning
- **Local fallback engine** for structured actions when API is unavailable
- **Action Executor** with direct database access for classify/transform/query/export
- **Real-time chat UI** embedded in the dashboard (React component)

---

## Layer 5: Data Warehouse Export

### Overview

Layer 5 is the final gate — it pushes verified, human-audited transaction data to the client's designated data warehouse. Data only reaches this layer after passing through Layer 4 (FinPilot verification), ensuring that the warehouse contains 99%+ correct records.

### Supported Export Targets

| Target | Format | Use Case |
|--------|--------|----------|
| **PostgreSQL / Azure SQL** | SQL INSERT | Production data warehouse, BI tools, ERP integration |
| **JSON File Export** | Structured JSON | Local backup, API consumption, data lake ingestion |
| **CSV File Export** | Flat CSV | Legacy system import, spreadsheet analysis, S3/Blob upload |
| **Dataverse** (planned) | API push | Microsoft Power Platform / Dynamics 365 integration |
| **BigQuery** (planned) | Streaming insert | Google Cloud analytics workloads |

### Architecture

```
Verified Data ──> Export Manager ─┬──> PostgreSQL Connector ──> Azure SQL / RDS
  (from Layer 4)                  ├──> JSON Connector ──> Local / S3 / Blob
                                  ├──> CSV Connector ──> Local / SFTP
                                  └──> (future connectors)
```

### Key Features

- **Verification gate** — Only data that passed Layer 4 FinPilot review reaches the warehouse
- **Multi-target simultaneous export** — Write to PostgreSQL and JSON backup in one operation
- **Connector-based architecture** — Add new targets by implementing a single interface
- **Batch processing** — Configurable batch size (default 100) for large datasets
- **Upsert support** — PostgreSQL connector uses `ON CONFLICT` to handle re-exports safely
- **Environment-driven configuration** — Enable/disable targets via environment variables
- **Audit logging** — Every export event logged with target, record count, and timestamp

### Export API

| Endpoint | Description |
|----------|-------------|
| `GET /api/warehouse/targets` | List configured export targets and their status |
| `POST /api/warehouse/export` | Trigger export with format and optional filters |
| `GET /api/warehouse/export/download/:file` | Download an exported file |

---

## Security Model

### Core Principle

> The system is designed so that **no credentials, passwords, OTPs, or session tokens ever enter the application codebase, database, or AI pipeline.**

### Trust Boundary

```
┌─────────────────────────────────────────────────────┐
│  CLIENT'S TRUST ZONE                                │
│                                                     │
│  - Power Automate opens bank portal                 │
│  - User enters credentials (never stored by RPA)    │
│  - User completes 2FA / OTP on their own device     │
│  - Power Automate detects authenticated session     │
│                                                     │
│  ──────────── TRUST BOUNDARY ──────────────────     │
│    (Power Automate hands off authenticated session) │
└──────────────────────┬──────────────────────────────┘
                       │ CDP port attach (read-only)
┌──────────────────────▼──────────────────────────────┐
│  FINPIPELINE SYSTEM ZONE                            │
│                                                     │
│  Layer 1: Power Automate extracts DOM/tables        │
│  Layer 2: processes transaction records only        │
│  Layer 3: generates reports                         │
│  Layer 4: FinPilot verifies data integrity          │
│  Layer 5: exports verified data to warehouse        │
│                                                     │
│  Nothing in this zone ever sees a password or OTP   │
└─────────────────────────────────────────────────────┘
```

### What the System Never Does

| Action | Status |
|--------|--------|
| Store bank passwords | Never — not collected at any point |
| Store OTP / 2FA codes | Never — not collected at any point |
| Replay or reuse sessions | Never — each run requires fresh human login |
| Send credentials to LLM | Never — LLM only receives transaction data |
| Log raw session cookies | Never — session attachment is transient |
| Access bank APIs with stored tokens | Never — all access is human-initiated |

### Audit Trail

Every pipeline run generates an immutable audit record:
- Run ID (UUID)
- Client user ID (not credentials)
- Bank identifier
- Timestamp of extraction start/end
- Record count extracted, classified, and flagged
- Classification model used
- All validation flags raised

Audit records are append-only and cannot be modified post-creation.

### Regulatory Alignment

| Jurisdiction | Regulation | Compliance Approach |
|--------------|------------|---------------------|
| Macau | AMCM data protection guidelines | No credential storage, human-initiated access |
| Singapore | MAS TRM Guidelines | Audit trail, access logging, no credential delegation |
| Malaysia | BNM RMiT | Human authentication, no automated credential reuse |
| General | GDPR / PDPA principles | Minimal data collection, purpose limitation |

---

## Sensitive Data Consideration

While FinPipeline never touches bank credentials, transaction data itself — descriptions, amounts, counterparty names — may be considered sensitive by clients. For organisations that are not comfortable sending financial data to remote AI engines, the system supports three deployment modes.

### Option 1: PII Masking (Remote AI with Data Protection)

A masking layer sits between Layer 1 and Layer 2. Sensitive fields are redacted or generalised before reaching the LLM. The AI only receives what it needs for classification — transaction description patterns and amount ranges — never raw account numbers, beneficiary names, or balances.

| Field | Treatment | What the LLM Sees |
|-------|-----------|-------------------|
| Account number | Masked | `****4521` |
| Beneficiary name | Generalised | `COMPANY_A`, `PERSON_B` |
| Account balance | Removed | Not sent |
| Transaction description | Kept | `ACH WTHDRWL AMAZON WEB SVCS` (needed for classification) |
| Amount | Kept or bucketed | `$500` or `MEDIUM_AMOUNT` |
| Date | Kept | Needed for classification context |

```
Raw data → Mask PII → Send to remote LLM → Get classification → Reattach original data
```

After the LLM returns the classification (category, GL code, confidence), the original unmasked values are reattached to the record. The LLM never sees the full picture.

### Option 2: Local LLM (No Data Leaves the Network)

Run an open-source LLM entirely on the client's infrastructure. No API calls, no data transmitted externally.

| Solution | Models | Hardware | Classification Quality |
|----------|--------|----------|----------------------|
| **Ollama** | Llama 3.1, Mistral, Phi-4, Qwen 2.5 | 16GB+ RAM, GPU optional | ~80-90% vs remote AI |
| **LM Studio** | Same models, desktop GUI | 16GB+ RAM | ~80-90% |
| **vLLM** | Production server deployment | GPU recommended (A100/4090) | ~80-90% |
| **llama.cpp** | GGUF quantised models | 8GB+ RAM (CPU viable) | ~75-85% |

For transaction classification, even smaller models (7B–14B parameters) perform well because the task is structured and repetitive — pattern matching against known categories, not creative reasoning.

**Recommended local models for financial classification:**

| Model | Size | Strength |
|-------|------|----------|
| Llama 3.1 8B | ~5GB | Good balance of speed and accuracy |
| Mistral 7B | ~4GB | Fast, strong at structured JSON output |
| Phi-4 14B | ~8GB | Strong reasoning for its size |
| Qwen 2.5 14B | ~9GB | Excellent structured output compliance |

### Option 3: Hybrid (Recommended)

Combine both approaches for maximum flexibility. Use a local LLM as the default engine, with masked remote AI as an optional fallback for edge cases where the local model is uncertain.

```
Layer 2 Classification Engine
  │
  ├─ Default: Local LLM (Ollama) — all data stays on-premise
  ├─ Fallback: Masked data → Remote API — when local confidence < threshold
  └─ Config: Client selects mode via environment variable
```

### Configuration

The classification engine is controlled via environment variables:

```env
# Classification engine: "local", "remote", or "hybrid"
CLASSIFICATION_ENGINE=local

# Local LLM (Ollama)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Remote AI with masking
ANTHROPIC_API_KEY=your_key
MASK_PII_ENABLED=true

# Hybrid threshold — local confidence below this triggers remote fallback
HYBRID_CONFIDENCE_THRESHOLD=0.80
```

### Client Decision Matrix

| Client Concern | Recommended Mode | Trade-off |
|----------------|-----------------|-----------|
| No data may leave the network | **Local LLM** | Slightly lower accuracy (~85-90%), requires local hardware |
| Data can leave if anonymised | **PII Masking + Remote AI** | High accuracy (~95%), masking adds processing step |
| Maximum accuracy with privacy | **Hybrid** | Best of both, most complex to configure |
| No data sensitivity concerns | **Remote AI** (default) | Highest accuracy (~95%), simplest setup |

---

## Workflow: End-to-End Pipeline Run

### Step-by-Step

```
Step 1  │  Power Automate Desktop flow launches
        │  → Opens bank portal in Chrome
        │  → Presents login page to user
        │
Step 2  │  User authenticates within Power Automate flow
        │  → Enters credentials (Power Automate does NOT store them)
        │  → Completes 2FA/OTP on their device
        │  → Power Automate detects successful login
        │
Step 3  │  Power Automate - RPA extracts transaction data
        │  → Navigates to transaction page
        │  → Extracts table rows across all pages (via CDP)
        │  → Writes raw JSON to staging directory
        │  → Signals completion to FinPipeline
        │
Step 4  │  Layer 2 reads staging file
        │  → Normalises dates, amounts, currency
        │  → Sends transaction descriptions to Claude API (batch)
        │  → Receives structured classifications with GL codes
        │  → Runs validation rules engine
        │  → Writes clean records to data warehouse
        │  → Flags low-confidence items for human review
        │
Step 5  │  Layer 3 triggered via webhook
        │  → Reads classified transactions from warehouse
        │  → Generates multi-sheet Excel report
        │  → Saves to reports directory / SharePoint
        │
Step 6  │  FinPilot AI Assistant (Layer 4) — verification gate
        │  → Finance team opens chat: "Audit today's extraction"
        │  → FinPilot scans for anomalies, duplicates, mismatches
        │  → Presents flagged items with explanations
        │  → User reclassifies or approves via natural language
        │  → 99%+ data correctness achieved through human + AI
        │
Step 7  │  Layer 5 exports verified data to warehouse
        │  → "Push verified data to warehouse" via FinPilot or API
        │  → Multi-target: PostgreSQL, JSON backup, CSV
        │  → Batch upsert with conflict resolution
        │  → Audit event logged per export
        │  → Only human-verified data reaches the warehouse
```

### Pipeline Status Tracking

Each run is tracked with granular status per layer:

| Field | Description |
|-------|-------------|
| `run_id` | Unique identifier for the pipeline run |
| `layer1_status` | PENDING / RUNNING / COMPLETE / FAILED |
| `layer1_records_extracted` | Number of raw records extracted |
| `layer2_status` | PENDING / RUNNING / COMPLETE / FAILED |
| `layer2_records_classified` | Number of records successfully classified |
| `layer2_records_flagged` | Number of records requiring human review |
| `layer3_status` | PENDING / RUNNING / COMPLETE / FAILED |
| `layer3_excel_path` | Path to generated Excel report |

---

## Technology Stack

| Layer | Component | Technology |
|-------|-----------|------------|
| 1 | RPA Engine | **Microsoft Power Automate Desktop** |
| 1 | Browser Automation | Playwright (TypeScript), triggered by Power Automate |
| 1 | Session Attachment | Chrome DevTools Protocol (CDP) |
| 1 | Login & Authentication Flow | Power Automate UI interaction (human-in-the-loop) |
| 2 | Document Processing | Custom TypeScript normaliser |
| 2 | LLM Classification | Claude API (Anthropic) / Gemini API (Google) |
| 2 | Data Validation | Custom TypeScript rules engine |
| 2 | Data Warehouse (internal) | SQLite (dev) / PostgreSQL / Azure SQL (prod) |
| 3 | Excel Reporting | ExcelJS |
| 3 | Dashboard | Power BI (future phase) |
| 4 | AI Assistant Engine | Gemini API + local fallback |
| 4 | Action Executor | Direct DB operations, export triggers |
| 4 | Chat Interface | React real-time chat component |
| 5 | Warehouse Export | Multi-connector engine (PostgreSQL, JSON, CSV) |
| 5 | Cloud Storage | Azure Blob / S3 / SharePoint (planned) |
| All | Frontend Dashboard | React + Tailwind CSS + Vite |
| All | API Server | Express.js (TypeScript) |
| All | Monitoring & Audit | Structured logger with audit event table |

---

## Dashboard & Operations UI

The existing web dashboard provides:

- **Login Page** — Secure access with corporate credentials
- **Status Cards** — Real-time metrics: rows processed, success rate, pending reviews
- **Bot Control Center** — Trigger and monitor extraction bots per bank
- **Data Ingestion Panel** — Paste raw transaction text for AI classification testing
- **Transaction Worksheet** — Filterable table with approve/flag actions per transaction
- **Bank Filtering** — View transactions by bank account

### Pipeline API Endpoints (Integrated)

| Endpoint | Description |
|----------|-------------|
| `GET /api/pipeline/runs` | List all pipeline runs with status |
| `GET /api/pipeline/transactions` | Classified transactions (latest 200) |
| `GET /api/pipeline/review-queue` | Flagged items awaiting human review |
| `POST /api/pipeline/review/:id` | Approve or reject a flagged transaction |
| `GET /api/pipeline/stats` | Pipeline-wide statistics |
| `GET /api/pipeline/reports/:runId/download` | Download Excel report |
| `GET /api/warehouse/targets` | List configured warehouse export targets |
| `POST /api/warehouse/export` | Export data to warehouse (JSON/CSV/PostgreSQL) |
| `GET /api/warehouse/export/download/:file` | Download exported file |
| `POST /api/assistant/chat` | Send message to FinPilot AI Assistant |

---

## Implementation Phases

### Phase 1 — Foundation

- Monorepo setup with npm workspaces
- Shared types and utility libraries
- Frontend dashboard with login, status cards, transaction table
- Express API server with SQLite database

### Phase 2 — Service Layers 

- Layer 1: Power Automate Desktop flows, session attachment, BNU extractor, staging writer
- Layer 2: LLM classifier, document processor, rules engine, warehouse client
- Layer 3: Excel report writer, webhook handler
- Pipeline API routes integrated into main server

### Phase 2b — AI Assistant & Warehouse Export

- Layer 4: FinPilot AI Assistant with Gemini API integration
- Layer 4: Action Executor for classify, transform, analyse, query, export
- Layer 4: Real-time chat UI component embedded in dashboard
- Layer 5: Multi-target export engine (PostgreSQL, JSON, CSV connectors)
- Layer 5: Export Manager with simultaneous multi-target writes
- AI Assistant and warehouse export API routes integrated

### Phase 3 — Sensitive Data Options

- PII masking layer for account numbers, beneficiary names, and balances
- Ollama local LLM connector for on-premise classification
- Hybrid classification engine with local + masked remote fallback
- Confidence threshold routing and configuration

### Phase 4 — Client Deployment

- Deploy Power Automate Desktop flows to client machines
- Configure Power Automate login/authentication flows per bank portal
- Verify BNU bank portal CSS selectors during live client session
- Configure client's Chart of Accounts in classification prompt
- Set up client environment (Power Automate Desktop, Chrome CDP, staging directory, database)
- End-to-end pipeline test with real bank data
- Deploy to client infrastructure

### Phase 5 — User Training & Handover

- Train finance team on dashboard usage and FinPilot AI Assistant
- Excel report review workflow and transaction approval/flagging process
- Documentation walkthrough and operational handover

---

## Deliverables

| Deliverable | Format | Frequency |
|-------------|--------|-----------|
| Classified transaction data | Database records | Per pipeline run |
| Monthly transaction report | Excel (.xlsx) | Monthly or on-demand |
| GL mapping summary | Excel sheet | Per report |
| Anomaly review list | Excel sheet | Per report |
| Warehouse export (PostgreSQL) | SQL records | Per pipeline run or on-demand |
| Warehouse export (JSON/CSV) | File export | On-demand via API or AI Assistant |
| AI-assisted audit report | Chat + data tables | On-demand via FinPilot |
| Pipeline audit log | Database + API | Continuous |
| Operations dashboard | Web application | Real-time |

---

## Key Benefits

| Benefit | Detail |
|---------|--------|
| **90% reduction in manual processing** | Automated extraction, classification, and reporting |
| **99%+ data correctness** | AI classification (95%) + FinPilot anomaly detection (3-4%) + human review (1%) |
| **Zero credential exposure** | Human-authenticated, no passwords in the system |
| **Full audit trail** | Every record traceable from raw extraction to final report |
| **Regulatory compliance** | Aligned with AMCM, MAS TRM, BNM RMiT, GDPR/PDPA |
| **No new tools for finance teams** | Output in Excel, Power BI, and natural language chat |
| **Scalable across banks** | Add new banks via configuration, not code rewrite |
| **Human + AI verification** | FinPilot AI Assistant bridges automated processing with human insight |
| **Multi-target warehouse export** | Push to PostgreSQL, Azure SQL, JSON, CSV simultaneously |
| **Conversational data management** | Reclassify, query, and export data via natural language |

---

## Budget Estimate

### Rates

| Role | Scope | Daily Rate (HK$) |
|------|-------|-------------------|
| IT Specialist | Infrastructure, frontend, API, database, RPA configuration, deployment | $500 / day |
| AI Specialist | LLM integration, classification engine, AI assistant, prompt engineering, data masking | $2,000 / day |

### Project Budget by Phase

| Phase | Scope | IT Days | AI Days | Cost (HK$) |
|-------|-------|---------|---------|-------------|
| **Phase 1** — Foundation | Monorepo setup, shared types and utilities, React dashboard (login, status cards, bot control, transaction table, bank filtering), Express API server, SQLite database schema, audit event logging | 8 | — | $4,000 |
| **Phase 2a** — Service Layers | Layer 1: Power Automate Desktop flow design, Playwright session attachment via CDP, BNU bank extractor with pagination, staging writer. Layer 2: Claude API LLM classifier, document processor (date/amount/currency normalisation), validation rules engine, warehouse client. Layer 3: ExcelJS multi-sheet report generator (transactions, GL summary, anomaly review), webhook handler. Pipeline API routes | 6 | 6 | $15,000 |
| **Phase 2b** — AI Assistant & Warehouse Export | Layer 4: FinPilot AI Assistant with Gemini API integration, Action Executor (classify, transform, analyse, query, export), real-time chat UI component. Layer 5: Multi-connector export engine (PostgreSQL, JSON, CSV), Export Manager with simultaneous multi-target writes, upsert support. API routes for assistant and warehouse export | 3 | 5 | $11,500 |
| **Phase 3** — Sensitive Data Options | PII masking layer (account numbers, beneficiary names, balances), Ollama local LLM connector, hybrid classification engine (local + masked remote fallback), confidence threshold routing, configuration and testing | 1 | 4 | $8,500 |
| **Phase 4** — Client Deployment | Install Power Automate Desktop on client machines, configure Chrome CDP, set up staging/reports/exports directories, deploy FinPipeline server, configure environment variables, database setup. Configure Power Automate login/authentication flows per bank portal, verify BNU CSS selectors during live client session, configure client's Chart of Accounts in classification prompt, end-to-end pipeline test with real bank data, resolve extraction edge cases | 7 | 4 | $11,500 |
| **Phase 5** — Documentation, Training & Handover | Project documentation (proposal, installation guide, environment configuration), train finance team on dashboard usage and FinPilot AI Assistant, Excel report review workflow, transaction approval/flagging process, operational handover | 3 | 1 | $3,500 |

### Project Delivery Total

| | IT Days (@ $500) | AI Days (@ $2,000) | Total Days | Cost (HK$) |
|---|-------------------|---------------------|------------|-------------|
| **Project Delivery Total** | **28** | **20** | **48** | **$54,000** |

### Software Licenses (Monthly Recurring)

| Item | Provider | Cost | Notes |
|------|----------|------|-------|
| Power Automate Desktop (Free) | Microsoft | $0 | Included with Windows 11, attended desktop flows only |
| Power Automate Premium | Microsoft | ~HK$120 / user / month | Required for cloud triggers, unattended runs, AI Builder |
| Power Automate Process | Microsoft | ~HK$1,170 / bot / month | Unattended bots, no user assignment needed |
| Ollama (Local LLM) | Open source | $0 | Free, runs on client hardware |
| Node.js, React, Express, SQLite | Open source | $0 | Free, no license fees |

For FinPipeline's human-in-the-loop model, the **free tier** is sufficient. Premium is only needed if the client requires scheduled or unattended runs.

### AI API Token Costs (Monthly Recurring)

Token costs depend on transaction volume and which AI engines are used.

**Layer 2 — Classification (Claude Sonnet 4.6: US$3 / MTok input, US$15 / MTok output)**

Each batch of 20 transactions uses approximately 2,500 input tokens and 2,000 output tokens.

| Monthly Volume | Batches | Input Tokens | Output Tokens | Est. Cost (HK$) |
|----------------|---------|-------------|---------------|-----------------|
| 2,000 transactions | 100 | 250K | 200K | ~HK$30 |
| 5,000 transactions | 250 | 625K | 500K | ~HK$75 |
| 10,000 transactions | 500 | 1.25M | 1M | ~HK$150 |

> Using the Claude Batch API (50% discount) halves these costs. Using Claude Haiku 4.5 (US$1 / US$5 per MTok) reduces costs by a further 60%.

**Layer 4 — FinPilot AI Assistant (Gemini 2.5 Flash: US$0.30 / MTok input, US$2.50 / MTok output)**

Each chat interaction uses approximately 1,500 input tokens and 800 output tokens.

| Monthly Usage | Interactions | Est. Cost (HK$) |
|---------------|-------------|-----------------|
| Light | 100 | ~HK$3 |
| Moderate | 300 | ~HK$8 |
| Heavy | 500 | ~HK$12 |

**Local LLM Option — If client chooses Ollama (Phase 3), API token costs are HK$0.**

### Cloud Hosting Option (Azure)

The FinPipeline server (Layers 2–5) can be deployed to **Microsoft Azure** instead of running on a local machine. This provides high availability, automatic backups, and remote access for the finance team. The client's Windows machine still runs Power Automate Desktop (Layer 1) locally and uploads staging data to the cloud server.

**Recommended Azure Configuration (East Asia / Hong Kong region):**

| Azure Service | Tier | Spec | Est. Monthly (HK$) |
|---------------|------|------|---------------------|
| **App Service** (Linux) | B1 | 1 core, 1.75GB RAM | ~$100 |
| **PostgreSQL Flexible Server** | Burstable B1ms | 1 vCore, 2GB RAM, 32GB storage | ~$230 |
| **Blob Storage** | Standard | Reports, exports, staging files | ~$5 |
| | | **Monthly Total** | **~$335** |
| | | **Annual Total** | **~$4,020** |

For higher workloads, upgrade to App Service B2 (2 cores, 3.5GB RAM, ~HK$200/month) and PostgreSQL B2s (2 vCores, ~HK$460/month).

> Cloud hosting is optional. The application runs equally well on a local server or office PC using SQLite, with no Azure dependency.

### Estimated Annual Running Costs

| Scenario | Power Automate | Claude API | Gemini API | Cloud Hosting | Annual Total (HK$) |
|----------|---------------|------------|------------|---------------|---------------------|
| **Small — Local** (2,000 tx/month, free PA) | $0 | ~$360 | ~$36 | $0 | ~**$400** |
| **Medium — Local** (5,000 tx/month, free PA) | $0 | ~$900 | ~$96 | $0 | ~**$1,000** |
| **Medium — Azure Cloud** (5,000 tx/month) | $0 | ~$900 | ~$96 | ~$4,020 | ~**$5,016** |
| **Medium — Azure + Premium PA** (5,000 tx/month) | $1,440 | ~$900 | ~$96 | ~$4,020 | ~**$6,456** |
| **Large — Azure + Premium PA** (10,000 tx/month) | $1,440 | ~$1,800 | ~$144 | ~$4,020 | ~**$7,404** |
| **Local LLM — Local server** (any volume) | $0 | $0 | $0 | $0 | **$0** |

### Annual Maintenance & Support Contract

After project delivery, ongoing maintenance ensures the system remains operational, up-to-date, and responsive to changing requirements. Day-to-day maintenance is handled by an IT Specialist, with AI Specialist involvement on a quarterly basis for model tuning and accuracy review.

| Item | Scope | Frequency | Days / Year | Rate (HK$) | Annual Cost (HK$) |
|------|-------|-----------|-------------|------------|-------------------|
| **IT Maintenance** | Server monitoring, database backups, security patches, dependency updates, bug fixes, Power Automate flow adjustments, user support | ~2 days / month | 24 | $500 | $12,000 |
| **AI Specialist Review** | Classification accuracy review, prompt tuning, model upgrades (e.g., new Claude/Gemini versions), GL mapping updates, FinPilot behaviour refinement, new bank onboarding support | ~1 day / quarter | 4 | $2,000 | $8,000 |
| | **Annual Maintenance Total** | | **28** | | **$20,000** |

### Total Project Cost Summary

| Category | Local Server (HK$) | Azure Cloud (HK$) |
|----------|--------------------|--------------------|
| **Project delivery (Phase 1–5)** | $54,000 | $54,000 |
| **Year 1 running costs — API tokens & licenses** | ~$1,000 | ~$1,000 |
| **Year 1 cloud hosting (Azure)** | $0 | ~$4,020 |
| **Year 1 maintenance & support** | $20,000 | $20,000 |
| **Year 1 total** | **~$75,000** | **~$79,020** |

> If the client opts for a fully local LLM deployment (Phase 3), annual API token costs are **HK$0**. Cloud hosting is optional — the application runs on a local server or office PC with no Azure dependency.

### Optional Enhancement Phase

The following items are not included in the base budget. They can be scoped and quoted individually based on client requirements.

| Enhancement | IT Days | AI Days | Est. Cost (HK$) |
|-------------|---------|---------|-----------------|
| Power BI real-time dashboard | 3 | 2 | $5,500 |
| Additional bank extractors (HSBC HK, BPI, ICBC) | 2 | 1 | $3,000 / bank |
| PDF statement processing via Document AI | 1 | 4 | $8,500 |
| SharePoint / OneDrive automated report delivery | 3 | — | $1,500 |
| Multi-currency support and FX rate integration | 2 | 2 | $5,000 |
| BigQuery / Dataverse warehouse connectors | 3 | — | $1,500 / connector |
| FinPilot voice interface | — | 5 | $10,000 |
| FinPilot integration with Microsoft Teams / Slack | 2 | 2 | $5,000 |
| Scheduled automated audit reports | 1 | 2 | $4,500 |
| Production monitoring dashboard for ops team | 4 | — | $2,000 |

### Notes

- IT Specialist rate: HK$500/day — covers infrastructure, frontend, API, database, deployment, and RPA configuration
- AI Specialist rate: HK$2,000/day — covers LLM integration, prompt engineering, classification engine, AI assistant development, and data masking logic
- Phase 4 (Client Deployment) requires access to the client's bank portal during a live session — scheduling is dependent on client availability
- Sensitive data options (Phase 3) are implemented once and apply to all current and future bank integrations
- Annual maintenance contract covers ongoing IT support with quarterly AI specialist reviews
- Enhancement phase items can be added to the project scope at any time

---

## Contact

**AIbyML.com**
Intelligent Automation for Financial Services

---

*This document is confidential and intended for the recipient only.*
