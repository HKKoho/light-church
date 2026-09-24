// layer1-rpa/src/extractors/base.extractor.ts
// All bank-specific extractors extend this base class

import { Page } from "playwright";
import { v4 as uuidv4 } from "uuid";
import { RawTransaction } from "../../../shared/types/transaction.types";
import { BankConfig } from "../../../shared/types/pipeline.types";

export abstract class BaseExtractor {
  protected page: Page;
  protected config: BankConfig;
  protected pipeline_run_id: string;

  constructor(page: Page, config: BankConfig, pipeline_run_id: string) {
    this.page = page;
    this.config = config;
    this.pipeline_run_id = pipeline_run_id;
  }

  abstract extract(dateFrom: string, dateTo: string): Promise<RawTransaction[]>;

  protected buildRawTransaction(
    raw_date: string,
    raw_description: string,
    raw_debit: string | null,
    raw_credit: string | null,
    raw_balance: string | null,
    raw_reference: string | null,
    source_page: number = 1
  ): RawTransaction {
    return {
      extraction_id: uuidv4(),
      pipeline_run_id: this.pipeline_run_id,
      source_bank: this.config.bank_id,
      extracted_at: new Date().toISOString(),
      raw_date,
      raw_description,
      raw_debit,
      raw_credit,
      raw_balance,
      raw_reference,
      source_page,
      source_file: null,
    };
  }

  protected async extractTableRows(pageNum: number = 1): Promise<RawTransaction[]> {
    const { selectors } = this.config;
    const rows: RawTransaction[] = [];

    await this.page.waitForSelector(selectors.transaction_table, { timeout: 10000 });

    const tableRows = await this.page.$$(
      `${selectors.transaction_table} tr:not(:first-child)`
    );

    for (const row of tableRows) {
      const date = await row.$eval(selectors.date_column, (el) => el.textContent?.trim() || "").catch(() => "");
      const description = await row.$eval(selectors.description_column, (el) => el.textContent?.trim() || "").catch(() => "");
      const debit = await row.$eval(selectors.debit_column, (el) => el.textContent?.trim() || null).catch(() => null);
      const credit = await row.$eval(selectors.credit_column, (el) => el.textContent?.trim() || null).catch(() => null);
      const balance = await row.$eval(selectors.balance_column, (el) => el.textContent?.trim() || null).catch(() => null);

      if (date && description) {
        rows.push(this.buildRawTransaction(date, description, debit, credit, balance, null, pageNum));
      }
    }

    return rows;
  }
}

// ─────────────────────────────────────────────────────────
// layer1-rpa/src/extractors/bnu.extractor.ts
// BNU-specific extraction logic
// ─────────────────────────────────────────────────────────

export class BNUExtractor extends BaseExtractor {
  async extract(dateFrom: string, dateTo: string): Promise<RawTransaction[]> {
    console.log(`[Layer1][BNU] Starting extraction: ${dateFrom} → ${dateTo}`);
    const allTransactions: RawTransaction[] = [];

    // Apply date filters if the portal supports them
    if (this.config.selectors.date_filter_from) {
      await this.page.fill(this.config.selectors.date_filter_from, dateFrom);
      await this.page.fill(this.config.selectors.date_filter_to!, dateTo);
      // Trigger filter — adjust selector as needed after portal inspection
      await this.page.keyboard.press("Enter");
      await this.page.waitForLoadState("networkidle");
    }

    let pageNum = 1;
    while (true) {
      const rows = await this.extractTableRows(pageNum);
      allTransactions.push(...rows);

      console.log(`[Layer1][BNU] Page ${pageNum}: extracted ${rows.length} rows`);

      // Check for next page
      if (!this.config.pagination || !this.config.selectors.next_page_button) break;

      const nextBtn = await this.page.$(this.config.selectors.next_page_button);
      if (!nextBtn) break;

      const isDisabled = await nextBtn.getAttribute("disabled");
      if (isDisabled !== null) break;

      await nextBtn.click();
      await this.page.waitForLoadState("networkidle");
      pageNum++;
    }

    console.log(`[Layer1][BNU] Total extracted: ${allTransactions.length} transactions`);
    return allTransactions;
  }
}
