import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  UploadCloud, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StatusCard } from './components/StatusCard';
import { BotControl } from './components/BotControl';
import { TransactionTable } from './components/TransactionTable';
import { classifyTransaction } from './services/gemini';
import { Transaction, BotStatus } from './types';
import { LoginPage } from './components/LoginPage';
import { AIAssistant } from './components/AIAssistant';
import { StartReminder } from './components/StartReminder';
import { StatementUpload } from './components/StatementUpload';

interface Stats {
  totalRows: number;
  lastRun: string;
  successRate: number;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRows: 0, lastRun: 'Never', successRate: 100 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [activeBank, setActiveBank] = useState<string>('All Banks');
  const [reminderDismissed, setReminderDismissed] = useState(false);

  const banks = ['All Banks', 'Chase Business', 'Wells Fargo', 'Bank of America'];

  const fetchData = async () => {
    if (!isLoggedIn) return;
    try {
      const [botsRes, txRes, statsRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('/api/transactions'),
        fetch('/api/stats')
      ]);
      
      const botsData = await botsRes.json();
      const txData = await txRes.json();
      const statsData = await statsRes.json();
      
      setBots(botsData);
      setTransactions(txData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => { setIsLoggedIn(true); setReminderDismissed(false); }} />;
  }

  // Derived stats
  const filteredTransactions = activeBank === 'All Banks' 
    ? transactions 
    : transactions.filter(t => t.bank === activeBank);

  const pendingReview = filteredTransactions.filter(t => t.confidence < 0.8 && t.status !== 'approved').length;

  const handleRunBot = async (id: string) => {
    setBots(prev => prev.map(b => 
      b.id === id ? { ...b, status: 'running' } : b
    ));

    try {
      const res = await fetch(`/api/bots/${id}/run`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error running bot:", error);
      setBots(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'error' } : b
      ));
    }
  };

  const handleStartAll = () => {
    setReminderDismissed(true);
    bots.filter(b => b.status !== 'running').forEach(b => handleRunBot(b.id));
  };

  const handleUpload = async () => {
    if (!uploadText.trim()) return;
    
    setIsProcessing(true);
    const lines = uploadText.split('\n').filter(l => l.trim());
    
    // Cycle through banks for simulation if "All Banks" is selected, otherwise use active bank
    let bankIndex = 0;
    const availableBanks = banks.slice(1);

    for (const line of lines) {
      const classification = await classifyTransaction(line);
      const targetBank = activeBank === 'All Banks' 
        ? availableBanks[bankIndex % availableBanks.length] 
        : activeBank;
      
      bankIndex++;

      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bank: targetBank,
        rawText: line,
        vendor: classification.vendor || 'Unknown',
        category: classification.category || 'Uncategorized',
        date: classification.date || new Date().toISOString().split('T')[0],
        amount: classification.amount || 0,
        confidence: classification.confidence || 0,
        status: (classification.confidence || 0) > 0.8 ? 'approved' : 'flagged',
      };

      try {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newTx.id,
            bank: newTx.bank,
            raw_text: newTx.rawText,
            date: newTx.date,
            amount: newTx.amount,
            vendor: newTx.vendor,
            category: newTx.category,
            confidence: newTx.confidence,
            status: newTx.status
          })
        });
      } catch (error) {
        console.error("Error saving transaction:", error);
      }
    }

    await fetchData();
    setIsProcessing(false);
    setUploadText('');
  };

  const handleApprove = async (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t));
    try {
      await fetch(`/api/pipeline/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reviewer: 'JD' }),
      });
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
  };

  const handleFlag = async (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'flagged' } : t));
    try {
      await fetch(`/api/pipeline/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reviewer: 'JD' }),
      });
    } catch (error) {
      console.error('Error flagging transaction:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">SecureFin Pipeline</h1>
              <p className="text-xs text-gray-500 font-medium">AI-Augmented Financial Data</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              System Operational
            </div>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs transition-colors"
              title="Sign Out"
            >
              JD
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Next-step reminder */}
        {!reminderDismissed && (
          <StartReminder
            bots={bots}
            onStartAll={handleStartAll}
            onDismiss={() => setReminderDismissed(true)}
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard 
            title="Rows Processed" 
            value={stats.totalRows.toLocaleString()} 
            icon={FileText} 
            subtext="Syncing with Dataverse"
            trend="up"
          />
          <StatusCard 
            title="Last Run Time" 
            value={stats.lastRun === 'Never' ? 'N/A' : stats.lastRun.split(',')[1]?.trim() || stats.lastRun} 
            icon={Activity} 
            subtext={stats.lastRun === 'Never' ? 'No recent activity' : stats.lastRun.split(',')[0]}
            trend="neutral"
          />
          <StatusCard 
            title="Success Rate" 
            value={`${stats.successRate.toFixed(1)}%`} 
            icon={CheckCircle} 
            subtext="AI Confidence > 80%"
            trend="neutral"
          />
          <StatusCard 
            title="Pending Review" 
            value={pendingReview} 
            icon={AlertTriangle} 
            subtext="Requires manual check"
            trend={pendingReview > 5 ? 'down' : 'neutral'}
          />
        </div>

        {/* Bot Control Center */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Bot Control Center</h2>
            <button 
              onClick={fetchData}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bots.map(bot => (
              <BotControl key={bot.id} bot={bot} onRun={handleRunBot} />
            ))}
          </div>
        </section>

        {/* PDF fallback ingestion when no RPA session is available */}
        <StatementUpload onUploaded={fetchData} />

        {/* Manual Upload Simulation */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Simulate Data Ingestion</h3>
              <p className="text-sm text-gray-500">Paste raw transaction text to test the AI classification layer.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <textarea
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="Example: ACH WTHDRWL AMAZON WEB SVCS - $500"
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isProcessing || !uploadText}
                className={`px-6 py-2 rounded-lg font-medium text-white transition-colors
                  ${isProcessing || !uploadText ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isProcessing ? 'Processing with AI...' : 'Ingest & Classify'}
              </button>
            </div>
          </div>
        </section>

        {/* Exception Handling Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Transaction Worksheet</h2>
            <div className="flex gap-2 bg-gray-200/50 p-1 rounded-lg">
              {banks.map(bank => (
                <button
                  key={bank}
                  onClick={() => setActiveBank(bank)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeBank === bank 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {bank}
                </button>
              ))}
            </div>
          </div>
          <TransactionTable 
            transactions={filteredTransactions} 
            onApprove={handleApprove} 
            onFlag={handleFlag} 
          />
        </section>

      </main>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
