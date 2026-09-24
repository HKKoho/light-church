import { Transaction, BotStatus } from "./types";

export const MOCK_BOTS: BotStatus[] = [
  {
    id: "bot-1",
    name: "PAD_Bank_Scraper_v1",
    status: "idle",
    lastRun: "2024-03-04 09:00 AM",
    rowsProcessed: 142,
  },
  {
    id: "bot-2",
    name: "Cloud_Orchestrator_v2",
    status: "success",
    lastRun: "2024-03-04 09:05 AM",
    rowsProcessed: 142,
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    bank: "Chase Business",
    rawText: "UBER TRIP 2834 - $24.50",
    date: "2024-03-01",
    amount: 24.50,
    vendor: "Uber",
    category: "Travel",
    confidence: 0.99,
    status: "approved",
  },
  {
    id: "tx-2",
    bank: "Wells Fargo",
    rawText: "AMZN Mktp US - $129.99",
    date: "2024-03-02",
    amount: 129.99,
    vendor: "Amazon",
    category: "Office Supplies",
    confidence: 0.95,
    status: "approved",
  },
  {
    id: "tx-3",
    bank: "Bank of America",
    rawText: "UNK VENDOR 9923 - $5000.00",
    date: "2024-03-03",
    amount: 5000.00,
    vendor: "Unknown",
    category: "Uncategorized",
    confidence: 0.45,
    status: "flagged",
  },
];
