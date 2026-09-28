import React from 'react';
import { Sparkles } from 'lucide-react';

export interface PastBulletinImportResult {
  archived: number;
  duplicates: number;
  importing: number;
}

interface PastBulletinUploadProps {
  onImport: (files: File[]) => Promise<PastBulletinImportResult>;
  onStatus: (status: { message: string; error?: boolean }) => void;
}

/** Sends printed past-bulletin PDFs for AI to read, reporting progress via onStatus. */
export async function importPastBulletins(
  files: File[],
  onImport: PastBulletinUploadProps['onImport'],
  onStatus: PastBulletinUploadProps['onStatus']
): Promise<void> {
  const names = files.map((f) => `「${f.name}」`).join('、');
  onStatus({ message: `正在上載 ${names}…` });
  try {
    const { importing, duplicates } = await onImport(files);
    onStatus({
      message:
        importing > 0
          ? `AI 正在讀取 ${importing} 份週刊，完成後會加入程序表清單。` +
            '如本主日／下主日的草稿已建立，可在右側「驗證提示」按「以新匯入的週刊重新建立」。'
          : duplicates > 0
            ? '這些週刊之前已上載並由 AI 讀取過，已在程序表清單（或已存檔）。'
            : '沒有需要 AI 讀取的週刊。',
    });
  } catch (err) {
    onStatus({
      message: `未能上載週刊：${err instanceof Error ? err.message : String(err)}`,
      error: true,
    });
  }
}

/** Upload printed past bulletins (e.g. last Sunday's 主日崇拜 PDF) for AI to turn into bulletins. */
export const PastBulletinUpload: React.FC<PastBulletinUploadProps> = ({ onImport, onStatus }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from<File>(e.target.files ?? []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    e.target.value = '';
    if (files.length > 0) void importPastBulletins(files, onImport, onStatus);
  };

  return (
    <label className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-100 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
      <Sparkles className="w-3.5 h-3.5" /> 上載過往週刊（AI 讀取）
      <input type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleFileChange} />
    </label>
  );
};
