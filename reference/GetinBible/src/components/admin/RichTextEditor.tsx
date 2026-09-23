import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  helpText?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '輸入內容...',
  label,
  rows = 12,
  helpText
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm resize-y"
      />

      {helpText && (
        <p className="text-xs text-slate-500 mt-1">{helpText}</p>
      )}

      <div className="text-xs text-slate-400 flex items-center space-x-4">
        <span>支援格式化文字：</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">【標題】</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">「引用」</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">● 項目符號</span>
      </div>

      <div className="text-right text-sm text-slate-400">
        {value.length} 字元
      </div>
    </div>
  );
};

export default RichTextEditor;
