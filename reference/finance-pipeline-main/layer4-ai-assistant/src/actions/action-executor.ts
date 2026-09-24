import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AssistantAction } from "../engine/assistant";

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// Signed amount as a single number: debit is an outflow (negative),
// credit is an inflow (positive). Used anywhere the old schema's flat
// "amount" column is being emulated over classified_transactions'
// debit_amount/credit_amount split.
const AMOUNT_EXPR = "COALESCE(credit_amount, -debit_amount, 0)";

export class ActionExecutor {
  private db: ReturnType<typeof Database>;

  constructor(db: ReturnType<typeof Database>) {
    this.db = db;
  }

  async execute(action: AssistantAction): Promise<ActionResult> {
    switch (action.type) {
      case "classify":
        return this.executeClassify(action.params);
      case "transform":
        return this.executeTransform(action.params);
      case "analyse":
        return this.executeAnalyse(action.params);
      case "query":
        return this.executeQuery(action.params);
      case "export":
        return this.executeExport(action.params);
      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  }

  private executeClassify(params: Record<string, any>): ActionResult {
    const { transaction_ids, new_category, new_gl_code, new_cost_center, reasoning } = params;
    const now = new Date().toISOString();

    try {
      let ids: string[];

      if (transaction_ids === "all") {
        const rows = this.db.prepare("SELECT transaction_id FROM classified_transactions").all() as any[];
        ids = rows.map((r) => r.transaction_id);
      } else if (transaction_ids === "all_flagged") {
        const rows = this.db.prepare("SELECT transaction_id FROM classified_transactions WHERE requires_human_review = 1").all() as any[];
        ids = rows.map((r) => r.transaction_id);
      } else {
        ids = Array.isArray(transaction_ids) ? transaction_ids : [transaction_ids];
      }

      let updated = 0;
      for (const id of ids) {
        const sets: string[] = ["updated_at = ?"];
        const values: any[] = [now];

        if (new_category) { sets.push("category = ?"); values.push(new_category); }
        if (new_gl_code) { sets.push("gl_code = ?"); values.push(new_gl_code); }
        if (new_cost_center) { sets.push("cost_center = ?"); values.push(new_cost_center); }
        if (sets.length === 1) continue; // nothing but updated_at

        values.push(id);
        this.db.prepare(`UPDATE classified_transactions SET ${sets.join(", ")} WHERE transaction_id = ?`).run(...values);
        updated++;
      }

      return {
        success: true,
        message: `Reclassified ${updated} transaction(s) to "${new_category || "updated"}"${reasoning ? `. Reason: ${reasoning}` : ""}`,
        data: { updated, ids },
      };
    } catch (error) {
      return { success: false, message: `Classification failed: ${(error as Error).message}` };
    }
  }

  private executeTransform(params: Record<string, any>): ActionResult {
    const { transaction_ids, field, value } = params;

    try {
      const allowedFields = ["transaction_date", "description", "category", "sub_category", "gl_code", "cost_center", "source_bank"];
      if (!allowedFields.includes(field)) {
        return { success: false, message: `Cannot update field "${field}". Allowed: ${allowedFields.join(", ")}` };
      }

      let ids: string[];
      if (transaction_ids === "all") {
        const rows = this.db.prepare("SELECT transaction_id FROM classified_transactions").all() as any[];
        ids = rows.map((r) => r.transaction_id);
      } else {
        ids = Array.isArray(transaction_ids) ? transaction_ids : [transaction_ids];
      }

      let updated = 0;
      for (const id of ids) {
        this.db.prepare(`UPDATE classified_transactions SET ${field} = ?, updated_at = ? WHERE transaction_id = ?`)
          .run(value, new Date().toISOString(), id);
        updated++;
      }

      return {
        success: true,
        message: `Updated "${field}" to "${value}" for ${updated} transaction(s)`,
        data: { updated, field, value },
      };
    } catch (error) {
      return { success: false, message: `Transform failed: ${(error as Error).message}` };
    }
  }

  private executeAnalyse(params: Record<string, any>): ActionResult {
    const { type } = params;

    try {
      switch (type) {
        case "summary_by_category": {
          const rows = this.db.prepare(
            `SELECT category, COUNT(*) as count, SUM(${AMOUNT_EXPR}) as total, AVG(classification_confidence) as avg_confidence FROM classified_transactions GROUP BY category ORDER BY total DESC`
          ).all();
          return { success: true, message: "Category summary generated", data: rows };
        }

        case "summary_by_bank": {
          const rows = this.db.prepare(
            `SELECT source_bank as bank, COUNT(*) as count, SUM(${AMOUNT_EXPR}) as total, AVG(classification_confidence) as avg_confidence FROM classified_transactions GROUP BY source_bank ORDER BY total DESC`
          ).all();
          return { success: true, message: "Bank summary generated", data: rows };
        }

        case "anomaly_scan": {
          const rows = this.db.prepare(
            "SELECT * FROM classified_transactions WHERE classification_confidence < 0.6 OR requires_human_review = 1 ORDER BY classification_confidence ASC LIMIT 20"
          ).all();
          return { success: true, message: `Found ${rows.length} potential anomalies`, data: rows };
        }

        case "top_expenses": {
          const rows = this.db.prepare(
            `SELECT * FROM classified_transactions ORDER BY ${AMOUNT_EXPR} DESC LIMIT 10`
          ).all();
          return { success: true, message: "Top 10 expenses by amount", data: rows };
        }

        default:
          return { success: false, message: `Unknown analysis type: ${type}` };
      }
    } catch (error) {
      return { success: false, message: `Analysis failed: ${(error as Error).message}` };
    }
  }

  private executeQuery(params: Record<string, any>): ActionResult {
    const { filters, limit } = params;
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.bank) { conditions.push("source_bank LIKE ?"); values.push(`%${filters.bank}%`); }
    if (filters?.category) { conditions.push("category LIKE ?"); values.push(`%${filters.category}%`); }
    if (filters?.status) { conditions.push("requires_human_review = ?"); values.push(String(filters.status).toLowerCase() === "flagged" ? 1 : 0); }
    if (filters?.date_from) { conditions.push("transaction_date >= ?"); values.push(filters.date_from); }
    if (filters?.date_to) { conditions.push("transaction_date <= ?"); values.push(filters.date_to); }
    if (filters?.min_amount) { conditions.push(`${AMOUNT_EXPR} >= ?`); values.push(filters.min_amount); }
    if (filters?.max_amount) { conditions.push(`${AMOUNT_EXPR} <= ?`); values.push(filters.max_amount); }
    if (filters?.search) { conditions.push("description LIKE ?"); values.push(`%${filters.search}%`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM classified_transactions ${where} ORDER BY transaction_date DESC LIMIT ?`;
    values.push(limit || 50);

    try {
      const rows = this.db.prepare(sql).all(...values);
      return { success: true, message: `Found ${rows.length} transaction(s)`, data: rows };
    } catch (error) {
      return { success: false, message: `Query failed: ${(error as Error).message}` };
    }
  }

  private executeExport(params: Record<string, any>): ActionResult {
    const { format, filters } = params;

    try {
      // Get data using query logic
      const queryResult = this.executeQuery({ filters, limit: 10000 });
      if (!queryResult.success || !queryResult.data) {
        return { success: false, message: "No data to export" };
      }

      const transactions = queryResult.data;
      const exportDir = path.join(process.cwd(), "exports", format);
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `assistant_export_${timestamp}.${format}`;
      const filepath = path.join(exportDir, filename);

      if (format === "csv") {
        const headers = Object.keys(transactions[0] || {}).join(",");
        const rows = transactions.map((tx: any) =>
          Object.values(tx).map((v: any) => typeof v === "string" && v.includes(",") ? `"${v}"` : v).join(",")
        );
        fs.writeFileSync(filepath, [headers, ...rows].join("\n"), "utf-8");
      } else {
        fs.writeFileSync(filepath, JSON.stringify({ exported_at: new Date().toISOString(), transactions }, null, 2), "utf-8");
      }

      return {
        success: true,
        message: `Exported ${transactions.length} transactions to ${filename}`,
        data: { filepath, format, count: transactions.length },
      };
    } catch (error) {
      return { success: false, message: `Export failed: ${(error as Error).message}` };
    }
  }
}
