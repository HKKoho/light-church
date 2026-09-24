import React from 'react';
import { motion } from 'motion/react';
import { Check, X, AlertTriangle, Edit2, Loader2 } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  onApprove: (id: string) => void;
  onFlag: (id: string) => void;
}

export function TransactionTable({ transactions, onApprove, onFlag }: TransactionTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-300">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider w-10">
              #
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Bank Account
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Vendor / Description
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              AI Conf.
            </th>
            <th className="px-4 py-2 border-r border-gray-300 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-2 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((tx, idx) => (
            <motion.tr 
              key={tx.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-blue-50/50 transition-colors group"
            >
              <td className="px-4 py-2 border-r border-gray-200 text-xs text-gray-400 font-mono text-center bg-gray-50/50">
                {idx + 1}
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs font-medium text-indigo-600">
                {tx.bank}
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs text-gray-600 font-mono">
                {tx.date}
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs text-gray-900">
                <div className="font-medium">{tx.vendor}</div>
                <div className="text-[10px] text-gray-400 truncate max-w-[200px] italic">{tx.rawText}</div>
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  {tx.category.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs font-mono font-bold text-right">
                ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${tx.confidence > 0.8 ? 'bg-emerald-500' : tx.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                      style={{ width: `${tx.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono">{(tx.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-4 py-2 border-r border-gray-200 text-xs">
                <div className="flex items-center gap-1.5">
                  {tx.status === 'approved' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                  {tx.status === 'flagged' && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                  {tx.status === 'pending' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  <span className="capitalize text-[10px] font-bold tracking-tight">
                    {tx.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onApprove(tx.id)}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onFlag(tx.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


