import { Page } from "playwright";
import { v4 as uuidv4 } from "uuid";
import { RawTransaction, BankConfig } from "@finpipeline/shared";

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
