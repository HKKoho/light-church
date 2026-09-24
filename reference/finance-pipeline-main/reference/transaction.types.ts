// shared/types/transaction.types.ts
// Central type definitions used across all layers

export interface RawTransaction {
  extraction_id: string;
  pipeline_run_id: string;
  source_bank: string;
  extracted_at: string;
  raw_date: string;
  raw_description: string;
  raw_debit: string | null;
  raw_credit: string | null;
  raw_balance: string | null;
  raw_reference: string | null;
  source_page: number;
  source_file: string | null;
}

export interface ClassificationResult {
  category: string;
  sub_category: string;
  gl_code: string;
  cost_center: string;
  confidence: number;
  reasoning: string;
  flag: string | null;
}

export interface ClassifiedTransaction {
  transaction_id: string;
  pipeline_run_id: string;
  source_bank: string;
  transaction_date: Date;
  description: string;
  debit_amount: number | null;
  credit_amount: number | null;
  balance: number | null;
  currency: string;
  reference_number: string | null;
  category: string;
  sub_category: string;
  gl_code: string;
  cost_center: string;
  classification_confidence: number;
  classification_model: string;
  classified_at: string;
  validation_status: ValidationStatus;
  validation_flags: string[];
  requires_human_review: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ValidationStatus = "PASSED" | "FLAGGED" | "REJECTED";

export interface ExcelReportRow {
  Date: string;
  Description: string;
  Debit: number | null;
  Credit: number | null;
  Balance: number | null;
  Currency: string;
  Category: string;
  "GL Code": string;
  "Cost Center": string;
  Reference: string;
  Status: string;
}
