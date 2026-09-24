import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, ArrowRight, X } from 'lucide-react';
import { BotStatus } from '../types';

interface StartReminderProps {
  bots: BotStatus[];
  onStartAll: () => void;
  onDismiss: () => void;
}

export function StartReminder({ bots, onStartAll, onDismiss }: StartReminderProps) {
  // Nothing to prompt for once every bot is already mid-run.
  if (bots.length > 0 && bots.every(b => b.status === 'running')) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden"
      >
        <div className="flex items-start sm:items-center justify-between gap-4 p-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-lg shrink-0">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Start today's bank recognition</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Trigger extraction now so classified transactions and the review queue stay current.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onStartAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              Start Bank Recognition
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onDismiss}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Remind me later"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
