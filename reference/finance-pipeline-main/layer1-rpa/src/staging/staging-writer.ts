import fs from "fs";
import path from "path";
import { RawTransaction, PipelineLogger } from "@finpipeline/shared";

// Filenames sort lexicographically == chronologically (ISO timestamp, ":"
// and "." replaced so it's filesystem-safe), which is what
// listStagingFiles() relies on to pick the latest file for a bank.
const STAGING_DIR = process.env.STAGING_DIR || path.join(process.cwd(), "staging");

interface StagingFile {
  bank_id: string;
  run_id: string;
  staged_at: string;
  record_count: number;
  transactions: RawTransaction[];
}

export class StagingWriter {
  private logger: PipelineLogger;

  constructor(logger: PipelineLogger) {
    this.logger = logger;
  }

  async write(bankId: string, runId: string, transactions: RawTransaction[]): Promise<string> {
    if (!fs.existsSync(STAGING_DIR)) {
      fs.mkdirSync(STAGING_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${bankId}_${runId}_${timestamp}.json`;
    const filepath = path.join(STAGING_DIR, filename);

    const payload: StagingFile = {
      bank_id: bankId,
      run_id: runId,
      staged_at: new Date().toISOString(),
      record_count: transactions.length,
      transactions,
    };

    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");

    this.logger.info("STAGING_WRITTEN", `Staged ${transactions.length} record(s) to ${filename}`, {
      filepath,
      recordCount: transactions.length,
    });

    return filepath;
  }

  static readStagingFile(filepath: string): RawTransaction[] {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Staging file not found: ${filepath}`);
    }

    const payload: StagingFile = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    return payload.transactions;
  }

  static listStagingFiles(bankId: string): string[] {
    if (!fs.existsSync(STAGING_DIR)) {
      return [];
    }

    return fs
      .readdirSync(STAGING_DIR)
      .filter((f) => f.startsWith(`${bankId}_`) && f.endsWith(".json"))
      .sort()
      .map((f) => path.join(STAGING_DIR, f));
  }
}
