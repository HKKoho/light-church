import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BotStatus } from '../types';

interface BotControlProps {
  bot: BotStatus;
  onRun: (id: string) => void;
}

export const BotControl: React.FC<BotControlProps> = ({ bot, onRun }) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    onRun(bot.id);
    // Simulate run time
    setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-mono text-lg font-semibold text-gray-900">{bot.name}</h3>
          <p className="text-xs text-gray-500 mt-1">ID: {bot.id}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1
          ${bot.status === 'success' ? 'bg-green-100 text-green-700' : 
            bot.status === 'running' ? 'bg-blue-100 text-blue-700' : 
            bot.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {bot.status === 'success' && <CheckCircle className="w-3 h-3" />}
          {bot.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
          {bot.status === 'error' && <AlertCircle className="w-3 h-3" />}
          {bot.status.toUpperCase()}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Last Run</p>
          <p className="font-mono">{bot.lastRun}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rows Processed</p>
          <p className="font-mono">{bot.rowsProcessed}</p>
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={isRunning || bot.status === 'running'}
        className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors
          ${isRunning ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Trigger Bot
          </>
        )}
      </button>
    </div>
  );
}
