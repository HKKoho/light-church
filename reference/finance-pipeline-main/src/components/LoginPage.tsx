import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, HardHat, Landmark, ArrowRight, Lock, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth delay
    setTimeout(() => {
      onLogin();
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-transparent to-indigo-950/50"></div>
      </div>

      {/* Decorative Elements - Linking Construction and Finance */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 2 }}
          className="absolute top-20 left-20"
        >
          <HardHat size={400} className="text-white" />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 2 }}
          className="absolute bottom-20 right-20"
        >
          <Landmark size={400} className="text-white" />
        </motion.div>
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <motion.line 
            x1="10%" y1="20%" x2="90%" y2="80%" 
            stroke="white" strokeWidth="1" strokeDasharray="10,10"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.line 
            x1="90%" y1="20%" x2="10%" y2="80%" 
            stroke="white" strokeWidth="1" strokeDasharray="10,10"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </svg>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md p-8 mx-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg mb-4">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center">SecureFin Pipeline</h1>
          <p className="text-indigo-100/70 text-sm mt-2 font-medium text-center">
            Bridging Construction Operations & Financial Integrity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-100 uppercase tracking-widest ml-1">Corporate ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
              <input 
                type="text" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@construction-corp.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-indigo-300/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-100 uppercase tracking-widest ml-1">Secure Access Key</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-indigo-300/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Initialize Pipeline <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] text-indigo-200/50 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1">
            <HardHat className="w-3 h-3" /> Build-Phase v4.2
          </div>
          <div className="flex items-center gap-1">
            <Landmark className="w-3 h-3" /> Bank-Verified
          </div>
        </div>
      </motion.div>
    </div>
  );
}
