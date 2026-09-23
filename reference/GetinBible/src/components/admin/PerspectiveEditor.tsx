import React from 'react';
import { PerspectiveType, ScripturePoint } from '../../../types';

interface PerspectiveEditorProps {
  perspectives: Record<PerspectiveType, ScripturePoint>;
  onChange: (perspectives: Record<PerspectiveType, ScripturePoint>) => void;
  moduleTitle?: string;
}

const PerspectiveEditor: React.FC<PerspectiveEditorProps> = ({
  perspectives,
  onChange,
  moduleTitle
}) => {
  const handleChange = (type: PerspectiveType, field: keyof ScripturePoint, value: string) => {
    onChange({
      ...perspectives,
      [type]: {
        ...perspectives[type],
        [field]: value
      }
    });
  };

  const type = PerspectiveType.ORDER;

  return (
    <div className="space-y-6">
      <label className="block text-xl font-bold text-slate-800 mb-4">
        書卷主題和概要
      </label>

      <div className="max-w-2xl">
        <div className="border-2 border-amber-200 rounded-lg overflow-hidden bg-amber-50">
          {/* Header - Bible Book Title */}
          <div className="bg-amber-100 text-amber-800 px-4 py-3 font-semibold text-lg">
            {moduleTitle || '請先輸入月課標題'}
          </div>

          {/* Fields */}
          <div className="p-4 space-y-6 bg-white">
            {/* 經卷主題 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  經卷主題
                </label>
                <span className="text-xs text-slate-400">簡短主題標題</span>
              </div>
              <input
                type="text"
                value={perspectives[type].theme}
                onChange={(e) => handleChange(type, 'theme', e.target.value)}
                placeholder="輸入經卷主題，例如：智慧與敬畏神"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* 經卷概要 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  經卷概要
                </label>
                <span className="text-xs text-slate-400">300字以內</span>
              </div>
              <textarea
                value={perspectives[type].description}
                onChange={(e) => handleChange(type, 'description', e.target.value)}
                placeholder="輸入經卷概要內容..."
                rows={10}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                {perspectives[type].description.length} 字元
              </p>
            </div>

            {/* 估計寫作目的 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  估計寫作目的
                </label>
                <span className="text-xs text-slate-400">供參考</span>
              </div>
              <textarea
                value={perspectives[type].writingPurpose || ''}
                onChange={(e) => handleChange(type, 'writingPurpose', e.target.value)}
                placeholder="輸入估計寫作目的..."
                rows={5}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                {(perspectives[type].writingPurpose || '').length} 字元
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerspectiveEditor;
