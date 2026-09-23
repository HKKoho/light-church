import React, { useEffect, useState } from 'react';
import { ChurchService } from '../types/bulletin';
import { getPublishedServices, subscribeToPublishedServices } from '../utils/publishStore';
import { Printer } from 'lucide-react';
import { BulletinPageBody } from './bulletin-pages/BulletinPageBody';
import { BULLETIN_PAGES, BulletinPageKey, pageHasContent } from '../utils/bulletinPages';

export const CongregationView: React.FC = () => {
  const [published, setPublished] = useState<ChurchService[]>(() => getPublishedServices());
  const [selectedId, setSelectedId] = useState<string>(() => getPublishedServices()[0]?.id ?? '');
  const [activePage, setActivePage] = useState<BulletinPageKey>('order');

  useEffect(() => {
    const refresh = () => {
      const list = getPublishedServices();
      setPublished(list);
      setSelectedId((prev) => (list.some((s) => s.id === prev) ? prev : list[0]?.id ?? ''));
    };
    return subscribeToPublishedServices(refresh);
  }, []);

  const service = published.find((s) => s.id === selectedId) || published[0];

  useEffect(() => {
    setActivePage('order');
  }, [service?.id]);

  if (!service) {
    return (
      <div className="min-h-screen w-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-sm text-center bg-white border border-slate-200 rounded-xl p-8 shadow-xs space-y-3">
          <p className="text-slate-500 text-sm">暫時未有已發佈的崇拜程序，請稍後再回來查看。</p>
          <a
            href="#/admin"
            className="inline-block text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            教會同工後台
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-200 flex flex-col items-center py-6 px-3 sm:py-10 sm:px-4">
      {published.length > 1 && (
        <div className="w-full max-w-[540px] mb-4 flex items-center justify-between text-xs no-print">
          <label className="text-slate-500 font-semibold">選擇崇拜場次：</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {published.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {(() => {
        const visiblePages = BULLETIN_PAGES.filter((p) => pageHasContent(p.key, service));
        return visiblePages.length > 1 ? (
          <div className="w-full max-w-[540px] mb-4 flex flex-wrap gap-1.5 no-print">
            {visiblePages.map((page) => (
              <button
                key={page.key}
                onClick={() => setActivePage(page.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activePage === page.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        ) : null;
      })()}

      <div className="w-full max-w-[540px] min-h-[640px] bg-white paper-shadow p-6 sm:p-12 bulletin-font text-[#2a2a2a] relative overflow-hidden bulletin-paper shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />

        <BulletinPageBody service={service} page={activePage} />

        <div className="mt-10 text-center text-[9px] text-slate-400 uppercase tracking-widest font-sans">
          由 GraceBulletin AI v2.4 自動生成
        </div>
      </div>

      <div className="w-full max-w-[540px] mt-4 flex items-center justify-between no-print">
        <a href="#/admin" className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold">
          教會同工後台
        </a>
        <button
          onClick={() => window.print()}
          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> 列印
        </button>
      </div>
    </div>
  );
};
