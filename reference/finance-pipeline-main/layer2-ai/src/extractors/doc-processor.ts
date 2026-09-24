import { v4 as uuidv4 } from "uuid";
import {
  RawTransaction,
  ClassificationRequest,
  PipelineLogger,
} from "@finpipeline/shared";

export class DocProcessor {
  private logger: PipelineLogger;

  constructor(logger: PipelineLogger) {
    this.logger = logger;
  }

  normalizeTransactions(raw: RawTransaction[]): ClassificationRequest[] {
    this.logger.info("NORMALIZE_START", `Normalizing ${raw.length} raw transactions`);

    const requests: ClassificationRequest[] = [];

    for (const tx of raw) {
      const debit = this.parseAmount(tx.raw_debit);
      const credit = this.parseAmount(tx.raw_credit);
      const amount = debit || credit || 0;
      const direction = debit ? "DEBIT" : "CREDIT";
      const date = this.parseDate(tx.raw_date);

      requests.push({
        transaction_id: tx.extraction_id,
        description: tx.raw_description.trim(),
        amount,
        direction,
        bank: tx.source_bank,
        date,
      });
    }

    this.logger.info("NORMALIZE_COMPLETE", `Normalized ${requests.length} transactions`);
    return requests;
  }

  private parseAmount(raw: string | null): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private parseDate(raw: string): string {
    // Try DD/MM/YYYY
    const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try YYYY-MM-DD (already ISO)
    const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/);
    if (iso) return raw;

    // Try "DD MMM YYYY" (e.g. "15 Mar 2026")
    const dmmmy = raw.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
    if (dmmmy) {
      const [, day, monthStr, year] = dmmmy;
      const months: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
      };
      const month = months[monthStr] || "01";
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }

    // Fallback: return as-is
    return raw;
  }
}
