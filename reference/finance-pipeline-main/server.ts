import express from "express";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(process.env.DB_PATH || "finance.db");
const AI_ASSISTANT_URL = process.env.AI_ASSISTANT_URL || "http://localhost:4001";

// ─── Initialize Database ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    last_run TEXT,
    rows_processed INTEGER
  );

  CREATE TABLE IF NOT EXISTS classified_transactions (
    transaction_id TEXT PRIMARY KEY,
    pipeline_run_id TEXT NOT NULL,
    source_bank TEXT NOT NULL,
    transaction_date TEXT,
    description TEXT,
    debit_amount REAL,
    credit_amount REAL,
    balance REAL,
    currency TEXT,
    reference_number TEXT,
    category TEXT,
    sub_category TEXT,
    gl_code TEXT,
    cost_center TEXT,
    classification_confidence REAL,
    classification_model TEXT,
    classified_at TEXT,
    validation_status TEXT,
    validation_flags TEXT,
    requires_human_review INTEGER,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL,
    triggered_by TEXT,
    triggered_at TEXT,
    layer1_status TEXT DEFAULT 'PENDING',
    layer1_records_extracted INTEGER DEFAULT 0,
    layer2_status TEXT DEFAULT 'PENDING',
    layer2_records_classified INTEGER DEFAULT 0,
    layer2_records_flagged INTEGER DEFAULT 0,
    layer3_status TEXT DEFAULT 'PENDING',
    layer3_excel_path TEXT,
    completed_at TEXT,
    errors TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    event_id TEXT PRIMARY KEY,
    run_id TEXT,
    layer INTEGER,
    event_type TEXT,
    message TEXT,
    metadata TEXT,
    timestamp TEXT
  );
`);

// ─── Seed initial data if empty ──────────────────────────────────────────────
const botCount = db.prepare("SELECT COUNT(*) as count FROM bots").get() as { count: number };
if (botCount.count === 0) {
  const insertBot = db.prepare("INSERT INTO bots (id, name, status, last_run, rows_processed) VALUES (?, ?, ?, ?, ?)");
  insertBot.run("bot-1", "PAD_Bank_Scraper_v1", "idle", "2024-03-04 09:00 AM", 142);
  insertBot.run("bot-2", "Cloud_Orchestrator_v2", "success", "2024-03-04 09:05 AM", 142);
}

// `transactions` is legacy — the real pipeline (Layer 1/PDF -> 2 -> 3) has
// always written to `classified_transactions` instead, which is why the
// dashboard, AI assistant, and warehouse export (all originally reading
// `transactions`) never showed real pipeline output. Seed data now goes into
// the same table everything else reads from.
const txCount = db.prepare("SELECT COUNT(*) as count FROM classified_transactions").get() as { count: number };
if (txCount.count === 0) {
  const now = new Date().toISOString();
  const insertTx = db.prepare(`
    INSERT INTO classified_transactions (
      transaction_id, pipeline_run_id, source_bank, transaction_date, description,
      debit_amount, credit_amount, balance, currency, reference_number,
      category, sub_category, gl_code, cost_center,
      classification_confidence, classification_model, classified_at,
      validation_status, validation_flags, requires_human_review,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedRun = "seed-demo-data";
  insertTx.run("tx-1", seedRun, "Chase Business", "2024-03-01", "UBER TRIP 2834", 24.50, null, null, "USD", null, "Travel", "Rideshare", "6300", "SALES", 0.99, "seed", now, "PASSED", "[]", 0, null, null, now, now);
  insertTx.run("tx-2", seedRun, "Wells Fargo", "2024-03-02", "AMZN Mktp US", 129.99, null, null, "USD", null, "Office Supplies", "General", "5100", "ADMIN", 0.95, "seed", now, "PASSED", "[]", 0, null, null, now, now);
  insertTx.run("tx-3", seedRun, "Bank of America", "2024-03-03", "UNK VENDOR 9923", 5000.00, null, null, "USD", null, "Uncategorized", "Unclassified", "9100", "UNKNOWN", 0.45, "seed", now, "FLAGGED", '["LOW_CONFIDENCE"]', 1, null, null, now, now);
}

