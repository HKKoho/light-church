import { v4 as uuidv4 } from "uuid";
import {
  RawTransaction,
  ClassifiedTransaction,
  ClassificationResult,
  ClassificationRequest,
  PipelineLogger,
  ClassificationError,
} from "@finpipeline/shared";
import { DocProcessor } from "./extractors/doc-processor";
import { LLMClassifier } from "./classifiers/llm.classifier";
import { RulesEngine } from "./validators/rules.engine";
import { WarehouseClient } from "./warehouse/db.client";
import { StagingWriter } from "../../layer1-rpa/src/staging/staging-writer";

const MODEL = process.env.CLASSIFICATION_MODEL || "claude-sonnet-4-6";

interface Layer2Args {
  stagingFile?: string;
  runId: string;
  bankId: string;
  webhookUrl?: string;
}

function parseArgs(): Layer2Args {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    parsed[key] = args[i + 1];
  }

  return {
    stagingFile: parsed["staging-file"],
    runId: parsed["run-id"] || uuidv4(),
    bankId: parsed["bank"] || "UNKNOWN",
    webhookUrl: parsed["webhook-url"],
  };
}

export async function processRawTransactions(
  rawTransactions: RawTransaction[],
  runId: string,
  bankId: string,
  logger: PipelineLogger
): Promise<ClassifiedTransaction[]> {
  const processor = new DocProcessor(logger);
  const classifier = new LLMClassifier();
  const rulesEngine = new RulesEngine(logger);
  const warehouse = new WarehouseClient(logger);

  try {
    // Step 1: Normalize raw transactions
    const classificationRequests = processor.normalizeTransactions(rawTransactions);

    // Step 2: Classify via LLM
    logger.info("CLASSIFICATION_START", `Classifying ${classificationRequests.length} transactions`);
    const classificationResults = await classifier.classifyBatch(classificationRequests);

    // Step 3: Merge results into ClassifiedTransaction objects
    const now = new Date().toISOString();
    const classified: ClassifiedTransaction[] = classificationRequests.map((req, idx) => {
      const result = classificationResults[idx] || {
        category: "Other Expense",
        sub_category: "Unclassified",
        gl_code: "9100",
        cost_center: "UNKNOWN",
        confidence: 0,
        reasoning: "No result returned",
        flag: "CLASSIFICATION_FAILED",
      };

      const rawTx = rawTransactions[idx];

      return {
        transaction_id: uuidv4(),
        pipeline_run_id: runId,
        source_bank: bankId,
        transaction_date: new Date(req.date),
        description: req.description,
        debit_amount: req.direction === "DEBIT" ? req.amount : null,
        credit_amount: req.direction === "CREDIT" ? req.amount : null,
        balance: rawTx.raw_balance ? parseFloat(rawTx.raw_balance.replace(/[^0-9.-]/g, "")) || null : null,
        currency: "MOP",
        reference_number: rawTx.raw_reference,
        category: result.category,
        sub_category: result.sub_category,
        gl_code: result.gl_code,
        cost_center: result.cost_center,
        classification_confidence: result.confidence,
        classification_model: MODEL,
        classified_at: now,
        validation_status: "PASSED" as const,
        validation_flags: [],
        requires_human_review: false,
        reviewed_by: null,
        reviewed_at: null,
        created_at: now,
        updated_at: now,
      };
    });

    // Step 4: Validate
    logger.info("VALIDATION_START", `Validating ${classified.length} transactions`);
    const validated = rulesEngine.validateBatch(classified);

    // Step 5: Write to warehouse
    const passedOrFlagged = validated.filter((tx) => tx.validation_status !== "REJECTED");
    warehouse.insertBatch(passedOrFlagged);

    // Update pipeline run
    const flaggedCount = validated.filter((tx) => tx.validation_status === "FLAGGED").length;
    warehouse.upsertPipelineRun({
      run_id: runId,
      bank_id: bankId,
      triggered_by: "system",
      triggered_at: now,
      layer1_status: "COMPLETE",
      layer1_records_extracted: rawTransactions.length,
      layer2_status: "COMPLETE",
      layer2_records_classified: passedOrFlagged.length,
      layer2_records_flagged: flaggedCount,
      layer3_status: "PENDING",
      layer3_excel_path: null,
      completed_at: null,
      errors: [],
    });

    logger.info("LAYER2_COMPLETE", `Layer 2 complete: ${passedOrFlagged.length} classified, ${flaggedCount} flagged`);

    warehouse.close();
    return validated;
  } catch (error) {
    warehouse.close();
    throw error;
  }
}

async function main() {
  const args = parseArgs();
  const logger = new PipelineLogger(args.runId, 2);

  logger.info("LAYER2_START", `Starting Layer 2 processing`, { args });

  try {
    let rawTransactions: RawTransaction[];

    if (args.stagingFile) {
      rawTransactions = StagingWriter.readStagingFile(args.stagingFile);
    } else {
      // Read from latest staging file for this bank
      const files = StagingWriter.listStagingFiles(args.bankId);
      if (files.length === 0) {
        throw new Error(`No staging files found for bank: ${args.bankId}`);
      }
      const latestFile = files[files.length - 1];
      rawTransactions = StagingWriter.readStagingFile(latestFile);
      logger.info("STAGING_READ", `Read ${rawTransactions.length} records from ${latestFile}`);
    }

    const validated = await processRawTransactions(rawTransactions, args.runId, args.bankId, logger);

    if (args.webhookUrl) {
      await fetch(args.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: args.runId,
          bank_id: args.bankId,
          records_classified: validated.length,
          records_flagged: validated.filter((tx) => tx.validation_status === "FLAGGED").length,
          layer: 2,
          status: "COMPLETE",
        }),
      });
      logger.info("WEBHOOK_SENT", `Layer 3 webhook triggered`);
    }
  } catch (error) {
    logger.error("LAYER2_FAILED", `Layer 2 failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Only run main if executed directly (not imported)
if (process.argv[1]?.includes("layer2-ai")) {
  main();
}
