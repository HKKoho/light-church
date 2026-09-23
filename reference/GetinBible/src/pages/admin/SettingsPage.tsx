import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getContentAnalysisSettings,
  saveContentAnalysisSettings,
} from '../../../services/settingsService';
import { ReportWordLimit, ContentAnalysisSettings } from '../../../types';

const WORD_LIMIT_OPTIONS: { value: ReportWordLimit; label: string; description: string }[] = [
  { value: 150, label: '150 字', description: '精簡報告 - 學習領域 + 基督教觀點' },
  { value: 250, label: '250 字', description: '簡潔報告 - 學習領域 + 基督教觀點' },
  { value: 400, label: '400 字', description: '適中報告 - 學習領域 + 基督教觀點' },
  { value: 700, label: '700 字', description: '詳細報告 - 執行摘要 + 學習領域 + 基督教觀點' },
  { value: 1000, label: '1000 字', description: '完整報告 - 執行摘要 + 學習領域 + 基督教觀點' },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ContentAnalysisSettings>({ wordLimit: 250, michaelEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getContentAnalysisSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const success = await saveContentAnalysisSettings(settings, user?.id);
      if (success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">系統設定</h1>
        <p className="text-slate-600 mt-1">配置應用程式的全域設定</p>
      </div>

      {/* Content Analysis Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">內容分析報告</h2>
            <p className="text-sm text-slate-500">設定 AI 分析報告的字數限制</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            報告字數限制
          </label>
          {WORD_LIMIT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                settings.wordLimit === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="wordLimit"
                value={option.value}
                checked={settings.wordLimit === option.value}
                onChange={(e) => setSettings({ ...settings, wordLimit: Number(e.target.value) as ReportWordLimit })}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    settings.wordLimit === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300'
                  }`}>
                    {settings.wordLimit === option.value && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span className="font-medium text-slate-800">{option.label}</span>
                  {option.value >= 700 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      含執行摘要
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 ml-8">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">報告結構說明</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li><span className="font-medium">150-400 字：</span>學習領域 + 基督教觀點（2個部分）</li>
            <li><span className="font-medium">700-1000 字：</span>執行摘要 + 學習領域 + 基督教觀點（3個部分）</li>
          </ul>
        </div>

        {/* Last Updated */}
        {settings.updatedAt && (
          <p className="text-xs text-slate-400 mt-4">
            上次更新：{new Date(settings.updatedAt).toLocaleString('zh-TW')}
          </p>
        )}
      </div>

      {/* Michael AI Assistant Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <span className="text-xl">👨‍🏫</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Michael AI 助教</h2>
            <p className="text-sm text-slate-500">設定 AI 學習助教的顯示狀態</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <p className="font-medium text-slate-800">啟用 Michael 助教</p>
            <p className="text-sm text-slate-500 mt-1">
              在學習頁面顯示 AI 助教對話功能
            </p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, michaelEnabled: !settings.michaelEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.michaelEnabled !== false ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.michaelEnabled !== false ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
              saving
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已儲存
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