const app = express();
app.use(express.json());

const statementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — statements, not attachments
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  },
});

const PORT = 3000;

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING FRONTEND API ROUTES (kept as-is)
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/bots", (_req, res) => {
  const bots = db.prepare("SELECT * FROM bots").all();
  res.json(bots);
});

app.post("/api/bots/:id/run", (req, res) => {
  const { id } = req.params;
  const now = new Date().toLocaleString();
  const rows = Math.floor(Math.random() * 200) + 50;

  db.prepare("UPDATE bots SET status = 'success', last_run = ?, rows_processed = rows_processed + ? WHERE id = ?")
    .run(now, rows, id);

  res.json({ success: true, lastRun: now, rowsProcessed: rows });
});

// Maps a classified_transactions row onto the flat shape the dashboard's
// Transaction type expects (see src/types.ts). Status comes from
// validation_status, not requires_human_review alone — /api/pipeline/review
// clears requires_human_review on BOTH approve and reject, so that flag by
// itself can't distinguish "approved" from "reviewed and rejected".
function toFrontendTransaction(r: any) {
  return {
    id: r.transaction_id,
    bank: r.source_bank,
    rawText: r.description,
    date: r.transaction_date,
    amount: r.debit_amount ?? r.credit_amount ?? 0,
    vendor: r.description,
    category: r.category,
    confidence: r.classification_confidence,
    status: r.validation_status === "PASSED" ? "approved" : "flagged",
  };
}

app.get("/api/transactions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM classified_transactions ORDER BY classified_at DESC").all();
  res.json(rows.map(toFrontendTransaction));
});

