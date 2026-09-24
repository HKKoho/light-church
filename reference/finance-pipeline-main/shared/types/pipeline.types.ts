export type PipelineStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";

export interface PipelineRun {
  run_id: string;
  bank_id: string;
  triggered_by: string;
  triggered_at: string;
  layer1_status: PipelineStatus;
  layer1_records_extracted: number;
  layer2_status: PipelineStatus;
  layer2_records_classified: number;
  layer2_records_flagged: number;
  layer3_status: PipelineStatus;
  layer3_excel_path: string | null;
  completed_at: string | null;
  errors: string[];
}

export interface BankConfig {
  bank_id: string;
  bank_name: string;
  portal_url: string;
  selectors: {
    transaction_table: string;
    date_column: string;
    description_column: string;
    debit_column: string;
    credit_column: string;
    balance_column: string;
    next_page_button: string | null;
    date_filter_from: string | null;
    date_filter_to: string | null;
  };
  pagination: boolean;
  date_format: string;
  currency_default: string;
  requires_download: boolean;
  // Fallback ingestion path for banks with no live-portal session to attach
  // to: parses a digitally-generated (text-layer) PDF statement instead of
  // scraping a browser tab. See layer1-rpa/src/extractors/pdf-statement.extractor.ts.
  pdf_statement?: {
    // Regex with named groups: date, description, amount, balance. `amount`
    // is signed (negative = debit, positive = credit).
    line_pattern: string;
  };
}

export interface ClassificationRequest {
  transaction_id: string;
  description: string;
  amount: number;
  direction: "DEBIT" | "CREDIT";
  bank: string;
  date: string;
}

export interface AuditEvent {
  event_id: string;
  run_id: string;
  layer: 1 | 2 | 3;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}
