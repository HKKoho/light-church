import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import {
  ClassifiedTransaction,
  ExcelReportRow,
  PipelineLogger,
} from "@finpipeline/shared";

const OUTPUT_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), "reports");

export class ExcelWriter {
  private logger: PipelineLogger;

  constructor(logger: PipelineLogger) {
    this.logger = logger;
  }

  async writeReport(
    transactions: ClassifiedTransaction[],
    bankId: string,
    runId: string
  ): Promise<string> {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const filename = `Financial_Report_${bankId}_${yearMonth}.xlsx`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FinPipeline";
    workbook.created = now;

    // Sheet 1: All Transactions
    await this.writeTransactionsSheet(workbook, transactions);

    // Sheet 2: GL Summary
    await this.writeGLSummarySheet(workbook, transactions);

    // Sheet 3: Flagged Items (anomaly review)
    const flagged = transactions.filter((tx) => tx.requires_human_review);
    if (flagged.length > 0) {
      await this.writeFlaggedSheet(workbook, flagged);
    }

    await workbook.xlsx.writeFile(filepath);

    this.logger.info("EXCEL_WRITTEN", `Report written: ${filename}`, {
      filepath,
      totalRows: transactions.length,
      flaggedRows: flagged.length,
    });

    return filepath;
  }

  private async writeTransactionsSheet(
    workbook: ExcelJS.Workbook,
    transactions: ClassifiedTransaction[]
  ) {
    const sheet = workbook.addWorksheet("Transactions");

    // Header styling
    sheet.columns = [
      { header: "Date", key: "Date", width: 14 },
      { header: "Description", key: "Description", width: 40 },
      { header: "Debit", key: "Debit", width: 14 },
      { header: "Credit", key: "Credit", width: 14 },
      { header: "Balance", key: "Balance", width: 14 },
      { header: "Currency", key: "Currency", width: 10 },
      { header: "Category", key: "Category", width: 20 },
      { header: "GL Code", key: "GL Code", width: 10 },
      { header: "Cost Center", key: "Cost Center", width: 16 },
      { header: "Reference", key: "Reference", width: 16 },
      { header: "Status", key: "Status", width: 14 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    headerRow.alignment = { horizontal: "center" };

    // Add data rows
    for (const tx of transactions) {
      const row: ExcelReportRow = {
        Date: tx.transaction_date
          ? this.formatDate(tx.transaction_date)
          : "",
        Description: tx.description,
        Debit: tx.debit_amount,
        Credit: tx.credit_amount,
        Balance: tx.balance,
        Currency: tx.currency,
        Category: tx.category,
        "GL Code": tx.gl_code,
        "Cost Center": tx.cost_center,
        Reference: tx.reference_number || "",
        Status: tx.requires_human_review ? "Needs Review" : "OK",
      };

      const dataRow = sheet.addRow(row);

      // Highlight flagged rows
      if (tx.requires_human_review) {
        dataRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF3CD" },
        };
      }
    }

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: transactions.length + 1, column: 11 },
    };
  }

  private async writeGLSummarySheet(
    workbook: ExcelJS.Workbook,
    transactions: ClassifiedTransaction[]
  ) {
    const sheet = workbook.addWorksheet("GL Summary");

    sheet.columns = [
      { header: "GL Code", key: "glCode", width: 12 },
      { header: "Category", key: "category", width: 25 },
      { header: "Total Debit", key: "totalDebit", width: 16 },
      { header: "Total Credit", key: "totalCredit", width: 16 },
      { header: "Transaction Count", key: "count", width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };

    // Group by GL code
    const glGroups = new Map<string, {
      category: string;
      totalDebit: number;
      totalCredit: number;
      count: number;
    }>();

    for (const tx of transactions) {
      const existing = glGroups.get(tx.gl_code) || {
        category: tx.category,
        totalDebit: 0,
        totalCredit: 0,
        count: 0,
      };
      existing.totalDebit += tx.debit_amount || 0;
      existing.totalCredit += tx.credit_amount || 0;
      existing.count++;
      glGroups.set(tx.gl_code, existing);
    }

    for (const [glCode, data] of glGroups) {
      sheet.addRow({
        glCode,
        category: data.category,
        totalDebit: data.totalDebit,
        totalCredit: data.totalCredit,
        count: data.count,
      });
    }
  }

  private async writeFlaggedSheet(
    workbook: ExcelJS.Workbook,
    flagged: ClassifiedTransaction[]
  ) {
    const sheet = workbook.addWorksheet("Anomaly Review");

    sheet.columns = [
      { header: "Transaction ID", key: "id", width: 20 },
      { header: "Date", key: "date", width: 14 },
      { header: "Description", key: "description", width: 40 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Confidence", key: "confidence", width: 12 },
      { header: "Flags", key: "flags", width: 30 },
      { header: "Status", key: "status", width: 12 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC2626" },
    };

    for (const tx of flagged) {
      sheet.addRow({
        id: tx.transaction_id.slice(0, 8),
        date: tx.transaction_date ? this.formatDate(tx.transaction_date) : "",
        description: tx.description,
        amount: tx.debit_amount || tx.credit_amount || 0,
        confidence: `${(tx.classification_confidence * 100).toFixed(0)}%`,
        flags: tx.validation_flags.join(", "),
        status: tx.validation_status,
      });
    }
  }

  private formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
}
