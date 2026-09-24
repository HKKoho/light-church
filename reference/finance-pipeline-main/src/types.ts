export interface Transaction {
  id: string;
  bank: string;
  rawText: string;
  date: string;
  amount: number;
  vendor: string;
  category: string;
  confidence: number;
  status: 'pending' | 'approved' | 'flagged';
}

export interface BotStatus {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun: string;
  rowsProcessed: number;
}
