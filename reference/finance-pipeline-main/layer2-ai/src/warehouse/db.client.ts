import { ClassifiedTransaction, PipelineRun, PipelineLogger, WarehouseError } from "@finpipeline/shared";

// Uses better-sqlite3 for local development, matches the existing server.ts approach
// In production, swap for pg (PostgreSQL) or Azure SQL client
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "finance.db");

export class WarehouseClient {
  private db: ReturnType<typeof Database>;
  private logger: PipelineLogger;

  constructor(logger: PipelineLogger) {
    this.logger = logger;
    this.db = new Database(DB_PATH);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
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
  }

  insertClassifiedTransaction(tx: ClassifiedTransaction): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO classified_transactions (
          transaction_id, pipeline_run_id, source_bank, transaction_date,
          description, debit_amount, credit_amount, balance, currency,
          reference_number, category, sub_category, gl_code, cost_center,
          classification_confidence, classification_model, classified_at,
          validation_status, validation_flags, requires_human_review,
          reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tx.transaction_id, tx.pipeline_run_id, tx.source_bank,
        tx.transaction_date?.toISOString() || null,
        tx.description, tx.debit_amount, tx.credit_amount, tx.balance,
        tx.currency, tx.reference_number, tx.category, tx.sub_category,
        tx.gl_code, tx.cost_center, tx.classification_confidence,
        tx.classification_model, tx.classified_at, tx.validation_status,
        JSON.stringify(tx.validation_flags), tx.requires_human_review ? 1 : 0,
        tx.reviewed_by, tx.reviewed_at, tx.created_at, tx.updated_at
      );
    } catch (error) {
      throw new WarehouseError(
        `Failed to insert transaction ${tx.transaction_id}`,
        "INSERT",
        error
      );
    }
  }

  insertBatch(transactions: ClassifiedTransaction[]): number {
    const insert = this.db.transaction((txs: ClassifiedTransaction[]) => {
      for (const tx of txs) {
        this.insertClassifiedTransaction(tx);
      }
      return txs.length;
    });

    const count = insert(transactions);
    this.logger.info("WAREHOUSE_WRITE", `Inserted ${count} classified transactions`);
    return count;
  }

  upsertPipelineRun(run: PipelineRun): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO pipeline_runs (
        run_id, bank_id, triggered_by, triggered_at,
        layer1_status, layer1_records_extracted,
        layer2_status, layer2_records_classified, layer2_records_flagged,
        layer3_status, layer3_excel_path, completed_at, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.run_id, run.bank_id, run.triggered_by, run.triggered_at,
      run.layer1_status, run.layer1_records_extracted,
      run.layer2_status, run.layer2_records_classified, run.layer2_records_flagged,
      run.layer3_status, run.layer3_excel_path, run.completed_at,
      JSON.stringify(run.errors)
    );
  }

  getPipelineRun(runId: string): PipelineRun | null {
    const row = this.db.prepare("SELECT * FROM pipeline_runs WHERE run_id = ?").get(runId) as any;
    if (!row) return null;
    return { ...row, errors: JSON.parse(row.errors || "[]") };
  }

  getClassifiedTransactions(runId: string): ClassifiedTransaction[] {
    const rows = this.db.prepare(
      "SELECT * FROM classified_transactions WHERE pipeline_run_id = ? ORDER BY transaction_date"
    ).all(runId) as any[];

    return rows.map((r) => ({
      ...r,
      transaction_date: r.transaction_date ? new Date(r.transaction_date) : null,
      validation_flags: JSON.parse(r.validation_flags || "[]"),
      requires_human_review: !!r.requires_human_review,
    }));
  }

  close(): void {
    this.db.close();
  }
}
