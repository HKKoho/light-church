# SecureFin Pipeline

An AI-powered financial data pipeline that extracts, classifies, and reports on banking transactions. Built by AIbyML.com.

---

## What It Does

1. **Extract** bank transaction data via RPA (browser automation)
2. **Classify** transactions using AI (categories, GL codes, cost centers)
3. **Report** clean data in Excel spreadsheets
4. **Verify** data integrity with FinPilot AI Assistant (chat-based)
5. **Export** verified data to your data warehouse (PostgreSQL, JSON, CSV)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A Gemini API key (optional, for AI features)

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/HKKoho/AIRPA_Financial_Machine.git
cd AIRPA_Financial_Machine
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment file:

```bash
cp .env.example .env
```

4. Edit `.env` and add your API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

> The app works without an API key — it will use a built-in local classifier instead.

---

## Start the Application

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Usage

1. Open http://localhost:3000 in your browser
2. Log in with any credentials (demo mode)
3. You will see the dashboard with:
   - **Status Cards** — rows processed, success rate, pending reviews
   - **Bot Control** — trigger extraction bots
   - **Data Ingestion** — paste raw transaction text to test AI classification
   - **Transaction Table** — view, approve, or flag transactions
   - **FinPilot** (bottom-right chat bubble) — AI assistant for data verification

### Try the AI Classification

Paste one or more lines into the "Simulate Data Ingestion" box:

```
ACH WTHDRWL AMAZON WEB SVCS - $500
UBER TRIP 2834 - $24.50
PAYROLL DEPOSIT - $3,500
UNK VENDOR 9923 - $5000.00
```

Click **Ingest & Classify** to see AI-powered categorisation.

### Try FinPilot AI Assistant

Click the **FinPilot** button (bottom-right) and try:

- "Summarise transactions by category"
- "Show flagged items"
- "Scan for anomalies"
- "Export all to CSV"

---

## Project Structure

```
AIRPA_Financial_Machine/
├── src/                    ← Frontend (React + Tailwind)
├── server.ts               ← API server (Express)
├── shared/                 ← Shared types and utilities
├── layer1-rpa/             ← Bank data extraction (Playwright)
├── layer2-ai/              ← AI classification engine (Claude/Gemini)
├── layer3-client/          ← Excel report generation
├── layer4-ai-assistant/    ← FinPilot AI assistant engine
├── layer5-warehouse/       ← Data warehouse export connectors
├── reference/              ← Architecture reference docs
├── PROPOSAL.md             ← Full project proposal
└── .env.example            ← Environment variables template
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Gemini API key for AI classification and FinPilot |
| `ANTHROPIC_API_KEY` | Optional | Claude API key for Layer 2 classification |
| `CDP_PORT` | Optional | Chrome remote debugging port (default: 9222) |
| `STAGING_DIR` | Optional | Directory for raw extracted data (default: ./staging) |
| `REPORTS_DIR` | Optional | Directory for Excel reports (default: ./reports) |
| `EXPORT_CSV_ENABLED` | Optional | Enable CSV export (default: false) |
| `WAREHOUSE_POSTGRES_URL` | Optional | PostgreSQL connection string for warehouse export |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run dev:layer1` | Run Layer 1 RPA extraction standalone |
| `npm run dev:layer2` | Run Layer 2 AI classification standalone |
| `npm run dev:layer3` | Run Layer 3 reporting service standalone |

---

## License

Proprietary. Built by AIbyML.com for enterprise banking clients.
