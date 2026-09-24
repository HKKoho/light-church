import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";
import { BaseWarehouseConnector, ExportResult, WarehouseConnectorConfig } from "../connectors/base.connector";
import { PostgresConnector } from "../connectors/postgres.connector";
import { JsonFileConnector } from "../connectors/json.connector";
import { CsvFileConnector } from "../connectors/csv.connector";

export class ExportManager {
  private connectors: BaseWarehouseConnector[] = [];
  private logger: PipelineLogger;

  constructor(logger: PipelineLogger) {
    this.logger = logger;
  }

  addConnector(config: WarehouseConnectorConfig): void {
    if (!config.enabled) {
      this.logger.info("EXPORT_SKIP", `Connector "${config.name}" is disabled, skipping`);
      return;
    }

    let connector: BaseWarehouseConnector;

    switch (config.type) {
      case "postgres":
        connector = new PostgresConnector(config, this.logger);
        break;
      case "json":
        connector = new JsonFileConnector(config, this.logger);
        break;
      case "csv":
        connector = new CsvFileConnector(config, this.logger);
        break;
      default:
        this.logger.warn("EXPORT_UNKNOWN", `Unknown connector type: ${config.type}`);
        return;
    }

    this.connectors.push(connector);
    this.logger.info("EXPORT_REGISTERED", `Registered connector: ${config.name} (${config.type})`);
  }

  async exportAll(transactions: ClassifiedTransaction[]): Promise<ExportResult[]> {
    if (this.connectors.length === 0) {
      this.logger.warn("EXPORT_NONE", "No export connectors configured");
      return [];
    }

    const results: ExportResult[] = [];

    for (const connector of this.connectors) {
      this.logger.info("EXPORT_START", `Exporting to ${connector.name} (${connector.type})`);

      try {
        await connector.connect();
        const result = await connector.export(transactions);
        results.push(result);

        if (result.success) {
          this.logger.info("EXPORT_SUCCESS", `Exported ${result.recordCount} records to ${connector.name}`);
        } else {
          this.logger.error("EXPORT_FAILED", `Export to ${connector.name} failed: ${result.error}`);
        }

        await connector.disconnect();
      } catch (error) {
        const result: ExportResult = {
          success: false,
          target: connector.name,
          recordCount: 0,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        };
        results.push(result);
        this.logger.error("EXPORT_ERROR", `Connector ${connector.name} threw: ${(error as Error).message}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    this.logger.info("EXPORT_COMPLETE", `Export complete: ${successCount}/${results.length} targets succeeded`);

    return results;
  }
}

// Default configuration loader
export function loadExportConfigs(): WarehouseConnectorConfig[] {
  const configs: WarehouseConnectorConfig[] = [];

  // JSON export — always enabled as local backup
  configs.push({
    type: "json",
    name: "Local JSON Backup",
    enabled: true,
    outputDir: process.env.EXPORT_JSON_DIR || "./exports/json",
  });

  // CSV export — enabled if configured
  if (process.env.EXPORT_CSV_ENABLED === "true") {
    configs.push({
      type: "csv",
      name: "CSV Export",
      enabled: true,
      outputDir: process.env.EXPORT_CSV_DIR || "./exports/csv",
    });
  }

  // PostgreSQL — enabled if connection string provided
  if (process.env.WAREHOUSE_POSTGRES_URL) {
    configs.push({
      type: "postgres",
      name: "Primary Data Warehouse",
      enabled: true,
      connectionString: process.env.WAREHOUSE_POSTGRES_URL,
      tableName: process.env.WAREHOUSE_TABLE || "classified_transactions",
      batchSize: parseInt(process.env.WAREHOUSE_BATCH_SIZE || "100"),
    });
  }

  return configs;
}
