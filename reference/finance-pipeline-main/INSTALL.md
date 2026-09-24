# Installation Guide

FinPipeline runs across two environments: the **client's Windows machine** (for bank data extraction) and your **server** (for AI processing, reporting, verification, and warehouse export).

---

## Part A — Client Machine: Power Automate Desktop (Layer 1)

### Prerequisites

- **Windows 10 or 11** (Power Automate Desktop is Windows-only)
- **Microsoft account** (free) or Microsoft 365 license
- **Google Chrome** installed

### Step 1: Install Power Automate Desktop

**Windows 11** — Power Automate Desktop is pre-installed. Open it from the Start menu.

**Windows 10** — Download and install from:

```
https://go.microsoft.com/fwlink/?linkid=2102613
```

Sign in with a Microsoft account when prompted.

### Step 2: Install the Browser Extension

When you first create a flow with browser automation, Power Automate will prompt you to install the **Power Automate browser extension** for Chrome. Follow the prompt, or install it manually from the Chrome Web Store.

### Step 3: Configure Chrome for CDP

FinPipeline's Playwright extractor connects to Chrome via the Chrome DevTools Protocol (CDP). Create a Chrome shortcut or batch file that launches Chrome with CDP enabled:

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Alternatively, add this as the first step in your Power Automate Desktop flow.

### Step 4: Create the Power Automate Desktop Flow

Open Power Automate Desktop and create a new flow with the following steps:

| Step | Action | Details |
|------|--------|---------|
| 1 | **Run application** | Launch Chrome with `--remote-debugging-port=9222` |
| 2 | **Navigate to URL** | Bank portal URL (e.g., `https://www.bnu.com.mo`) |
| 3 | **Display message** | "Please log in and complete 2FA, then click OK" |
| 4 | **Wait for web element** | Wait for a page element that confirms login (e.g., account dashboard) |
| 5 | **Run command** | Trigger the Layer 1 extractor (see below) |
| 6 | **Display message** | "Extraction complete. Data staged for processing." |

The command in Step 5 triggers Layer 1 extraction:

```bat
npx tsx layer1-rpa/src/index.ts --bank=BNU
```

Or, if the FinPipeline server is remote, Power Automate can upload the staging files via API:

```bat
curl -X POST http://YOUR_SERVER:3000/api/pipeline/upload -F "file=@staging/BNU_latest.json"
```

### Step 5: Configure Bank-Specific Selectors

During a live client session, verify the CSS selectors in `layer1-rpa/config/banks.config.ts` match the actual bank portal DOM. Update selectors as needed per bank.

### Supported Banks

| Bank | Region | Status |
|------|--------|--------|
| Banco Nacional Ultramarino (BNU) | Macau | Configured with placeholder selectors |
| HSBC Hong Kong | Hong Kong | Template ready, selectors pending |

### License Options

| License | Cost | Features |
|---------|------|----------|
| **Free** (Windows 11) | $0 | Desktop flows, local execution, manual trigger |
| **Power Automate Premium** | ~$15/user/month | Cloud triggers, attended/unattended runs |
| **Power Automate Process** | ~$150/bot/month | Unattended bots, no user assignment needed |

For FinPipeline's human-in-the-loop login model, the **free tier or Premium** is sufficient.

---

## Part B — Server: FinPipeline Application (Layers 2–5)

The FinPipeline server handles AI classification, reporting, verification, and warehouse export.

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/HKKoho/AIRPA_Financial_Machine.git
cd AIRPA_Financial_Machine
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required for Layer 2 — AI classification
ANTHROPIC_API_KEY=your_anthropic_api_key
CLASSIFICATION_MODEL=claude-sonnet-4-6

# Required for Layer 4 — FinPilot AI Assistant
GEMINI_API_KEY=your_gemini_api_key

# Staging directory (where Layer 1 raw JSON is received)
STAGING_DIR=./staging

