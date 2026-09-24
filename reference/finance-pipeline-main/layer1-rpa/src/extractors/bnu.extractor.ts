import { RawTransaction } from "@finpipeline/shared";
import { BaseExtractor } from "./base.extractor";

export class BNUExtractor extends BaseExtractor {
  async extract(dateFrom: string, dateTo: string): Promise<RawTransaction[]> {
    console.log(`[Layer1][BNU] Starting extraction: ${dateFrom} -> ${dateTo}`);
    const allTransactions: RawTransaction[] = [];

    if (this.config.selectors.date_filter_from) {
      await this.page.fill(this.config.selectors.date_filter_from, dateFrom);
      await this.page.fill(this.config.selectors.date_filter_to!, dateTo);
      await this.page.keyboard.press("Enter");
      await this.page.waitForLoadState("networkidle");
    }

    let pageNum = 1;
    while (true) {
      const rows = await this.extractTableRows(pageNum);
      allTransactions.push(...rows);

      console.log(`[Layer1][BNU] Page ${pageNum}: extracted ${rows.length} rows`);

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
