import React from 'react';
import { BookOpen, Download, Upload } from 'lucide-react';
import { SermonPlanEntry } from '../types/bulletin';
import { downloadSermonPlan, parseSermonPlanFile } from '../utils/sermonPlan';

interface SermonPlanCardProps {
  plan: SermonPlanEntry[];
  onImport: (entries: SermonPlanEntry[]) => void;
  onStatus: (status: { message: string; error?: boolean }) => void;
}

const BUTTON =
  'flex-1 flex items-center justify-center gap-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/80 text-slate-200 py-1.5 rounded text-[11px] font-semibold transition-colors';

/** Upload / download the year's preaching plan (全年主日崇拜講道名單和題目). */
export const SermonPlanCard: React.FC<SermonPlanCardProps> = ({ plan, onImport, onStatus }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const entries = await parseSermonPlanFile(file);
      if (entries.length === 0) {
        onStatus({ message: '找不到可辨識的講道資料，請檢查日期／講員／講題欄位標題。', error: true });
        return;
      }
      onImport(entries);
      onStatus({ message: `已匯入 ${entries.length} 個主日的講道名單，已自動套用至相應日期的程序表` });
    } catch {
      onStatus({ message: '無法讀取講道名單，請確認 Excel 格式正確。', error: true });
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700/80 rounded-lg p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
        <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" /> 全年主日崇拜講道名單和題目
      </p>
      <p className="text-[10px] text-slate-400">
        {plan.length > 0 ? `已載入 ${plan.length} 個主日` : '尚未上載（可先下載範本填寫）'}
      </p>
      <div className="flex gap-1.5">
        <label className={`${BUTTON} cursor-pointer`}>
          <Upload className="w-3 h-3" /> 上載（Excel）
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </label>
        <button type="button" className={BUTTON} onClick={() => downloadSermonPlan(plan)}>
          <Download className="w-3 h-3" /> {plan.length > 0 ? '下載' : '下載範本'}
        </button>
      </div>
    </div>
  );
};
