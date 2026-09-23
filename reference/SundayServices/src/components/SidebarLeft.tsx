import React, { useState } from 'react';
import { ConfigurationRules, AutomationToggles, EditorialRole, ChurchService, TextBlock, RosterRow, RosterScheduleEntry, HymnLibraryEntry } from '../types/bulletin';
import { RefreshCw, CheckCircle2, Sliders, ShieldCheck, X, Download, Upload, FileSpreadsheet, CalendarClock, Music } from 'lucide-react';
import { ROLE_LABELS } from '../utils/workflow';
import { downloadBulletinBackup, readBulletinBackup } from '../utils/bulletinBackup';
import { parseBulletinExcelFile } from '../utils/parseBulletinExcel';
import { parseRosterScheduleFile } from '../utils/parseRosterSchedule';
import { parseWorshipSongsFile } from '../utils/parseWorshipSongs';

interface SidebarLeftProps {
  toggles: AutomationToggles;
  setToggles: React.Dispatch<React.SetStateAction<AutomationToggles>>;
  rules: ConfigurationRules;
  setRules: React.Dispatch<React.SetStateAction<ConfigurationRules>>;
  onRefreshSchedule: () => void;
  isRefreshing: boolean;
  currentRole: EditorialRole;
  onChangeRole: (role: EditorialRole) => void;
  isOpen: boolean;
  onClose: () => void;
  activeService: ChurchService;
  onImportExcel: (data: { hymnLyrics: TextBlock[]; serviceRoster: RosterRow[] }) => void;
  onRestoreBackup: (service: ChurchService) => void;
  onImportRosterSchedule: (entries: RosterScheduleEntry[]) => void;
  onImportWorshipSongs: (entries: HymnLibraryEntry[]) => void;
}

