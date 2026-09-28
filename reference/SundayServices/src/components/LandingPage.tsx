import React, { useRef, useState } from 'react';
import { Church, CloudUpload, FileText, Sparkles, X, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { saveBulletinFiles } from '../utils/bulletinDrive';
import { requestBulletinAnalysis, storePendingBulletinAnalysis } from '../utils/bulletinAnalysis';
import { importBulletinPdfs } from '../utils/bulletinStore';
import { resetChurchData } from '../utils/resetChurchData';

export const DEFAULT_CHURCH_NAME = '茶果嶺浸信會';
const ACCEPTED_FILE_TYPES = '.pdf';

interface LandingPageProps {
  onStart: (info: { churchName: string; files: File[] }) => void;
}

// The name chosen last time (App saves it on start), if any.
function loadSavedChurchName(): string {
  try {
    return localStorage.getItem('churchName')?.trim() || DEFAULT_CHURCH_NAME;
  } catch {
    return DEFAULT_CHURCH_NAME;
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [churchName, setChurchName] = useState<string>(loadSavedChurchName);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const pdfsOnly = Array.from(incoming).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newOnes = pdfsOnly.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...newOnes];
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canStart = churchName.trim().length > 0 && !isSaving && !isResetting;

  // Deletes this browser's copies for the named church and archives the
  // shared bulletins; other churches' browser data is untouched (see resetChurchData).
  const handleReset = async () => {
    const name = churchName.trim();
    if (!name) return;
    const ok = window.confirm(
      `確定重設「${name}」？\n\n會刪除此瀏覽器內這間教會已上載的週刊 PDF、司職表、講道計劃及格式分析，` +
        '並把系統內所有程序表（包括預設範例及草稿）存檔隱藏。之後再上載過去週刊，系統會重新讀取。'
    );
    if (!ok) return;
    setIsResetting(true);
    setResetMessage(null);
    try {
      const { pdfs, bulletins, clearedPlans } = await resetChurchData(name, DEFAULT_CHURCH_NAME);
      setFiles([]);
      setResetMessage({
        text:
          `已重設「${name}」：刪除 ${pdfs} 份週刊 PDF` +
          (bulletins !== null ? `，存檔 ${bulletins} 份程序表` : '') +
          (clearedPlans ? '，並清除司職表及講道計劃。' : '。（司職表及講道計劃屬目前使用中的教會，未有改動。）'),
      });
    } catch (err) {
      setResetMessage({ text: `未能重設：${err instanceof Error ? err.message : String(err)}`, error: true });
    } finally {
      setIsResetting(false);
    }
  };

  const handleStart = async () => {
    setSaveError(null);
    const name = churchName.trim();

    if (files.length > 0) {
      setIsSaving(true);
      try {
        await saveBulletinFiles(name, files);
      } catch {
        setSaveError('週刊未能儲存至系統，請重試一次。');
        setIsSaving(false);
        return;
      }

      // Inside Light Church the PDFs are archived in Postgres and AI reads
      // each into a bulletin the editor can carry forward. Standalone, fall
      // back to the Gemini format analysis. Either is a nice-to-have on top of
      // the upload, so a failure still lets the officer into the editor.
      try {
        await importBulletinPdfs(name, files);
      } catch (importErr) {
        try {
          const analysis = await requestBulletinAnalysis(name, files);
          storePendingBulletinAnalysis(name, analysis);
        } catch (err) {
          console.warn('Bulletin import and format analysis unavailable:', importErr, err);
        }
      }

      setIsSaving(false);
    }

    onStart({ churchName: name, files });
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-4 shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            主日崇拜內容智能編輯系統
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            輸入教會名稱並上載過去週刊，讓系統學習格式，協助編輯本週主日崇拜程序表
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Church name input */}
          <section>
            <label
              htmlFor="church-name"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2"
            >
              教會名稱
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Church className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="church-name"
                  type="text"
                  value={churchName}
                  onChange={(e) => {
                    setChurchName(e.target.value);
                    setResetMessage(null);
                  }}
                  placeholder={DEFAULT_CHURCH_NAME}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={!churchName.trim() || isResetting || isSaving}
                title="刪除此瀏覽器內這間教會的週刊 PDF、司職表、講道計劃及格式分析，並存檔系統內所有程序表"
                className="flex items-center gap-1 px-3 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reset
              </button>
            </div>
            {resetMessage && (
              <p className={`mt-1.5 text-[11px] font-medium ${resetMessage.error ? 'text-red-500' : 'text-emerald-600'}`}>
                {resetMessage.text}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">
              用作辨識主日崇拜週刊的教會格式規律
            </p>
          </section>

          {/* Upload */}
          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              上載過去兩個禮拜的主日崇拜週刊 PDF
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <CloudUpload className="w-7 h-7 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">
                上載過去兩個禮拜的主日崇拜週刊 PDF
              </p>
              <p className="text-[11px] text-slate-400">
                拖放 PDF 檔案至此，或按此選擇檔案 — 系統將學習格式規律，供智能編輯本週程序表
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <span className="flex items-center gap-2 min-w-0 text-xs font-medium text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      title="移除檔案"
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* CTA */}
          {saveError && (
            <p className="text-xs font-medium text-red-500 -mt-2">{saveError}</p>
          )}
          <button
            type="button"
            disabled={!canStart}
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                儲存並分析週刊中…
              </>
            ) : (
              <>
                開始編輯本週程序表
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
