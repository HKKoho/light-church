import { BankConfig } from "@finpipeline/shared";

export const BANKS: BankConfig[] = [
  {
    bank_id: "BNU",
    bank_name: "Banco Nacional Ultramarino",
    portal_url: "https://www.bnu.com.mo",
    selectors: {
      transaction_table: "table.transaction-list, #txn-table",
      date_column: "td.date, td:nth-child(1)",
      description_column: "td.description, td:nth-child(2)",
      debit_column: "td.debit, td:nth-child(3)",
      credit_column: "td.credit, td:nth-child(4)",
      balance_column: "td.balance, td:nth-child(5)",
      next_page_button: "a.next-page, button[aria-label='Next']",
      date_filter_from: "input#date-from",
      date_filter_to: "input#date-to",
    },
    pagination: true,
    date_format: "DD/MM/YYYY",
    currency_default: "MOP",
    requires_download: false,
  },
  {
    bank_id: "HSBC_HK",
    bank_name: "HSBC Hong Kong",
    portal_url: "https://www.hsbc.com.hk/online-banking",
    selectors: {
      transaction_table: "",
      date_column: "",
      description_column: "",
      debit_column: "",
      credit_column: "",
      balance_column: "",
      next_page_button: null,
      date_filter_from: null,
      date_filter_to: null,
    },
    pagination: false,
    date_format: "DD MMM YYYY",
    currency_default: "HKD",
    requires_download: true,
    pdf_statement: {
      // e.g. "15/03/2026  AMAZON WEB SERVICES SG        -500.00      4500.00"
      line_pattern:
        "^(?<date>\\d{1,2}\\/\\d{1,2}\\/\\d{4})\\s+(?<description>.+?)\\s+(?<amount>-?[\\d,]+\\.\\d{2})\\s+(?<balance>-?[\\d,]+\\.\\d{2})\\s*$",
    },
  },
];

export function getBankConfig(bank_id: string): BankConfig {
  const config = BANKS.find((b) => b.bank_id === bank_id);
  if (!config) throw new Error(`No config found for bank: ${bank_id}`);
  return config;
}
