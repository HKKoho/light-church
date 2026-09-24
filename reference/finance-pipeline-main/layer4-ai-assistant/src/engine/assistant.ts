import { ASSISTANT_SYSTEM_PROMPT, buildAssistantPrompt } from "../../prompts/assistant";

const API_KEY = process.env.GEMINI_API_KEY;

export interface AssistantAction {
  type: "classify" | "transform" | "analyse" | "query" | "export";
  params: Record<string, any>;
}

export interface AssistantResponse {
  message: string;
  action: AssistantAction | null;
  suggestions: string[];
}

export class AIAssistant {
  async chat(
    userMessage: string,
    context: { transactionCount: number; recentTransactions: any[]; stats: any }
  ): Promise<AssistantResponse> {
    const prompt = buildAssistantPrompt(userMessage, context);

    // Try Gemini API first, fallback to local
    if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
      try {
        return await this.callGemini(prompt);
      } catch (error) {
        console.warn("Gemini API failed, using local assistant:", error);
        return this.localAssistant(userMessage, context);
      }
    }

    return this.localAssistant(userMessage, context);
  }

  private async callGemini(prompt: string): Promise<AssistantResponse> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: ASSISTANT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      message: parsed.message || "I processed your request.",
      action: parsed.action || null,
      suggestions: parsed.suggestions || [],
    };
  }

  private localAssistant(
    userMessage: string,
    context: { transactionCount: number; recentTransactions: any[]; stats: any }
  ): AssistantResponse {
    const lower = userMessage.toLowerCase();

    // Analyse commands
    if (lower.includes("summary") || lower.includes("summarise") || lower.includes("summarize") || lower.includes("breakdown")) {
      return {
        message: `Here's a summary of your data: ${context.transactionCount} total transactions. Success rate: ${context.stats.successRate?.toFixed(1) || "N/A"}%. Use the Gemini API key for deeper analysis.`,
        action: { type: "analyse", params: { type: "summary_by_category", filters: {} } },
        suggestions: ["Show me top expenses", "Which transactions need review?", "Export all data to CSV"],
      };
    }

    // Query commands
    if (lower.includes("show") || lower.includes("find") || lower.includes("list") || lower.includes("search")) {
      const bankMatch = lower.match(/(?:from|bank|for)\s+([\w\s]+?)(?:\s+bank|\s*$)/i);
      const filters: Record<string, any> = {};
      if (bankMatch) filters.bank = bankMatch[1].trim();

      if (lower.includes("flagged") || lower.includes("review")) {
        filters.status = "flagged";
        return {
          message: `Searching for flagged transactions that need review...`,
          action: { type: "query", params: { filters, limit: 50 } },
          suggestions: ["Approve all flagged items", "Reclassify flagged as Trade Payment", "Export flagged to CSV"],
        };
      }

      return {
        message: `Searching transactions...`,
        action: { type: "query", params: { filters, limit: 50 } },
        suggestions: ["Filter by date range", "Show only flagged items", "Summarise by category"],
      };
    }

    // Classify commands
    if (lower.includes("reclassify") || lower.includes("classify") || lower.includes("change category") || lower.includes("move to")) {
      const categoryMatch = lower.match(/(?:as|to|into)\s+([a-zA-Z\s]+?)(?:\s*$|\.)/i);
      const category = categoryMatch ? categoryMatch[1].trim() : "Uncategorized";

      return {
        message: `I'll reclassify the selected transactions as "${category}". Which transactions should I update? You can say "all flagged" or provide specific IDs.`,
        action: null,
        suggestions: [`Reclassify all flagged as ${category}`, "Show me flagged transactions first", "Undo last reclassification"],
      };
    }

    // Export commands
    if (lower.includes("export") || lower.includes("download")) {
      const format = lower.includes("csv") ? "csv" : "json";
      return {
        message: `I'll export your transaction data as ${format.toUpperCase()}. This will include all classified transactions.`,
        action: { type: "export", params: { format, filters: {} } },
        suggestions: ["Export only approved transactions", "Export flagged items separately", "Export GL summary"],
      };
    }

    // Explain commands
    if (lower.includes("why") || lower.includes("explain") || lower.includes("reason")) {
      return {
        message: "I can explain any classification decision. Please tell me which transaction ID or description you'd like me to explain, and I'll walk you through the reasoning.",
        action: null,
        suggestions: ["Explain the last flagged transaction", "Why was tx-3 flagged?", "Show me low-confidence items"],
      };
    }

    // Default help
    return {
      message: `I'm FinPilot, your AI financial data assistant. I can help you:\n\n- **Classify** — Reclassify transactions to different GL codes\n- **Transform** — Clean, merge, or update transaction fields\n- **Analyse** — Summarise totals, spot anomalies, compare periods\n- **Query** — Find specific transactions by bank, date, or amount\n- **Export** — Push data to JSON, CSV, or your data warehouse\n\nWhat would you like to do?`,
      action: null,
      suggestions: ["Summarise transactions by category", "Show flagged items", "Export all to CSV", "Analyse spending trends"],
    };
  }
}
