import { Transaction } from "../types";

const API_KEY = process.env.GEMINI_API_KEY;

const CATEGORY_KEYWORDS: Record<string, { category: string; confidence: number }> = {
  uber: { category: "Travel", confidence: 0.92 },
  lyft: { category: "Travel", confidence: 0.92 },
  airline: { category: "Travel", confidence: 0.90 },
  flight: { category: "Travel", confidence: 0.90 },
  hotel: { category: "Travel", confidence: 0.88 },
  aws: { category: "IT Infrastructure", confidence: 0.95 },
  amazon: { category: "Office Supplies", confidence: 0.85 },
  azure: { category: "IT Infrastructure", confidence: 0.93 },
  google: { category: "IT Infrastructure", confidence: 0.88 },
  payroll: { category: "Payroll", confidence: 0.96 },
  salary: { category: "Payroll", confidence: 0.96 },
  electric: { category: "Utilities", confidence: 0.90 },
  water: { category: "Utilities", confidence: 0.90 },
  telecom: { category: "Utilities", confidence: 0.88 },
  rent: { category: "Rent", confidence: 0.94 },
  lease: { category: "Rent", confidence: 0.90 },
  marketing: { category: "Marketing", confidence: 0.87 },
  ads: { category: "Marketing", confidence: 0.85 },
  legal: { category: "Professional Services", confidence: 0.88 },
  consult: { category: "Professional Services", confidence: 0.85 },
  cement: { category: "COGS", confidence: 0.90 },
  material: { category: "COGS", confidence: 0.85 },
  supply: { category: "COGS", confidence: 0.82 },
};

function localClassify(rawText: string): Partial<Transaction> {
  const lower = rawText.toLowerCase();

  // Extract amount from text (e.g. "$500", "$1,250.00")
  const amountMatch = rawText.match(/\$?([\d,]+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;

  // Extract vendor — first recognizable word or phrase
  const words = rawText.replace(/[^a-zA-Z\s]/g, " ").trim().split(/\s+/);
  const vendor = words.find(w => w.length > 2 && !["ACH", "WTHDRWL", "TRF", "PMT", "POS", "ATM", "CHK", "DEP"].includes(w.toUpperCase())) || "Unknown";

  // Match category by keywords
  let category = "Uncategorized";
  let confidence = 0.55;

  for (const [keyword, match] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      category = match.category;
      confidence = match.confidence;
      break;
    }
  }

  return {
    rawText,
    vendor: vendor.charAt(0).toUpperCase() + vendor.slice(1),
    category,
    date: new Date().toISOString().split("T")[0],
    amount,
    confidence,
    status: confidence > 0.8 ? "approved" : "flagged",
  };
}

export async function classifyTransaction(rawText: string): Promise<Partial<Transaction>> {
  // If no API key, use local keyword-based classification
  if (!API_KEY || API_KEY === "MY_GEMINI_API_KEY") {
    return localClassify(rawText);
  }

  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const SYSTEM_PROMPT = `You are a Senior Financial Controller. You will receive raw transaction strings. Your job is to:
1. Fix formatting (Dates to YYYY-MM-DD).
2. Classify the expense into standard GAAP categories (Travel, IT, COGS, Payroll, Office Supplies, Utilities, Rent, Marketing, Professional Services).
3. Return JSON only.

Example Input: "ACH WTHDRWL AMAZON WEB SVCS - $500"
Example Output: { "vendor": "AWS", "category": "IT Infrastructure", "date": "2024-03-05", "amount": 500, "confidence": 0.98 }

If the date is missing, use today's date.
If the amount is missing, estimate or use 0.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: rawText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
          },
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    return {
      rawText,
      vendor: json.vendor || "Unknown",
      category: json.category || "Uncategorized",
      date: json.date || new Date().toISOString().split("T")[0],
      amount: json.amount || 0,
      confidence: json.confidence || 0,
      status: (json.confidence || 0) > 0.8 ? "approved" : "flagged",
    };
  } catch (error) {
    console.warn("Gemini API unavailable, using local classification:", error);
    return localClassify(rawText);
  }
}
