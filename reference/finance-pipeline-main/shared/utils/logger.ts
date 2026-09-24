import { AuditEvent } from "../types/pipeline.types";
import { v4 as uuidv4 } from "uuid";

export class PipelineLogger {
  private runId: string;
  private layer: 1 | 2 | 3;

  constructor(runId: string, layer: 1 | 2 | 3) {
    this.runId = runId;
    this.layer = layer;
  }

  info(eventType: string, message: string, metadata: Record<string, unknown> = {}): AuditEvent {
    const event = this.buildEvent(eventType, message, metadata);
    console.log(`[Layer${this.layer}][${eventType}] ${message}`, metadata);
    return event;
  }

  warn(eventType: string, message: string, metadata: Record<string, unknown> = {}): AuditEvent {
    const event = this.buildEvent(eventType, message, metadata);
    console.warn(`[Layer${this.layer}][${eventType}] ${message}`, metadata);
    return event;
  }

  error(eventType: string, message: string, metadata: Record<string, unknown> = {}): AuditEvent {
    const event = this.buildEvent(eventType, message, metadata);
    console.error(`[Layer${this.layer}][${eventType}] ${message}`, metadata);
    return event;
  }

  private buildEvent(eventType: string, message: string, metadata: Record<string, unknown>): AuditEvent {
    return {
      event_id: uuidv4(),
      run_id: this.runId,
      layer: this.layer,
      event_type: eventType,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }
}
