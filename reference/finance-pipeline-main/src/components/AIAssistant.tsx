import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bot, Send, Sparkles, X, Maximize2, Minimize2, CheckCircle, AlertTriangle, FileSearch } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: any;
  data?: any;
  suggestions?: string[];
  timestamp: Date;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm **FinPilot**, your AI data integrity assistant. I can help you:\n\n- **Audit** extracted data for correctness\n- **Verify** transaction classifications and GL codes\n- **Detect** anomalies, duplicates, and mismatches\n- **Reclassify** transactions with natural language\n- **Export** clean data to your warehouse\n\nWhat would you like to check?",
      suggestions: ['Audit all transactions', 'Show flagged items', 'Summarise by category', 'Scan for anomalies'],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: data.message || 'I processed your request.',
        action: data.action,
        data: data.actionResult?.data,
        suggestions: data.suggestions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          suggestions: ['Retry last command'],
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-600/30 flex items-center gap-2"
      >
        <Bot className="w-6 h-6" />
        <span className="text-sm font-bold pr-1">FinPilot</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`fixed z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
        isExpanded
          ? 'inset-4'
          : 'bottom-6 right-6 w-[420px] h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">FinPilot AI Assistant</h3>
            <p className="text-[10px] text-indigo-200 font-medium">Data Integrity & Classification</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>

              {/* Data results */}
              {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div className="mt-3 bg-gray-50 rounded-lg p-2 border border-gray-100 max-h-48 overflow-y-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-200">
                        {Object.keys(msg.data[0]).slice(0, 5).map((key) => (
                          <th key={key} className="px-1 py-1 text-left font-bold uppercase">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.data.slice(0, 8).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-50">
                          {Object.values(row).slice(0, 5).map((val: any, ci: number) => (
                            <td key={ci} className="px-1 py-1 font-mono truncate max-w-[80px]">
                              {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {msg.data.length > 8 && (
                    <p className="text-[9px] text-gray-400 mt-1 text-center">+ {msg.data.length - 8} more rows</p>
                  )}
                </div>
              )}

              {/* Action badge */}
              {msg.action && (
                <div className="mt-2 flex items-center gap-1">
                  {msg.action.type === 'analyse' && <FileSearch className="w-3 h-3 text-indigo-500" />}
                  {msg.action.type === 'classify' && <CheckCircle className="w-3 h-3 text-green-500" />}
                  {msg.action.type === 'query' && <FileSearch className="w-3 h-3 text-blue-500" />}
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{msg.action.type} action executed</span>
                </div>
              )}

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && msg.role === 'assistant' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="text-[11px] px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span className="text-sm text-gray-500">FinPilot is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask FinPilot to audit, classify, or export..."
            className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:bg-gray-300 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
