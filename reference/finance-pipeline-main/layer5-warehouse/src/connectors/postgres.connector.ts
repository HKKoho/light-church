import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";
import { BaseWarehouseConnector, ExportResult, WarehouseConnectorConfig } from "./base.connector";

export class PostgresConnector extends BaseWarehouseConnector {
  private client: any = null;

  constructor(config: WarehouseConnectorConfig, logger: PipelineLogger) {
    super(config, logger);
  }

  async connect(): Promise<void> {
    if (!this.config.connectionString) {
      throw new Error("PostgreSQL connection string is required");
    }

    try {
      const pg = await import("pg");
      this.client = new pg.default.Client({ connectionString: this.config.connectionString });
      await this.client.connect();

      // Ensure target table exists
      const tableName = this.config.tableName || "classified_transactions";
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          transaction_id TEXT PRIMARY KEY,
          pipeline_run_id TEXT NOT NULL,
          source_bank TEXT NOT NULL,
          transaction_date TIMESTAMP,
          description TEXT,
          debit_amount NUMERIC,
          credit_amount NUMERIC,
          balance NUMERIC,
          currency TEXT,
          reference_number TEXT,
          category TEXT,
          sub_category TEXT,
          gl_code TEXT,
          cost_center TEXT,
          classification_confidence NUMERIC,
          classification_model TEXT,
          classified_at TIMESTAMP,
          validation_status TEXT,
          validation_flags JSONB,
          requires_human_review BOOLEAN,
          reviewed_by TEXT,
          reviewed_at TIMESTAMP,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          exported_at TIMESTAMP DEFAULT NOW()
        )
      `);

      this.logger.info("WAREHOUSE_CONNECT", `Connected to PostgreSQL: ${this.config.name}`);
    } catch (error) {
      this.logger.error("WAREHOUSE_CONNECT_FAILED", `PostgreSQL connection failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async export(transactions: ClassifiedTransaction[]): Promise<ExportResult> {
    if (!this.client) throw new Error("Not connected. Call connect() first.");

    const tableName = this.config.tableName || "classified_transactions";
    const batchSize = this.config.batchSize || 100;
    let exported = 0;

    try {
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);

        for (const tx of batch) {
          await this.client.query(
            `INSERT INTO ${tableName} (
              transaction_id, pipeline_run_id, source_bank, transaction_date,
              description, debit_amount, credit_amount, balance, currency,
              reference_number, category, sub_category, gl_code, cost_center,
              classification_confidence, classification_model, classified_at,
              validation_status, validation_flags, requires_human_review,
              reviewed_by, reviewed_at, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            ON CONFLICT (transaction_id) DO UPDATE SET
              category = EXCLUDED.category, sub_category = EXCLUDED.sub_category,
              gl_code = EXCLUDED.gl_code, cost_center = EXCLUDED.cost_center,
              validation_status = EXCLUDED.validation_status, updated_at = EXCLUDED.updated_at`,
            [
              tx.transaction_id, tx.pipeline_run_id, tx.source_bank,
              tx.transaction_date?.toISOString() || null,
              tx.description, tx.debit_amount, tx.credit_amount, tx.balance,
              tx.currency, tx.reference_number, tx.category, tx.sub_category,
              tx.gl_code, tx.cost_center, tx.classification_confidence,
              tx.classification_model, tx.classified_at, tx.validation_status,
              JSON.stringify(tx.validation_flags), tx.requires_human_review,
              tx.reviewed_by, tx.reviewed_at, tx.created_at, tx.updated_at,
            ]
          );
          exported++;
        }

        this.logger.info("WAREHOUSE_BATCH", `Exported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
      }

      return {
        success: true,
        target: `PostgreSQL: ${this.config.name}`,
        recordCount: exported,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        target: `PostgreSQL: ${this.config.name}`,
        recordCount: exported,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.logger.info("WAREHOUSE_DISCONNECT", `Disconnected from PostgreSQL: ${this.config.name}`);
    }
  }
}
