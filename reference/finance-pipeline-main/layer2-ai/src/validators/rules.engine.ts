import {
  ClassifiedTransaction,
  ValidationStatus,
  PipelineLogger,
} from "@finpipeline/shared";

const VALID_GL_PATTERN = /^\d{4}$/;

export class RulesEngine {
  private logger: PipelineLogger;
  private seenReferences: Set<string> = new Set();

  constructor(logger: PipelineLogger) {
    this.logger = logger;
  }

  validate(transaction: ClassifiedTransaction): ClassifiedTransaction {
    const flags: string[] = [];

    // Rule 1: Date must not be null
    if (!transaction.transaction_date || isNaN(transaction.transaction_date.getTime())) {
      flags.push("INVALID_DATE");
    }

    // Rule 2: Amount must be > 0
    const amount = transaction.debit_amount || transaction.credit_amount || 0;
    if (amount <= 0) {
      flags.push("ZERO_OR_NEGATIVE_AMOUNT");
    }

    // Rule 3: Valid GL code format (4 digits)
    if (!VALID_GL_PATTERN.test(transaction.gl_code)) {
      flags.push("INVALID_GL_CODE");
    }

    // Rule 4: Duplicate check by description + amount + date
    const fingerprint = `${transaction.description}|${amount}|${transaction.transaction_date?.toISOString()?.split("T")[0]}`;
    if (this.seenReferences.has(fingerprint)) {
      flags.push("DUPLICATE_SUSPECTED");
    }
    this.seenReferences.add(fingerprint);

    // Rule 5: Low confidence flag
    if (transaction.classification_confidence < 0.80) {
      flags.push("LOW_CONFIDENCE");
    }

    // Determine validation status
    let status: ValidationStatus = "PASSED";
    if (flags.includes("INVALID_DATE") || flags.includes("ZERO_OR_NEGATIVE_AMOUNT")) {
      status = "REJECTED";
    } else if (flags.length > 0) {
      status = "FLAGGED";
    }

    const validated: ClassifiedTransaction = {
      ...transaction,
      validation_status: status,
      validation_flags: flags,
      requires_human_review: status !== "PASSED",
    };

    if (flags.length > 0) {
      this.logger.warn("VALIDATION_FLAGS", `Transaction ${transaction.transaction_id} flagged`, {
        flags,
        status,
      });
    }

    return validated;
  }

  validateBatch(transactions: ClassifiedTransaction[]): ClassifiedTransaction[] {
    this.seenReferences.clear();
    return transactions.map((tx) => this.validate(tx));
  }
}