const ROLE_OPTIONS: EditorialRole[] = ['officer', 'pastor', 'deacon'];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  toggles,
  setToggles,
  rules,
  setRules,
  onRefreshSchedule,
  isRefreshing,
  currentRole,
  onChangeRole,
  isOpen,
  onClose,
  activeService,
  onImportExcel,
  onRestoreBackup,
  onImportRosterSchedule,
  onImportWorshipSongs,
}) => {
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [tempRules, setTempRules] = useState<ConfigurationRules>(rules);
  const [importStatus, setImportStatus] = useState<{ message: string; error?: boolean } | null>(null);

  const handleBackupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const service = await readBulletinBackup(file);
      onRestoreBackup(service);
      setImportStatus({ message: `已匯入備份：${service.title}` });
    } catch (err) {
      setImportStatus({ message: err instanceof Error ? err.message : '匯入失敗', error: true });
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await parseBulletinExcelFile(file);
      if (data.hymnLyrics.length === 0 && data.serviceRoster.length === 0) {
        setImportStatus({ message: '找不到可辨識的詩歌或事奉表內容，請檢查欄位標題。', error: true });
        return;
      }
      onImportExcel(data);
      setImportStatus({
        message: `已匯入 ${data.hymnLyrics.length} 首詩歌、${data.serviceRoster.length} 筆事奉資料`,
      });
    } catch {
      setImportStatus({ message: '無法讀取 Excel 檔案，請確認格式正確。', error: true });
    }
  };

  const handleRosterScheduleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const entries = await parseRosterScheduleFile(file);
      if (entries.length === 0) {
        setImportStatus({ message: '找不到可辨識的排班資料，請檢查日期／崗位／姓名欄位標題。', error: true });
        return;
      }
      onImportRosterSchedule(entries);
      const weekCount = new Set(entries.map((e) => e.date)).size;
      setImportStatus({
        message: `已匯入 ${entries.length} 筆事奉排班（涵蓋 ${weekCount} 個主日），已自動套用至現有及未來程序表`,
      });
    } catch {
      setImportStatus({ message: '無法讀取排班表，請確認 Excel 格式正確。', error: true });
    }
  };

  const handleWorshipSongsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const entries = await parseWorshipSongsFile(file);
      if (entries.length === 0) {
        setImportStatus({ message: '找不到可辨識的詩歌資料，請檢查欄位標題或 JSON 格式。', error: true });
        return;
      }
      onImportWorshipSongs(entries);
      setImportStatus({ message: `已匯入 ${entries.length} 首詩歌至詩歌庫` });
    } catch {
      setImportStatus({ message: '無法讀取詩歌庫檔案，請確認格式正確。', error: true });
    }
  };

  const toggleSwitch = (key: keyof AutomationToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    setRules(tempRules);
    setShowRuleModal(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col h-full select-none shrink-0 border-r border-slate-800 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0 lg:z-auto`}
      >
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-700 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center text-xs font-black text-white shadow-sm">
              B
            </div>
            BulletinPro AI
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            教會事工管理
          </p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-slate-400 hover:text-white shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Editorial Role Switcher (simulates staff login for the approval workflow) */}
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
            目前身份（審批流程示範）
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700/80">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                onClick={() => onChangeRole(role)}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  currentRole === role
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </section>

        {/* Bulletin Backup & Excel Import (officer only) */}
        {currentRole === 'officer' && (
          <section>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              週報備份與匯入
            </label>
            <div className="space-y-2">
              <button
                onClick={() => downloadBulletinBackup(activeService)}
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 py-2 rounded text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> 下載本週週報備份
              </button>

              <label className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> 上載週報備份（JSON）
                <input type="file" accept="application/json" className="hidden" onChange={handleBackupFileChange} />
              </label>

              <label className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5" /> 上載詩歌／事奉表（Excel）
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFileChange} />
              </label>

              <label className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
                <CalendarClock className="w-3.5 h-3.5" /> 上載事奉排班表（Excel）
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleRosterScheduleFileChange} />
              </label>

              <label className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 py-2 rounded text-xs font-semibold transition-colors cursor-pointer">
                <Music className="w-3.5 h-3.5" /> 上載詩歌庫（Excel／JSON）
                <input type="file" accept=".xlsx,.xls,.json" className="hidden" onChange={handleWorshipSongsFileChange} />
              </label>

              {importStatus && (
                <p className={`text-[11px] ${importStatus.error ? 'text-red-400' : 'text-green-400'}`}>
                  {importStatus.message}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Active Automation Toggles */}
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
            啟用中的自動化
          </label>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors">
              <span className="text-xs font-medium text-slate-200">詩歌選配</span>
              <button
                onClick={() => toggleSwitch('hymnSelection')}
                type="button"
                className={`w-8 h-4 rounded-full relative transition-colors focus:outline-none ${
                  toggles.hymnSelection ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    toggles.hymnSelection ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors">
              <span className="text-xs font-medium text-slate-200">事奉輪替</span>
              <button
                onClick={() => toggleSwitch('volunteerRotation')}
                type="button"
                className={`w-8 h-4 rounded-full relative transition-colors focus:outline-none ${
                  toggles.volunteerRotation ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    toggles.volunteerRotation ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors">
              <span className="text-xs font-medium text-slate-200">衝突檢查</span>
              <button
                onClick={() => toggleSwitch('conflictCheck')}
                type="button"
                className={`w-8 h-4 rounded-full relative transition-colors focus:outline-none ${
                  toggles.conflictCheck ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    toggles.conflictCheck ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Configuration Rules */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              設定規則
            </label>
            <button
              onClick={() => {
                setTempRules(rules);
                setShowRuleModal(true);
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" /> 編輯
            </button>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-xs text-slate-300 rule-border">
              <span className="block font-bold text-slate-100 mb-0.5">信息系列</span>
              {rules.sermonSeries}
            </div>

            <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-xs text-slate-300 rule-border">
              <span className="block font-bold text-slate-100 mb-0.5">詩歌風格</span>
              {rules.hymnStyle}
            </div>

            <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-xs text-slate-300 rule-border">
              <span className="block font-bold text-slate-100 mb-0.5">事奉衝突檢查</span>
              {rules.conflictCheck ? `已啟用（緩衝：${rules.bufferMinutes} 分鐘）` : '已停用'}
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Refresh Button */}
      <div className="p-6 bg-slate-950 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs opacity-80 mb-4 text-slate-300">
          <div
            className={`w-2 h-2 rounded-full ${
              isRefreshing ? 'bg-amber-400 animate-ping' : 'bg-green-500'
            }`}
          />
          <span className="text-[11px] font-medium">
            {isRefreshing ? '正在重新計算邏輯...' : '規則已是最新狀態'}
          </span>
        </div>
        <button
          onClick={onRefreshSchedule}
          disabled={isRefreshing}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-2.5 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '重新整理中...' : '重新整理排程'}
        </button>
      </div>

      {/* Configuration Rules Edit Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" /> 設定事工規則
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  當前信息系列名稱
                </label>
                <input
                  type="text"
                  value={tempRules.sermonSeries}
                  onChange={(e) =>
                    setTempRules((r) => ({ ...r, sermonSeries: e.target.value }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">詩歌風格偏好</label>
                <select
                  value={tempRules.hymnStyle}
                  onChange={(e) =>
                    setTempRules((r) => ({ ...r, hymnStyle: e.target.value }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="禮儀傳統詩歌">禮儀傳統詩歌</option>
                  <option value="當代敬拜讚美">當代敬拜讚美</option>
                  <option value="混合風格">混合風格</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="block font-semibold text-slate-200">事奉衝突檢查</span>
                  <span className="text-[11px] text-slate-400">標示連續事奉的排班</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempRules.conflictCheck}
                  onChange={(e) =>
                    setTempRules((r) => ({ ...r, conflictCheck: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  事奉崗位緩衝時間（分鐘）
                </label>
                <input
                  type="number"
                  value={tempRules.bufferMinutes}
                  onChange={(e) =>
                    setTempRules((r) => ({
                      ...r,
                      bufferMinutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min={5}
                  max={60}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold"
                >
                  儲存規則
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </aside>
    </>
  );
};
