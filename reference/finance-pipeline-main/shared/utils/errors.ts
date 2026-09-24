export class ExtractionError extends Error {
  constructor(
    message: string,
    public bankId: string,
    public runId: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class ClassificationError extends Error {
  constructor(
    message: string,
    public transactionId: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "ClassificationError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public transactionId: string,
    public flags: string[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class WarehouseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "WarehouseError";
  }
}
