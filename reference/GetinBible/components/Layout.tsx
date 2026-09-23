
import React from 'react';
import ContentAnalysisButton from './ContentAnalysisButton';
import { useAuth } from '../src/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  onHomeClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHomeClick }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white py-6 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div 
            className="cursor-pointer group flex items-center space-x-2" 
            onClick={onHomeClick}
          >
            <div className="bg-amber-400 w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold text-xl group-hover:bg-amber-300 transition-colors">
              活水
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">讀經進程</h1>
              <p className="text-xs text-slate-400 font-light tracking-widest uppercase">The Sword on Faith</p>
            </div>
          </div>
          <nav className="hidden md:block">
            <button 
              onClick={onHomeClick}
              className="px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              回到首頁
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-slate-100 py-10 border-t border-slate-200">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">© 2026 讀經獎勵計劃 </p>
          <div className="mt-4 flex justify-center space-x-6 text-slate-400 text-xs">
            <span>茶果嶺浸信會2026年目標：常在主裡、立好根基 - 認識神</span>
          </div>
        </div>
      </footer>

      {/* Content Analysis Floating Button - Student Interface Only */}
      <ContentAnalysisButton userId={user?.id} />
    </div>
  );
};

export default Layout;
