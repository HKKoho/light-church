// layer2-ai/src/classifiers/llm.classifier.ts
// Calls Claude (or GPT) to classify transaction descriptions
// Never receives credentials — only transaction text, amounts, dates

import Anthropic from "@anthropic-ai/sdk";
import {
  ClassificationRequest,
  ClassificationResult,
} from "../../shared/types/pipeline.types";
import {
  SYSTEM_PROMPT,
  buildClassificationPrompt,
  buildBatchClassificationPrompt,
} from "../prompts/classify";

const CONFIDENCE_THRESHOLD = 0.80;
const MODEL = "claude-sonnet-4-6";  // update to latest as needed

export class LLMClassifier {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async classifySingle(req: ClassificationRequest): Promise<ClassificationResult> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0,       // deterministic — critical for financial classification
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildClassificationPrompt(req) },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return this.parseResult(text, req.transaction_id);
  }

  async classifyBatch(
    requests: ClassificationRequest[]
  ): Promise<ClassificationResult[]> {
    if (requests.length === 0) return [];

    // Process in batches of 20 to stay within token limits
    const BATCH_SIZE = 20;
    const results: ClassificationResult[] = [];

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      console.log(
        `[Layer2][LLM] Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} transactions`
      );

      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildBatchClassificationPrompt(batch) },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const batchResults = this.parseBatchResults(text, batch);
      results.push(...batchResults);
    }

    return results;
  }

  private parseResult(text: string, transaction_id: string): ClassificationResult {
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Enforce human review for low confidence
      if (parsed.confidence < CONFIDENCE_THRESHOLD && !parsed.flag) {
        parsed.flag = "LOW_CONFIDENCE";
      }

      return parsed as ClassificationResult;
    } catch (err) {
      console.error(`[Layer2][LLM] Parse error for ${transaction_id}:`, err);
      return {
        category: "Other Expense",
        sub_category: "Unclassified",
        gl_code: "9100",
        cost_center: "UNKNOWN",
        confidence: 0,
        reasoning: "Classification failed — parse error",
        flag: "CLASSIFICATION_FAILED",
      };
    }
  }

  private parseBatchResults(
    text: string,
    requests: ClassificationRequest[]
  ): ClassificationResult[] {
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return parsed as ClassificationResult[];
    } catch {
      // Fallback: classify each individually
      console.warn("[Layer2][LLM] Batch parse failed, falling back to individual classification");
      return requests.map(() => ({
        category: "Other Expense",
        sub_category: "Unclassified",
        gl_code: "9100",
        cost_center: "UNKNOWN",
        confidence: 0,
        reasoning: "Batch classification failed",
        flag: "CLASSIFICATION_FAILED",
      }));
    }
  }
}
