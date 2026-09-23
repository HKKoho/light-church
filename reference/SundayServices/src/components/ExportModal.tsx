import React, { useState } from 'react';
import { ChurchService } from '../types/bulletin';
import { Printer, FileText, Download, Loader2 } from 'lucide-react';
import { exportMinistryUpdatesToPptx } from '../utils/exportMinistryPps';
import { FullBulletinPrintDocument } from './FullBulletinPrintDocument';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ChurchService;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, service }) => {
  const [isExportingPpt, setIsExportingPpt] = useState(false);

  if (!isOpen) return null;

  const handleExportMinistryPpt = async () => {
    if (isExportingPpt) return;
    setIsExportingPpt(true);
    try {
      await exportMinistryUpdatesToPptx(service);
    } catch (err) {
      console.error(err);
      alert('匯出 PPT 失敗，請重試。');
    } finally {
      setIsExportingPpt(false);
    }
  };

  const handleExportWholeBulletinPdf = () => {
    // FullBulletinPrintDocument is already in the DOM below (hidden on
    // screen, print:block-only) — this bulletin's own on-screen preview is
    // marked no-print, so the browser's print/PDF output picks up just
    // that hidden document instead of whatever tab happened to be open.
    window.print();
  };

  return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-slate-700" />
            匯出
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            正在匯出 <strong className="text-slate-900">{service.title}</strong>，請選擇：
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExportMinistryPpt}
              disabled={service.ministryUpdates.length === 0 || isExportingPpt}
              className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center space-y-2 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50"
            >
              {isExportingPpt ? (
                <Loader2 className="w-6 h-6 text-slate-700 mx-auto animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-slate-700 mx-auto group-hover:scale-110 transition-transform" />
              )}
              <span className="font-bold text-slate-900 block">家事分享 PPT／投影片</span>
              <span className="text-[10px] text-slate-500 block">
                {service.ministryUpdates.length === 0
                  ? '本場次尚未有家事分享內容可匯出'
                  : '每頁自動播放 10 秒並循環播放，開啟後如投影片般自動播放'}
              </span>
            </button>

            <button
              onClick={handleExportWholeBulletinPdf}
              className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center space-y-2 transition-colors group"
            >
              <FileText className="w-6 h-6 text-slate-700 mx-auto group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-900 block">整份程序表 PDF</span>
              <span className="text-[10px] text-slate-500 block">包含全部頁面，於列印對話框選擇「另存為 PDF」</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs"
          >
            關閉
          </button>
        </div>
      </div>
    </div>

    <FullBulletinPrintDocument service={service} />
    </>
  );
};
