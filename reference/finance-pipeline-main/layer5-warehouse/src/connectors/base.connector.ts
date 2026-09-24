import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";

export type ExportFormat = "json" | "csv" | "sql";

export interface ExportResult {
  success: boolean;
  target: string;
  recordCount: number;
  exportPath?: string;
  error?: string;
  timestamp: string;
}

export interface WarehouseConnectorConfig {
  type: string;
  name: string;
  enabled: boolean;
  connectionString?: string;
  tableName?: string;
  outputDir?: string;
  format?: ExportFormat;
  batchSize?: number;
}

export abstract class BaseWarehouseConnector {
  protected config: WarehouseConnectorConfig;
  protected logger: PipelineLogger;

  constructor(config: WarehouseConnectorConfig, logger: PipelineLogger) {
    this.config = config;
    this.logger = logger;
  }

  abstract connect(): Promise<void>;
  abstract export(transactions: ClassifiedTransaction[]): Promise<ExportResult>;
  abstract disconnect(): Promise<void>;

  get name(): string {
    return this.config.name;
  }

  get type(): string {
    return this.config.type;
  }
}