# Reports directory (Layer 3 Excel output)
REPORTS_DIR=./reports

# Database (SQLite for development)
DB_PATH=./finance.db

# Warehouse Export (Layer 5)
EXPORT_CSV_ENABLED=true
EXPORT_JSON_DIR=./exports/json
EXPORT_CSV_DIR=./exports/csv

# PostgreSQL (production warehouse — optional)
# WAREHOUSE_POSTGRES_URL=postgresql://user:pass@host:5432/finpipeline
WAREHOUSE_TABLE=classified_transactions
WAREHOUSE_BATCH_SIZE=100
```

> The app works without API keys — it will fall back to a built-in local classifier.

### Step 4: Start the Application

```bash
npm run dev
```

The dashboard will be available at **http://localhost:3000**.

### Step 5: Verify the Installation

1. Open http://localhost:3000 in your browser
2. Log in (demo mode accepts any credentials)
3. Test AI classification by pasting transaction text into "Simulate Data Ingestion"
4. Test FinPilot by clicking the chat bubble and typing "Show summary"

---

## Deployment Architecture

```
Client Windows PC                              FinPipeline Server
┌────────────────────────────┐                 ┌──────────────────────────┐
│  Power Automate Desktop    │                 │                          │
│  + Chrome (CDP port 9222)  │   raw JSON      │  Layer 2: AI Classify    │
│  + Layer 1 RPA Extractor   │ ──────────────> │  Layer 3: Excel Reports  │
│                            │  (upload/sync)  │  Layer 4: FinPilot AI    │
│  User logs in + 2FA       │                 │  Layer 5: Warehouse      │
└────────────────────────────┘                 └──────────────────────────┘
```

### Data Transfer: Client to Server

The raw staging JSON from Layer 1 needs to reach the server. Options:

| Method | How |
|--------|-----|
| **API upload** | Power Automate POSTs the JSON file to `/api/pipeline/upload` |
| **SharePoint / OneDrive** | Sync staging folder to a shared location the server monitors |
| **Manual upload** | Use the dashboard's Data Ingestion panel to paste or upload data |
| **Same machine** | If running locally, Layer 1 writes directly to `STAGING_DIR` |

---

## Sensitive Data Consideration

If the client is not comfortable sending financial transaction data to remote AI engines, FinPipeline supports alternative classification modes. These are configured via environment variables — no code changes required.

### Option A: PII Masking (Remote AI with Data Protection)

Mask sensitive fields before they reach the LLM. Account numbers, beneficiary names, and balances are redacted — the AI only sees transaction description patterns and amounts needed for classification.

Add to `.env`:

```env
MASK_PII_ENABLED=true
MASK_ACCOUNT_NUMBERS=true
MASK_BENEFICIARY_NAMES=true
MASK_BALANCES=true
```

### Option B: Local LLM via Ollama (No Data Leaves the Network)

Run an open-source model entirely on your infrastructure. Install Ollama and pull a model:

```bash
# Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model suitable for financial classification
ollama pull llama3.1:8b
```

Configure `.env` to use local LLM:

```env
CLASSIFICATION_ENGINE=local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

**Recommended models:**

| Model | Download Size | RAM Needed | Notes |
|-------|--------------|------------|-------|
| `llama3.1:8b` | ~5GB | 16GB+ | Best general-purpose option |
| `mistral:7b` | ~4GB | 16GB+ | Fast, good at structured output |
| `phi4:14b` | ~8GB | 24GB+ | Strong reasoning |
| `qwen2.5:14b` | ~9GB | 24GB+ | Excellent JSON compliance |

### Option C: Hybrid (Recommended for Production)

Use local LLM by default, fall back to masked remote AI when local confidence is low:

```env
CLASSIFICATION_ENGINE=hybrid
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
ANTHROPIC_API_KEY=your_key
MASK_PII_ENABLED=true
HYBRID_CONFIDENCE_THRESHOLD=0.80
```

