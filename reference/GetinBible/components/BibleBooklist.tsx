
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Module, Cycle } from '../types';
import { getAllCycles, getPublishedModules } from '../services/moduleService';
import SeasonalReadingGuide from './SeasonalReadingGuide';

interface BibleBooklistProps {
  onSelectModule: (module: Module) => void;
  chaptersRead?: Record<number, string>;
}

const BibleBooklist: React.FC<BibleBooklistProps> = ({ onSelectModule, chaptersRead = {} }) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [cyclesData, modulesData] = await Promise.all([
          getAllCycles(),
          getPublishedModules()
        ]);
        console.log('📚 Fetched cycles:', cyclesData);
        console.log('📖 Fetched published modules:', modulesData);
        console.log('✅ Number of published modules:', modulesData.length);
        setCycles(cyclesData);
        setModules(modulesData);
        setError(null);
      } catch (err) {
        console.error('❌ Failed to load modules:', err);
        setError('無法載入課程資料，請重新整理頁面');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          重新載入
        </button>
      </div>
    );
  }

  // Check if no modules are loaded
  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">目前沒有已發布的課程</h3>
          <p className="text-slate-500 mb-4">
            請聯絡管理員發布課程，或稍後再試
          </p>
          <p className="text-sm text-slate-400">
            💡 提示：管理員需要將月課狀態設為「已發布」學生才能看到
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-12 animate-fadeIn min-h-screen relative"
      style={{
        backgroundImage: 'url(/GrapeTree&Bible.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/70 to-white/80 pointer-events-none"></div>

      {/* Content wrapper */}
      <div className="relative z-10 space-y-12 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
          12個月你和弟兄姊妹一起的讀經旅程
        </h2>
        <p className="text-slate-600 leading-relaxed mb-6">
          讀聖經沒有一套模式是最正確，而是人以願意的心，投向神對世人，教會群體，信眾团契，你個人的啟示，明白神的心意，領悟怎樣信行生活。
        </p>

        {/* Navigation to Learning Reflection */}
        <Link
          to="/reflection"
          className="inline-flex items-center px-5 py-2.5 border-2 border-amber-300 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          查看我的讀經情況
        </Link>
      </section>

      {/* Cycles with Module Cards */}
      {cycles.map(cycle => (
        <div key={cycle.id} className="space-y-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-bold text-amber-700 bg-amber-50 px-4 py-1 rounded-full border border-amber-100">
              {cycle.title}
            </h3>
            <div className="h-px flex-grow bg-slate-200"></div>
          </div>
          <p className="text-sm text-slate-500 px-2">{cycle.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.filter(m => m.cycleId === cycle.id).map(module => (
              <div
                key={module.id}
                onClick={() => onSelectModule(module)}
                className="group relative bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-amber-200 transition-all cursor-pointer transform hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 text-slate-100 font-black text-4xl group-hover:text-amber-50 transition-colors">
                  {module.id.toString().padStart(2, '0')}
                </div>
                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-slate-800 mb-2 pr-10">
                    {module.title.split('｜')[1] || module.title}
                  </h4>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{module.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-amber-600 text-sm font-medium">
                      開始探討
                      <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {chaptersRead[module.id] && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        已讀 {chaptersRead[module.id]} 章
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Seasonal Reading Guide */}
      <SeasonalReadingGuide chaptersRead={chaptersRead} modules={modules} />
      </div>
    </div>
  );
};

export default BibleBooklist;
