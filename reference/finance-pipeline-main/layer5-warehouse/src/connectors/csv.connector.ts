import fs from "fs";
import path from "path";
import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";
import { BaseWarehouseConnector, ExportResult, WarehouseConnectorConfig } from "./base.connector";

export class CsvFileConnector extends BaseWarehouseConnector {
  private outputDir: string;

  constructor(config: WarehouseConnectorConfig, logger: PipelineLogger) {
    super(config, logger);
    this.outputDir = config.outputDir || path.join(process.cwd(), "exports", "csv");
  }

  async connect(): Promise<void> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.logger.info("WAREHOUSE_CONNECT", `CSV file export directory: ${this.outputDir}`);
  }

  async export(transactions: ClassifiedTransaction[]): Promise<ExportResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `warehouse_export_${timestamp}.csv`;
    const filepath = path.join(this.outputDir, filename);

    try {
      const headers = [
        "transaction_id", "pipeline_run_id", "source_bank", "transaction_date",
        "description", "debit_amount", "credit_amount", "balance", "currency",
        "reference_number", "category", "sub_category", "gl_code", "cost_center",
        "classification_confidence", "classification_model", "classified_at",
        "validation_status", "validation_flags", "requires_human_review",
      ];

      const rows = transactions.map((tx) =>
        [
          tx.transaction_id, tx.pipeline_run_id, tx.source_bank,
          tx.transaction_date?.toISOString()?.split("T")[0] || "",
          `"${(tx.description || "").replace(/"/g, '""')}"`,
          tx.debit_amount ?? "", tx.credit_amount ?? "", tx.balance ?? "",
          tx.currency, tx.reference_number || "",
          tx.category, tx.sub_category, tx.gl_code, tx.cost_center,
          tx.classification_confidence, tx.classification_model,
          tx.classified_at, tx.validation_status,
          `"${tx.validation_flags.join("; ")}"`,
          tx.requires_human_review ? "YES" : "NO",
        ].join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      fs.writeFileSync(filepath, csv, "utf-8");

      this.logger.info("WAREHOUSE_EXPORT", `Exported ${transactions.length} records to ${filename}`);

      return {
        success: true,
        target: `CSV File: ${this.config.name}`,
        recordCount: transactions.length,
        exportPath: filepath,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        target: `CSV File: ${this.config.name}`,
        recordCount: 0,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async disconnect(): Promise<void> {
    // No-op for file connector
  }
}