### Which Option to Choose

| Concern | Choose | Trade-off |
|---------|--------|-----------|
| No data may leave the network | **Option B** (Local LLM) | ~85-90% accuracy, needs local hardware |
| Data can leave if anonymised | **Option A** (PII Masking) | ~95% accuracy, adds masking step |
| Best accuracy with privacy | **Option C** (Hybrid) | Best of both, more config |
| No data concerns | Default (Remote AI) | ~95% accuracy, simplest |

---

## Production Deployment

### Option 1: Local Server (Default)

Run FinPipeline on an office PC or local server:

- **Database** — SQLite (dev) or install PostgreSQL locally
- **Process manager** — Use PM2 or systemd to keep the server running
- **Cost** — No hosting fees; only API token costs apply

### Option 2: Azure Cloud Hosting

Deploy the FinPipeline server (Layers 2–5) to Microsoft Azure. The client's Windows machine still runs Power Automate Desktop (Layer 1) locally and uploads staging data to the cloud.

**Step 1: Create Azure resources**

```bash
# Create resource group
az group create --name finpipeline-rg --location eastasia

# Create App Service plan (Linux, B1 tier)
az appservice plan create --name finpipeline-plan --resource-group finpipeline-rg \
  --sku B1 --is-linux

# Create web app (Node.js 18)
az webapp create --name finpipeline-app --resource-group finpipeline-rg \
  --plan finpipeline-plan --runtime "NODE:18-lts"

# Create PostgreSQL flexible server
az postgres flexible-server create --name finpipeline-db \
  --resource-group finpipeline-rg --location eastasia \
  --sku-name Standard_B1ms --storage-size 32 \
  --admin-user finadmin --admin-password <your-password>

# Create the database
az postgres flexible-server db create --server-name finpipeline-db \
  --resource-group finpipeline-rg --database-name finpipeline
```

**Step 2: Configure environment variables**

```bash
az webapp config appsettings set --name finpipeline-app \
  --resource-group finpipeline-rg --settings \
  ANTHROPIC_API_KEY=your_key \
  GEMINI_API_KEY=your_key \
  WAREHOUSE_POSTGRES_URL="postgresql://finadmin:<password>@finpipeline-db.postgres.database.azure.com:5432/finpipeline" \
  CLASSIFICATION_MODEL=claude-sonnet-4-6
```

**Step 3: Deploy the application**

```bash
# From the project root
az webapp deployment source config-local-git --name finpipeline-app \
  --resource-group finpipeline-rg

# Add Azure as a git remote and push
git remote add azure <deployment-url-from-above>
git push azure main
```

**Estimated monthly cost (East Asia / Hong Kong region):**

| Azure Service | Tier | Est. Monthly (HK$) |
|---------------|------|---------------------|
| App Service (Linux) | B1 (1 core, 1.75GB) | ~$100 |
| PostgreSQL Flexible Server | B1ms (1 vCore, 2GB, 32GB) | ~$230 |
| Blob Storage | Standard | ~$5 |
| **Total** | | **~$335 / month** |

### General Production Considerations

- **HTTPS** — Azure App Service includes free TLS. For local server, use a reverse proxy (nginx, Caddy) with TLS
- **Authentication** — Replace demo login with corporate SSO / Azure AD
- **Backups** — Azure PostgreSQL includes automatic backups. For local, schedule database and export directory backups

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Power Automate can't connect to Chrome | Ensure Chrome is launched with `--remote-debugging-port=9222` and no other Chrome instances are running |
| CDP connection refused | Check that `CDP_PORT` in `.env` matches the Chrome launch flag |
| Bank selectors not working | CSS selectors are placeholders — update `banks.config.ts` during a live bank session |
| npm install fails | Ensure Node.js v18+ is installed: `node --version` |
| AI classification returns fallback results | Check that `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` is set in `.env` |
