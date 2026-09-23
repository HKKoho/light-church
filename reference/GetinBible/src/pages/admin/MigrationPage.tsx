import React, { useState, useEffect } from 'react';
import { runMigration, validateMigration, rollbackMigration, MigrationReport, checkExistingData, ExistingDataCheck } from '../../../services/migrationService';
import { useToast } from '../../components/admin/Toast';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

const MigrationPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [existingData, setExistingData] = useState<ExistingDataCheck | null>(null);
  const [forceChecked, setForceChecked] = useState(false);

  // Check for existing data on mount
  useEffect(() => {
    checkExistingData().then(setExistingData);
  }, []);

  const handleClickMigration = () => {
    // Show dialog if data exists, otherwise run directly
    if (existingData?.hasData) {
      setShowMigrationDialog(true);
      setForceChecked(false);
    } else {
      handleRunMigration(false);
    }
  };

  const handleRunMigration = async (forceOverwrite: boolean) => {
    setLoading(true);
    setReport(null);
    setShowMigrationDialog(false);

    try {
      showToast('開始遷移數據...', 'info');
      const result = await runMigration(forceOverwrite);
      setReport(result);

      if (result.success) {
        showToast('遷移成功完成！', 'success');
        // Refresh existing data check
        checkExistingData().then(setExistingData);
      } else {
        showToast('遷移失敗或被取消', 'error');
      }
    } catch (error: any) {
      showToast(`遷移失敗: ${error.message}`, 'error');
      console.error('Migration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    setLoading(true);

    try {
      showToast('驗證數據...', 'info');
      const result = await validateMigration();
      setReport(result);

      if (result.success) {
        showToast('驗證通過！', 'success');
      } else {
        showToast('驗證發現問題', 'warning');
      }
    } catch (error: any) {
      showToast(`驗證失敗: ${error.message}`, 'error');
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    setLoading(true);
    setShowRollbackDialog(false);

    try {
      showToast('開始回滾數據...', 'info');
      await rollbackMigration();
      setReport(null);
      showToast('回滾完成', 'success');
    } catch (error: any) {
      showToast(`回滾失敗: ${error.message}`, 'error');
      console.error('Rollback error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">數據遷移</h1>
      <p className="text-slate-600 mb-8">
        從 constants.ts 遷移課程數據到 Supabase 數據庫
      </p>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Run Migration */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">執行遷移</h3>
              <p className="text-sm text-slate-600 mb-4">
                將所有循環和月課從代碼遷移到數據庫
              </p>
              <button
                onClick={handleClickMigration}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '處理中...' : '開始遷移'}
              </button>
              {existingData?.hasData && (
                <div className="mt-2 text-xs text-red-600 font-semibold">
                  ⚠️ 數據庫已有內容
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validate */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">驗證數據</h3>
              <p className="text-sm text-slate-600 mb-4">
                檢查數據庫中的數據完整性
              </p>
              <button
                onClick={handleValidation}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '驗證中...' : '驗證'}
              </button>
            </div>
          </div>
        </div>

        {/* Rollback */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">回滾數據</h3>
              <p className="text-sm text-slate-600 mb-4">
                刪除所有已遷移的數據（危險）
              </p>
              <button
                onClick={() => setShowRollbackDialog(true)}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                回滾
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Report */}
      {report && (
        <div className={`bg-white rounded-lg shadow p-6 ${report.success ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-500'}`}>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
            {report.success ? (
              <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            遷移報告
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded p-4">
              <div className="text-sm text-slate-600 mb-1">循環已遷移</div>
              <div className="text-2xl font-bold text-slate-800">{report.cyclesMigrated}</div>
            </div>
            <div className="bg-slate-50 rounded p-4">
              <div className="text-sm text-slate-600 mb-1">月課已遷移</div>
              <div className="text-2xl font-bold text-slate-800">{report.modulesMigrated}</div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">錯誤訊息:</h3>
              <div className="bg-red-50 rounded p-3 max-h-60 overflow-y-auto">
                {report.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.success && (
            <div className="mt-4 text-sm text-green-700 bg-green-50 rounded p-3">
              ✓ 所有數據已成功遷移並驗證！
            </div>
          )}
        </div>
      )}

      {/* Existing Data Warning */}
      {existingData?.hasData && (
        <div className="mt-8 bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="h-8 w-8 text-red-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-3">⚠️ 警告：數據庫已有內容！</h3>
              <div className="space-y-2 text-sm text-red-800 mb-4">
                {existingData.warnings.map((warning, idx) => (
                  <div key={idx}>{warning}</div>
                ))}
              </div>
              <div className="bg-white rounded p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">月課數量 / Modules:</span>
                  <span className="font-semibold">{existingData.modulesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">人生問題 / Life Questions:</span>
                  <span className="font-semibold">{existingData.lifeQuestionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">觀點 / Perspectives:</span>
                  <span className="font-semibold">{existingData.perspectivesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">討論提示 / Discussion Prompts:</span>
                  <span className="font-semibold">{existingData.discussionPromptsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">遷移說明</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• 遷移將從 constants.ts 讀取所有課程數據</li>
          <li>• 包括 4 個學習循環和 24 個課程月課</li>
          <li>• 每個月課包含：生命課題、三個觀點（箴言、傳道書、約伯記）、張力引導和討論提示</li>
          <li>• <strong className="text-red-600">如果數據庫已有內容，舊數據將被刪除並替換為 constants.ts 中的內容</strong></li>
          <li>• 遷移後請執行驗證以確保數據完整</li>
          <li className="text-red-600 font-semibold">• 回滾操作將刪除所有遷移的數據，請謹慎使用</li>
        </ul>
      </div>

      {/* Migration Warning Dialog */}
      {showMigrationDialog && existingData?.hasData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-200 bg-red-50">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-2xl font-bold text-red-900">
                  🚨 危險操作警告 / DANGER WARNING
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  數據庫中已存在以下內容，將會被永久刪除：
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>月課數量 / Modules:</span>
                    <span className="font-semibold text-red-600">{existingData.modulesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>人生問題 / Life Questions:</span>
                    <span className="font-semibold text-red-600">{existingData.lifeQuestionsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>觀點 / Perspectives:</span>
                    <span className="font-semibold text-red-600">{existingData.perspectivesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>討論提示 / Discussion Prompts:</span>
                    <span className="font-semibold text-red-600">{existingData.discussionPromptsCount}</span>
                  </div>
                  {existingData.lastModified && (
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span>最後編輯 / Last Modified:</span>
                      <span className="font-semibold">{new Date(existingData.lastModified).toLocaleString('zh-TW')}</span>
                    </div>
                  )}
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-red-900 mb-2">後果 / Consequences:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>❌ 所有您在管理介面編輯的內容將被刪除</li>
                    <li>❌ All content you edited in the admin interface will be deleted</li>
                    <li>❌ 這些數據將被 constants.ts 中的舊數據替換</li>
                    <li>❌ Data will be replaced with old data from constants.ts</li>
                    <li>❌ <strong>此操作無法撤銷！ / This cannot be undone!</strong></li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ 您應該只在以下情況執行此操作：</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>✓ 您想要放棄所有編輯，回到原始數據</li>
                    <li>✓ You want to discard all edits and go back to original data</li>
                    <li>✓ 您已經備份了重要數據</li>
                    <li>✓ You have backed up important data</li>
                  </ul>
                </div>

                <label className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={forceChecked}
                    onChange={(e) => setForceChecked(e.target.checked)}
                    className="mt-1 h-5 w-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-slate-900">
                    我理解此操作的風險，並確認要刪除所有現有數據
                    <br />
                    <span className="text-slate-600">
                      I understand the risks and confirm I want to delete all existing data
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMigrationDialog(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                >
                  取消 / Cancel
                </button>
                <button
                  onClick={() => handleRunMigration(true)}
                  disabled={!forceChecked}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  確認刪除並遷移 / Confirm Delete & Migrate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRollbackDialog}
        title="確認回滾"
        message="這將刪除所有已遷移的循環、月課和相關數據。此操作無法撤銷！"
        confirmLabel="確認回滾"
        cancelLabel="取消"
        onConfirm={handleRollback}
        onCancel={() => setShowRollbackDialog(false)}
        type="danger"
      />
    </div>
  );
};

export default MigrationPage;
