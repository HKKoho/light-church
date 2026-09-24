import { v4 as uuidv4 } from "uuid";
import { PipelineLogger, ExtractionError } from "@finpipeline/shared";
import { getBankConfig } from "../config/banks.config";
import { attachToSession, verifyAuthenticated } from "./session/session-attach";
import { BNUExtractor } from "./extractors/bnu.extractor";
import { BaseExtractor } from "./extractors/base.extractor";
import { StagingWriter } from "./staging/staging-writer";

interface ExtractionArgs {
  bank: string;
  from: string;
  to: string;
  runId?: string;
  webhookUrl?: string;
}

function parseArgs(): ExtractionArgs {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    parsed[key] = args[i + 1];
  }

  if (!parsed.bank || !parsed.from || !parsed.to) {
    console.error("Usage: layer1-rpa --bank BNU --from 2026-01-01 --to 2026-03-31 [--run-id UUID] [--webhook-url URL]");
    process.exit(1);
  }

  return {
    bank: parsed.bank,
    from: parsed.from,
    to: parsed.to,
    runId: parsed["run-id"],
    webhookUrl: parsed["webhook-url"],
  };
}

function getExtractor(bankId: string, page: any, config: any, runId: string): BaseExtractor {
  switch (bankId) {
    case "BNU":
      return new BNUExtractor(page, config, runId);
    default:
      throw new ExtractionError(`No extractor available for bank: ${bankId}`, bankId, runId);
  }
}

async function main() {
  const args = parseArgs();
  const runId = args.runId || uuidv4();
  const logger = new PipelineLogger(runId, 1);

  logger.info("EXTRACTION_START", `Starting extraction for ${args.bank}`, {
    bank: args.bank,
    dateRange: { from: args.from, to: args.to },
  });

  try {
    const config = getBankConfig(args.bank);
    const session = await attachToSession();

    const isAuthenticated = await verifyAuthenticated(session.page);
    if (!isAuthenticated) {
      throw new ExtractionError(
        "Page appears to be a login screen. Client must complete authentication first.",
        args.bank,
        runId
      );
    }

    const extractor = getExtractor(args.bank, session.page, config, runId);
    const transactions = await extractor.extract(args.from, args.to);

    const stagingWriter = new StagingWriter(logger);
    const filepath = await stagingWriter.write(args.bank, runId, transactions);

    logger.info("EXTRACTION_COMPLETE", `Extraction complete: ${transactions.length} records`, {
      filepath,
      recordCount: transactions.length,
    });

    if (args.webhookUrl) {
      await fetch(args.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          bank_id: args.bank,
          staging_file: filepath,
          record_count: transactions.length,
          layer: 1,
          status: "COMPLETE",
        }),
      });
      logger.info("WEBHOOK_SENT", `Layer 2 webhook triggered at ${args.webhookUrl}`);
    }

    await session.detach();
  } catch (error) {
    logger.error("EXTRACTION_FAILED", `Extraction failed: ${(error as Error).message}`, {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

main();
