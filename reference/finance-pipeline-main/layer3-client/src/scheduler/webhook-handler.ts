import { Router, Request, Response } from "express";
import { PipelineLogger } from "@finpipeline/shared";
import { ExcelWriter } from "../excel/excel-writer";
import { WarehouseClient } from "../../../layer2-ai/src/warehouse/db.client";

export function createWebhookRouter(): Router {
  const router = Router();

  router.post("/webhook/layer3", async (req: Request, res: Response) => {
    const { run_id, bank_id, records_classified } = req.body;
    const logger = new PipelineLogger(run_id, 3);

    logger.info("LAYER3_TRIGGERED", `Report generation triggered for run ${run_id}`, {
      bank_id,
      records_classified,
    });

    try {
      const warehouse = new WarehouseClient(logger);
      const transactions = warehouse.getClassifiedTransactions(run_id);

      if (transactions.length === 0) {
        warehouse.close();
        res.status(404).json({ error: "No classified transactions found for this run" });
        return;
      }

      const excelWriter = new ExcelWriter(logger);
      const filepath = await excelWriter.writeReport(transactions, bank_id, run_id);

      // Update pipeline run with Excel path
      const run = warehouse.getPipelineRun(run_id);
      if (run) {
        warehouse.upsertPipelineRun({
          ...run,
          layer3_status: "COMPLETE",
          layer3_excel_path: filepath,
          completed_at: new Date().toISOString(),
        });
      }

      warehouse.close();

      logger.info("LAYER3_COMPLETE", `Report generated: ${filepath}`);
      res.json({
        success: true,
        filepath,
        records: transactions.length,
      });
    } catch (error) {
      logger.error("LAYER3_FAILED", `Report generation failed: ${(error as Error).message}`);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