// "Simulate Data Ingestion" — the frontend already classifies the pasted
// text client-side (Gemini) before POSTing here; this just persists it into
// the same table the real pipeline uses, under a shared synthetic run so
// manually-entered rows are identifiable as such.
app.post("/api/transactions", (req, res) => {
  const { id, bank, raw_text, date, amount, vendor, category, confidence } = req.body;
  const now = new Date().toISOString();
  const requiresReview = confidence <= 0.8;

  db.prepare(`
    INSERT INTO classified_transactions (
      transaction_id, pipeline_run_id, source_bank, transaction_date, description,
      debit_amount, credit_amount, balance, currency, reference_number,
      category, sub_category, gl_code, cost_center,
      classification_confidence, classification_model, classified_at,
      validation_status, validation_flags, requires_human_review,
      reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, "manual-entry", bank, date, raw_text || vendor,
    amount, null, null, "USD", null,
    category, "Manual Entry", "9999", "MANUAL",
    confidence, "gemini-2.0-flash (client-side simulation)", now,
    requiresReview ? "FLAGGED" : "PASSED", requiresReview ? '["LOW_CONFIDENCE"]' : "[]", requiresReview ? 1 : 0,
    null, null, now, now
  );
  res.json({ success: true });
});

app.get("/api/stats", (_req, res) => {
  const totalRows = db.prepare("SELECT SUM(rows_processed) as total FROM bots").get() as { total: number };
  const lastRun = db.prepare("SELECT MAX(last_run) as last FROM bots").get() as { last: string };
  const approvedCount = db.prepare("SELECT COUNT(*) as count FROM classified_transactions WHERE requires_human_review = 0").get() as { count: number };
  const totalTx = db.prepare("SELECT COUNT(*) as count FROM classified_transactions").get() as { count: number };

  res.json({
    totalRows: totalRows.total || 0,
    lastRun: lastRun.last || "Never",
    successRate: totalTx.count > 0 ? (approvedCount.count / totalTx.count) * 100 : 100
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE API ROUTES (Layer 1-2-3 integration)
// ═══════════════════════════════════════════════════════════════════════════════

// --- Pipeline Runs ---
app.get("/api/pipeline/runs", (_req, res) => {
  const runs = db.prepare("SELECT * FROM pipeline_runs ORDER BY triggered_at DESC").all();
  res.json(runs.map((r: any) => ({ ...r, errors: JSON.parse(r.errors || "[]") })));
});

app.get("/api/pipeline/runs/:runId", (req, res) => {
  const run = db.prepare("SELECT * FROM pipeline_runs WHERE run_id = ?").get(req.params.runId) as any;
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json({ ...run, errors: JSON.parse(run.errors || "[]") });
});

// --- Classified Transactions ---
app.get("/api/pipeline/transactions", (_req, res) => {
  const txs = db.prepare(
    "SELECT * FROM classified_transactions ORDER BY classified_at DESC LIMIT 200"
  ).all();
  res.json(txs.map((r: any) => ({
    ...r,
    validation_flags: JSON.parse(r.validation_flags || "[]"),
    requires_human_review: !!r.requires_human_review,
  })));
});

app.get("/api/pipeline/transactions/:runId", (req, res) => {
  const txs = db.prepare(
    "SELECT * FROM classified_transactions WHERE pipeline_run_id = ? ORDER BY transaction_date"
  ).all(req.params.runId);
  res.json(txs.map((r: any) => ({
    ...r,
    validation_flags: JSON.parse(r.validation_flags || "[]"),
    requires_human_review: !!r.requires_human_review,
  })));
});

// --- Review Queue ---
app.get("/api/pipeline/review-queue", (_req, res) => {
  const flagged = db.prepare(
    "SELECT * FROM classified_transactions WHERE requires_human_review = 1 AND reviewed_by IS NULL ORDER BY classified_at DESC"
  ).all();
  res.json(flagged.map((r: any) => ({
    ...r,
    validation_flags: JSON.parse(r.validation_flags || "[]"),
    requires_human_review: true,
  })));
});

app.post("/api/pipeline/review/:transactionId", (req, res) => {
  const { transactionId } = req.params;
  const { action, reviewer } = req.body;
  const now = new Date().toISOString();

  const newStatus = action === "approve" ? "PASSED" : "REJECTED";
  db.prepare(
    "UPDATE classified_transactions SET validation_status = ?, reviewed_by = ?, reviewed_at = ?, requires_human_review = 0, updated_at = ? WHERE transaction_id = ?"
  ).run(newStatus, reviewer || "admin", now, now, transactionId);

  res.json({ success: true, status: newStatus });
});

// --- Audit Events ---
app.get("/api/pipeline/audit", (_req, res) => {
  const events = db.prepare("SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 100").all();
  res.json(events.map((e: any) => ({ ...e, metadata: JSON.parse(e.metadata || "{}") })));
});

// --- Pipeline Stats ---
app.get("/api/pipeline/stats", (_req, res) => {
  const totalRuns = db.prepare("SELECT COUNT(*) as count FROM pipeline_runs").get() as { count: number };
  const completedRuns = db.prepare("SELECT COUNT(*) as count FROM pipeline_runs WHERE layer2_status = 'COMPLETE'").get() as { count: number };
  const totalClassified = db.prepare("SELECT COUNT(*) as count FROM classified_transactions").get() as { count: number };
  const totalFlagged = db.prepare("SELECT COUNT(*) as count FROM classified_transactions WHERE requires_human_review = 1").get() as { count: number };
  const pendingReview = db.prepare("SELECT COUNT(*) as count FROM classified_transactions WHERE requires_human_review = 1 AND reviewed_by IS NULL").get() as { count: number };

  res.json({
    totalRuns: totalRuns.count,
    completedRuns: completedRuns.count,
    totalClassified: totalClassified.count,
    totalFlagged: totalFlagged.count,
    pendingReview: pendingReview.count,
  });
});

// --- Layer 1 fallback: PDF statement ingestion (no live bank-portal session) ---
// Parses a digitally-generated PDF statement into RawTransaction[], stages
// it, then runs it straight through Layer 2 classification (same as a
// webhook would) so the result is immediately visible in the review queue.
// Shared by the staff-triggered upload endpoint below AND the midnight
// inbox sweep (see scheduleInboxSweep) — same code path either way.
interface IngestResult {
  runId: string;
  recordsExtracted: number;
  recordsClassified: number;
  recordsFlagged: number;
  recordsRejected: number;
}

async function ingestStatementPDF(buffer: Buffer, filename: string, bank: string): Promise<IngestResult> {
  const runId = uuidv4();

  const { getBankConfig } = await import("./layer1-rpa/config/banks.config");
  const { PDFStatementExtractor } = await import("./layer1-rpa/src/extractors/pdf-statement.extractor");
  const { StagingWriter } = await import("./layer1-rpa/src/staging/staging-writer");
  const { PipelineLogger } = await import("@finpipeline/shared");
  const { processRawTransactions } = await import("./layer2-ai/src/index");

  const config = getBankConfig(bank);
  const logger = new PipelineLogger(runId, 1);

  const extractor = new PDFStatementExtractor(config, runId);
  const rawTransactions = await extractor.extract(buffer, filename);

  if (rawTransactions.length === 0) {
    throw new Error(
      "No transaction lines matched this bank's statement format. Check the PDF has a text layer (not a scanned image) and matches the configured layout."
    );
  }

  const stagingWriter = new StagingWriter(logger);
  const stagingFile = await stagingWriter.write(bank, runId, rawTransactions);

  logger.info("PDF_STATEMENT_UPLOADED", `Extracted ${rawTransactions.length} record(s) from ${filename}`, {
    stagingFile,
    filename,
  });

  // processRawTransactions returns every validated row, including REJECTED
  // ones — but it only writes PASSED/FLAGGED rows to classified_transactions
  // (see layer2-ai/src/index.ts). "classified" here means "landed in the
  // database", so rejects must be excluded from that count, not just from
  // the flagged count.
  const validated = await processRawTransactions(rawTransactions, runId, bank, logger);
  const rejected = validated.filter((tx) => tx.validation_status === "REJECTED").length;
  const flagged = validated.filter((tx) => tx.validation_status === "FLAGGED").length;
  const classified = validated.length - rejected;

  db.prepare(
    "INSERT INTO audit_events (event_id, run_id, layer, event_type, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    uuidv4(), runId, 1, "PDF_STATEMENT_UPLOADED",
    `Ingested ${filename} for ${bank}: ${rawTransactions.length} extracted, ${classified} classified, ${rejected} rejected`,
    JSON.stringify({ filename, extracted: rawTransactions.length, classified, flagged, rejected }),
    new Date().toISOString()
  );

  return { runId, recordsExtracted: rawTransactions.length, recordsClassified: classified, recordsFlagged: flagged, recordsRejected: rejected };
}

app.post("/api/pipeline/upload-statement", statementUpload.single("file"), async (req, res) => {
  const { bank } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "PDF file is required (field name: file)" });
  }
  if (!bank) {
    return res.status(400).json({ error: "bank is required" });
  }

  try {
    const result = await ingestStatementPDF(file.buffer, file.originalname, bank);
    res.json({ success: true, bank, ...result });
  } catch (error) {
    console.error("PDF statement upload error:", error);
    res.status((error as Error).message.startsWith("No transaction lines") ? 422 : 500).json({ error: (error as Error).message });
  }
});

// --- Layer 3 Webhook: Generate Excel Report ---
app.post("/api/pipeline/webhook/layer3", async (req, res) => {
  const { run_id, bank_id } = req.body;

  try {
    const txs = db.prepare(
      "SELECT * FROM classified_transactions WHERE pipeline_run_id = ? ORDER BY transaction_date"
    ).all(run_id) as any[];

    if (txs.length === 0) {
      return res.status(404).json({ error: "No classified transactions found" });
    }

    // Dynamic import to avoid loading exceljs at startup
    const { ExcelWriter } = await import("./layer3-client/src/excel/excel-writer");
    const { PipelineLogger } = await import("./shared/utils/logger");

    const logger = new PipelineLogger(run_id, 3);
    const writer = new ExcelWriter(logger);

    const transactions = txs.map((r: any) => ({
      ...r,
      transaction_date: r.transaction_date ? new Date(r.transaction_date) : null,
      validation_flags: JSON.parse(r.validation_flags || "[]"),
      requires_human_review: !!r.requires_human_review,
    }));

    const filepath = await writer.writeReport(transactions, bank_id, run_id);

    // Update pipeline run
    db.prepare(
      "UPDATE pipeline_runs SET layer3_status = 'COMPLETE', layer3_excel_path = ?, completed_at = ? WHERE run_id = ?"
    ).run(filepath, new Date().toISOString(), run_id);

    res.json({ success: true, filepath, records: transactions.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Download Excel Report ---
app.get("/api/pipeline/reports/:runId/download", (req, res) => {
  const run = db.prepare("SELECT layer3_excel_path FROM pipeline_runs WHERE run_id = ?").get(req.params.runId) as any;
  if (!run?.layer3_excel_path) return res.status(404).json({ error: "No report available" });

  const filepath = run.layer3_excel_path;
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Report file not found" });

  res.download(filepath);
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 5: WAREHOUSE EXPORT API
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/warehouse/targets", (_req, res) => {
  const targets = [
    { type: "json", name: "Local JSON Backup", enabled: true, status: "ready" },
    { type: "csv", name: "CSV Export", enabled: process.env.EXPORT_CSV_ENABLED === "true", status: "ready" },
    { type: "postgres", name: "Primary Data Warehouse", enabled: !!process.env.WAREHOUSE_POSTGRES_URL, status: process.env.WAREHOUSE_POSTGRES_URL ? "configured" : "not_configured" },
  ];
  res.json(targets);
});

app.post("/api/warehouse/export", async (req, res) => {
  const { format, filters } = req.body;

  try {
    // Get transactions to export
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.bank) { conditions.push("source_bank LIKE ?"); values.push(`%${filters.bank}%`); }
    if (filters?.status) { conditions.push("validation_status = ?"); values.push(String(filters.status).toUpperCase()); }
    if (filters?.category) { conditions.push("category LIKE ?"); values.push(`%${filters.category}%`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const transactions = db.prepare(`SELECT * FROM classified_transactions ${where} ORDER BY transaction_date DESC`).all(...values) as any[];

    if (transactions.length === 0) {
      return res.status(404).json({ error: "No transactions to export" });
    }

    const exportDir = path.join(process.cwd(), "exports", format || "json");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `warehouse_export_${timestamp}.${format || "json"}`;
    const filepath = path.join(exportDir, filename);

    if (format === "csv") {
      const headers = Object.keys(transactions[0]).join(",");
      const rows = transactions.map((tx: any) =>
        Object.values(tx).map((v: any) => typeof v === "string" && v.includes(",") ? `"${v}"` : v).join(",")
      );
      fs.writeFileSync(filepath, [headers, ...rows].join("\n"), "utf-8");
    } else {
      fs.writeFileSync(filepath, JSON.stringify({ exported_at: new Date().toISOString(), record_count: transactions.length, transactions }, null, 2), "utf-8");
    }

    // Log export event
    db.prepare(
      "INSERT INTO audit_events (event_id, run_id, layer, event_type, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(uuidv4(), "warehouse-export", 5, "WAREHOUSE_EXPORT", `Exported ${transactions.length} records as ${format || "json"}`, JSON.stringify({ filepath, format, count: transactions.length }), new Date().toISOString());

    res.json({ success: true, filepath, format: format || "json", count: transactions.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/warehouse/export/download/:filename", (req, res) => {
  const { filename } = req.params;
  const jsonPath = path.join(process.cwd(), "exports", "json", filename);
  const csvPath = path.join(process.cwd(), "exports", "csv", filename);

  const filepath = fs.existsSync(jsonPath) ? jsonPath : fs.existsSync(csvPath) ? csvPath : null;
  if (!filepath) return res.status(404).json({ error: "Export file not found" });

  res.download(filepath);
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: AI ASSISTANT API
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/assistant/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // The AI assistant runs as its own container (its own process, its own
    // scaling/restart lifecycle) — this route is a thin proxy to it.
    const upstream = await fetch(`${AI_ASSISTANT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const body = await upstream.json();
    res.status(upstream.status).json(body);
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({
      message: "I encountered an error processing your request. Please try again.",
      action: null,
      actionResult: null,
      suggestions: ["Try a simpler query", "Show all transactions", "Summarise by category"],
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 fallback, autonomous: midnight inbox sweep
// ═══════════════════════════════════════════════════════════════════════════════
// Drop a statement PDF into INBOX_DIR named "<BANK_ID>__anything.pdf" (bank_id
// must match a bank with a pdf_statement config in banks.config.ts) and it
// gets ingested automatically at the next midnight, no staff action needed —
// the complement to the staff-triggered /api/pipeline/upload-statement above.
// Runs inside this process for as long as `app` is up (restart: unless-stopped
// in docker-compose.yml), independent of whether anyone is watching it.

const INBOX_DIR = process.env.INBOX_DIR || path.join(process.cwd(), "inbox");
const INBOX_PROCESSED_DIR = path.join(INBOX_DIR, "processed");
// Created at startup, not lazily on first sweep — staff should be able to
// drop a file in immediately after deploy, without needing a sweep to have
// run at least once first.
fs.mkdirSync(INBOX_PROCESSED_DIR, { recursive: true });

async function sweepInbox(): Promise<{ processed: number; failed: number }> {
  const files = fs.readdirSync(INBOX_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  let processed = 0;
  let failed = 0;

  for (const filename of files) {
    const bankMatch = filename.match(/^([A-Z0-9_]+)__/);
    const filepath = path.join(INBOX_DIR, filename);

    if (!bankMatch) {
      console.warn(`[InboxSweep] Skipping ${filename}: name it "<BANK_ID>__anything.pdf" so the bank is identifiable`);
      continue;
    }
    const bank = bankMatch[1];

    try {
      const buffer = fs.readFileSync(filepath);
      const result = await ingestStatementPDF(buffer, filename, bank);
      console.log(`[InboxSweep] Processed ${filename}: run ${result.runId}, ${result.recordsClassified} classified, ${result.recordsFlagged} flagged, ${result.recordsRejected} rejected`);
      fs.renameSync(filepath, path.join(INBOX_PROCESSED_DIR, filename));
      processed++;
    } catch (error) {
      console.error(`[InboxSweep] Failed to process ${filename}:`, (error as Error).message);
      db.prepare(
        "INSERT INTO audit_events (event_id, run_id, layer, event_type, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        uuidv4(), "inbox-sweep", 1, "INBOX_SWEEP_FAILED",
        `Failed to process ${filename}: ${(error as Error).message}`,
        JSON.stringify({ filename }), new Date().toISOString()
      );
      failed++;
    }
  }

  return { processed, failed };
}

function scheduleMidnightSweep() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const delayMs = nextMidnight.getTime() - now.getTime();

  console.log(`[InboxSweep] Next autonomous sweep at ${nextMidnight.toISOString()} (in ${Math.round(delayMs / 60000)} min)`);

  setTimeout(async () => {
    const { processed, failed } = await sweepInbox();
    console.log(`[InboxSweep] Midnight sweep complete: ${processed} processed, ${failed} failed`);
    setInterval(async () => {
      const result = await sweepInbox();
      console.log(`[InboxSweep] Midnight sweep complete: ${result.processed} processed, ${result.failed} failed`);
    }, 24 * 60 * 60 * 1000);
  }, delayMs);
}

// Manual trigger — lets staff (or a demo) run the sweep on demand instead of
// waiting for midnight, without duplicating the ingestion logic.
app.post("/api/pipeline/inbox/sweep", async (_req, res) => {
  try {
    const result = await sweepInbox();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VITE / STATIC SERVING
// ═══════════════════════════════════════════════════════════════════════════════

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Pipeline API available at http://localhost:${PORT}/api/pipeline/`);
  });

  scheduleMidnightSweep();
}

startServer();
