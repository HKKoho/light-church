import fs from "fs";
import path from "path";
import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";
import { BaseWarehouseConnector, ExportResult, WarehouseConnectorConfig } from "./base.connector";

export class JsonFileConnector extends BaseWarehouseConnector {
  private outputDir: string;

  constructor(config: WarehouseConnectorConfig, logger: PipelineLogger) {
    super(config, logger);
    this.outputDir = config.outputDir || path.join(process.cwd(), "exports", "json");
  }

  async connect(): Promise<void> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.logger.info("WAREHOUSE_CONNECT", `JSON file export directory: ${this.outputDir}`);
  }

  async export(transactions: ClassifiedTransaction[]): Promise<ExportResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `warehouse_export_${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);

    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        record_count: transactions.length,
        transactions: transactions.map((tx) => ({
          ...tx,
          transaction_date: tx.transaction_date?.toISOString() || null,
        })),
      };

      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), "utf-8");

      this.logger.info("WAREHOUSE_EXPORT", `Exported ${transactions.length} records to ${filename}`);

      return {
        success: true,
        target: `JSON File: ${this.config.name}`,
        recordCount: transactions.length,
        exportPath: filepath,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        target: `JSON File: ${this.config.name}`,
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
