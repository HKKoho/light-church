import express from "express";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { AIAssistant } from "./engine/assistant";
import { ActionExecutor } from "./actions/action-executor";

const app = express();
app.use(express.json());

const db = new Database(process.env.DB_PATH || "finance.db");
const PORT = Number(process.env.PORT) || 4001;

// Idempotent: the `app` service owns the full schema, but this service reads
// and writes these two tables directly, so it guards against starting before
// `app` has created them on a fresh volume.
db.exec(`
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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const transactions = db.prepare("SELECT * FROM classified_transactions ORDER BY transaction_date DESC LIMIT 20").all() as any[];
    const txCount = (db.prepare("SELECT COUNT(*) as count FROM classified_transactions").get() as any).count;
    const approvedCount = (db.prepare("SELECT COUNT(*) as count FROM classified_transactions WHERE requires_human_review = 0").get() as any).count;
    const flaggedCount = (db.prepare("SELECT COUNT(*) as count FROM classified_transactions WHERE requires_human_review = 1").get() as any).count;
    const totalAmount = (db.prepare("SELECT SUM(COALESCE(debit_amount, credit_amount, 0)) as total FROM classified_transactions").get() as any).total || 0;

    const stats = {
      totalTransactions: txCount,
      approved: approvedCount,
      flagged: flaggedCount,
      totalAmount,
      successRate: txCount > 0 ? (approvedCount / txCount) * 100 : 100,
    };

    const assistant = new AIAssistant();
    const response = await assistant.chat(message, {
      transactionCount: txCount,
      recentTransactions: transactions,
      stats,
    });

    let actionResult = null;
    if (response.action) {
      const executor = new ActionExecutor(db);
      actionResult = await executor.execute(response.action);
    }

    db.prepare(
      "INSERT INTO audit_events (event_id, run_id, layer, event_type, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      uuidv4(), "ai-assistant", 4, "ASSISTANT_CHAT",
      `User: ${message.substring(0, 100)}`,
      JSON.stringify({ action: response.action?.type || null, hasResult: !!actionResult }),
      new Date().toISOString()
    );

    res.json({
      message: actionResult
        ? `${response.message}\n\n${actionResult.message}`
        : response.message,
      action: response.action,
      actionResult,
      suggestions: response.suggestions,
    });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Assistant service running on http://localhost:${PORT}`);
});
