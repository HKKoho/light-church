import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getAllUserAnalyses,
  markAnalysisAsViewed
} from '../../../services/analysisService';
import { CycleAnalysisListItem } from '../../../types';
import AudioNarration from '../../../components/AudioNarration';

const LearningReflection: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<CycleAnalysisListItem[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<CycleAnalysisListItem | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalyses();
    }
  }, [user]);

  const loadAnalyses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getAllUserAnalyses(user.id);
      setAnalyses(data);
    } catch (err) {
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = async (item: CycleAnalysisListItem) => {
    if (!user || !item.analysis) return;

    setSelectedCycle(item);

    // Mark as viewed (only if not already viewed)
    if (!item.analysis.studentViewed) {
      try {
        await markAnalysisAsViewed(user.id, item.cycleId);
        await loadAnalyses(); // Refresh to update viewed status
      } catch (err) {
        console.error('Failed to mark as viewed:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Detail View (when viewing a specific analysis)
  if (selectedCycle && selectedCycle.analysis) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
        {/* Back Button */}
        <button
          onClick={() => setSelectedCycle(null)}
          className="mb-6 text-amber-700 hover:text-amber-800 flex items-center gap-2 transition-colors group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回列表
        </button>

        {/* Analysis Report Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {selectedCycle.cycleTitle}
            </h1>
            <p className="text-amber-100 text-sm">
              生成於 {new Date(selectedCycle.analysis.generatedAt).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="prose prose-lg prose-slate max-w-none">
              {/* Icon and title */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="bg-amber-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-0">你的靈性成長分析</h2>
                  <p className="text-sm text-slate-500 mb-0">
                    基於本循環{selectedCycle.analysis.isPartial
                      ? `${selectedCycle.analysis.modulesCompleted}個月課`
                      : '6個月課'}的學習回應
                  </p>
                </div>
              </div>

              {/* Partial Analysis Warning */}
              {selectedCycle.analysis.isPartial && (
                <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-orange-800 mb-1">部分分析報告</h3>
                      <p className="text-xs text-orange-700">
                        這份分析基於你已完成的 <strong>{selectedCycle.analysis.modulesCompleted}/6</strong> 個月課。
                        完成整個循環後，你將獲得更完整、更深入的靈性成長分析！
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Text */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
                <div className="flex justify-end mb-4">
                  <AudioNarration text={selectedCycle.analysis.analysisText} />
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                  {selectedCycle.analysis.analysisText}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-400 text-center italic">
                  這份分析報告由 AI 基於你的學習回應生成，旨在幫助你看見自己的靈性成長軌跡。
                  <br />
                  願你在智慧的道路上持續前行，「敬畏耶和華是智慧的開端」。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View (default)
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">我的學習反思</h1>
        <p className="text-slate-600">
          查看你在每個學習循環的靈性成長分析報告
        </p>
      </div>

      {/* Analysis Cards Grid */}
      <div className="space-y-4">
        {analyses.map(item => {
          const isAvailable = item.analysisExists;
          const isNew = isAvailable && !item.analysis?.studentViewed;

          return (
            <div
              key={item.cycleId}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden ${
                isAvailable ? 'cursor-pointer' : 'opacity-75'
              }`}
              onClick={() => isAvailable && handleViewAnalysis(item)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  {/* Left: Title and Status */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Cycle Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                        isAvailable ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-slate-300'
                      }`}>
                        {item.cycleId}
                      </div>

                      {/* Title */}
                      <div>
                        <h2 className="text-xl font-semibold text-slate-800">
                          {item.cycleTitle}
                        </h2>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="ml-15 flex items-center gap-2">
                      {isAvailable ? (
                        <>
                          {/* Partial indicator */}
                          {item.analysis?.isPartial && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              部分分析 ({item.analysis.modulesCompleted}/6)
                            </span>
                          )}
                          {/* New/Read status */}
                          {isNew && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              新報告
                            </span>
                          )}
                          {!isNew && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              已閱讀
                            </span>
                          )}
                          <span className="text-sm text-slate-500">
                            {new Date(item.analysis!.generatedAt).toLocaleDateString('zh-TW', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          尚未完成此循環
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: View Button */}
                  {isAvailable && (
                    <div className="flex items-center">
                      <button
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                      >
                        查看報告
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Border Effect */}
              {isAvailable && (
                <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {analyses.every(a => !a.analysisExists) && (
        <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 mt-8">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 mb-2">尚無學習反思報告</p>
          <p className="text-sm text-slate-400">
            完成每個循環的6個月課後，系統會自動生成你的學習分析報告
          </p>
        </div>
      )}
    </div>
  );
};

export default LearningReflection;
