import React from 'react';
import { CycleAnalysis } from '../../../types';

interface AnalysisReportModalProps {
  analysis: CycleAnalysis;
  userName: string;
  cycleTitle: string;
  onClose: () => void;
}

const AnalysisReportModal: React.FC<AnalysisReportModalProps> = ({
  analysis,
  userName,
  cycleTitle,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {userName} - {cycleTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  生成時間：{formatDate(analysis.generatedAt)}
                </span>
                {analysis.regeneratedCount > 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    第 {analysis.regeneratedCount} 次生成
                  </span>
                )}
                {analysis.isPartial && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    部分分析 ({analysis.modulesCompleted}/6 月課，{analysis.completionPercentage}%)
                  </span>
                )}
                {analysis.studentViewed ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    學員已查看
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    學員未查看
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="關閉"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="prose prose-slate max-w-none">
            {/* Partial Analysis Warning */}
            {analysis.isPartial && (
              <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-orange-800 mb-1">部分分析報告</h3>
                    <p className="text-xs text-orange-700">
                      此報告基於學員完成的 <strong>{analysis.modulesCompleted}/6</strong> 個月課（{analysis.completionPercentage}%）。
                      這是初步分析，學員完成整個循環後可重新生成完整報告。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Text */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-6">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
                {analysis.analysisText}
              </div>
            </div>

            {/* AI Information */}
            <div className="text-sm text-slate-500 space-y-2">
              <div className="flex items-center">
                <span className="font-medium w-24">AI 模型：</span>
                <span>{analysis.aiModel}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-24">字數：</span>
                <span>{analysis.analysisText.length} 字</span>
              </div>
              {analysis.tokenCount && (
                <div className="flex items-center">
                  <span className="font-medium w-24">Token 使用：</span>
                  <span>~{analysis.tokenCount.toLocaleString()} tokens (約 ${(analysis.tokenCount / 1000000 * 6).toFixed(4)})</span>
                </div>
              )}
              {analysis.generationDurationMs && (
                <div className="flex items-center">
                  <span className="font-medium w-24">生成時長：</span>
                  <span>{formatDuration(analysis.generationDurationMs)}</span>
                </div>
              )}
              {analysis.studentViewed && analysis.studentViewedAt && (
                <div className="flex items-center">
                  <span className="font-medium w-24">查看時間：</span>
                  <span>{formatDate(analysis.studentViewedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-lg flex justify-between items-center">
          <div className="text-xs text-slate-500">
            ID: {analysis.id.substring(0, 8)}... |
            建立於 {formatDate(analysis.createdAt)}
            {analysis.updatedAt !== analysis.createdAt && (
              <> | 更新於 {formatDate(analysis.updatedAt)}</>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReportModal;
