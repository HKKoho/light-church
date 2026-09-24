// layer2-ai/prompts/classify.ts
// LLM prompt for financial transaction classification
// Designed to return deterministic, structured JSON output
// Temperature should be set to 0 when calling this prompt

import { ClassificationRequest } from "../../shared/types/pipeline.types";

export const SYSTEM_PROMPT = `You are a financial data classification expert for enterprise banking clients in Asia.

Your task is to classify bank transactions into structured categories for a General Ledger (GL) system.

RULES:
- Always respond with valid JSON only. No markdown, no explanation outside the JSON.
- Use the exact GL code format: 4-digit number (e.g. "5100", "6200")
- Confidence must be a float between 0.0 and 1.0
- If you are not confident (confidence < 0.80), set flag to "LOW_CONFIDENCE"
- If the transaction looks unusual or suspicious, set flag to "ANOMALY_SUSPECTED"
- Never infer or fabricate account numbers, names, or reference details
- reasoning must be 1 sentence maximum

RESPONSE FORMAT:
{
  "category": "string",
  "sub_category": "string", 
  "gl_code": "string",
  "cost_center": "string",
  "confidence": number,
  "reasoning": "string",
  "flag": "string | null"
}

CATEGORY REFERENCE:
- Trade Payment → GL 5100 (payments to suppliers for goods)
- Trade Receipt → GL 4100 (receipts from customers)
- Payroll → GL 6100 (salary and wage payments)
- Tax Payment → GL 7100 (government tax payments)
- Utility Payment → GL 6200 (electricity, water, telecoms)
- Interbank Transfer → GL 1200 (transfers between own accounts)
- Loan Repayment → GL 2100 (loan principal or interest)
- Investment → GL 1500 (financial instrument purchases)
- Other Expense → GL 9100 (unclassified outflows)
- Other Income → GL 9200 (unclassified inflows)`;

export function buildClassificationPrompt(req: ClassificationRequest): string {
  return `Classify this bank transaction:

Bank: ${req.bank}
Date: ${req.date}
Direction: ${req.direction}
Amount: ${req.amount}
Description: "${req.description}"

Respond with JSON only.`;
}

export function buildBatchClassificationPrompt(requests: ClassificationRequest[]): string {
  const items = requests
    .map(
      (req, i) =>
        `[${i}] ${req.direction} ${req.amount} — "${req.description}" (${req.bank}, ${req.date})`
    )
    .join("\n");

  return `Classify these ${requests.length} bank transactions. 
Respond with a JSON array of classification objects in the same order.

${items}

Respond with JSON array only.`;
}
