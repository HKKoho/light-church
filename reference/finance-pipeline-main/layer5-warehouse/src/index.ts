import { ClassifiedTransaction, PipelineLogger } from "@finpipeline/shared";
import { ExportManager, loadExportConfigs } from "./export/export-manager";
import { ExportResult, WarehouseConnectorConfig } from "./connectors/base.connector";

export { ExportManager, loadExportConfigs } from "./export/export-manager";
export { BaseWarehouseConnector, ExportResult, WarehouseConnectorConfig } from "./connectors/base.connector";
export { PostgresConnector } from "./connectors/postgres.connector";
export { JsonFileConnector } from "./connectors/json.connector";
export { CsvFileConnector } from "./connectors/csv.connector";

export async function exportToWarehouse(
  transactions: ClassifiedTransaction[],
  runId: string,
  configs?: WarehouseConnectorConfig[]
): Promise<ExportResult[]> {
  const logger = new PipelineLogger(runId, 2);
  const manager = new ExportManager(logger);

  const exportConfigs = configs || loadExportConfigs();
  for (const config of exportConfigs) {
    manager.addConnector(config);
  }

  return manager.exportAll(transactions);
}
