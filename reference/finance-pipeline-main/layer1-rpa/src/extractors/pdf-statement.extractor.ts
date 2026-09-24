import { v4 as uuidv4 } from "uuid";
import { RawTransaction, BankConfig } from "@finpipeline/shared";

// Fallback for banks with no live-portal session to attach to: parses a
// digitally-generated (text-layer) PDF statement instead of scraping a
// browser tab. Outputs the exact same RawTransaction[] shape as
// BaseExtractor, so everything downstream (StagingWriter, Layer 2+) is
// unaware of which extraction path produced the data.
//
// Scanned/image-only PDFs (no text layer) are out of scope here — pdf-parse
// only reads embedded text, it doesn't do image OCR.
export class PDFStatementExtractor {
  private config: BankConfig;
  private pipeline_run_id: string;

  constructor(config: BankConfig, pipeline_run_id: string) {
    if (!config.pdf_statement) {
      throw new Error(
        `Bank ${config.bank_id} has no pdf_statement parsing config — add one in banks.config.ts`
      );
    }
    this.config = config;
    this.pipeline_run_id = pipeline_run_id;
  }

  async extract(pdfBuffer: Buffer, sourceFileName: string): Promise<RawTransaction[]> {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer });
    let text: string;
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }

    const pattern = new RegExp(this.config.pdf_statement!.line_pattern);
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const transactions: RawTransaction[] = [];

    for (const line of lines) {
      const match = line.match(pattern);
      if (!match || !match.groups) continue;

      const { date, description, amount, balance } = match.groups;
      const amountNum = parseFloat(amount.replace(/,/g, ""));
      if (isNaN(amountNum)) continue;

      const isDebit = amountNum < 0;

      transactions.push({
        extraction_id: uuidv4(),
        pipeline_run_id: this.pipeline_run_id,
        source_bank: this.config.bank_id,
        extracted_at: new Date().toISOString(),
        raw_date: date,
        raw_description: description.trim(),
        raw_debit: isDebit ? Math.abs(amountNum).toFixed(2) : null,
        raw_credit: !isDebit ? amountNum.toFixed(2) : null,
        raw_balance: balance ? balance.replace(/,/g, "") : null,
        raw_reference: null,
        source_page: 1,
        source_file: sourceFileName,
      });
    }

    return transactions;
  }
}
