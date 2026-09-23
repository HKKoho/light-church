import React from 'react';
import { StudentAnalysisOverview, CycleAnalysis } from '../../../types';

interface ValueAnalysisTableProps {
  students: StudentAnalysisOverview[];
  onViewReport: (userId: string, cycleId: number) => void;
  onRegenerateReport: (userId: string, cycleId: number) => void;
  isRegenerating: { userId: string; cycleId: number } | null;
}

const ValueAnalysisTable: React.FC<ValueAnalysisTableProps> = ({
  students,
  onViewReport,
  onRegenerateReport,
  isRegenerating
}) => {
  const getCycleStatus = (analysis?: CycleAnalysis) => {
    if (!analysis) {
      return { text: '未生成', color: 'text-slate-400', bgColor: 'bg-slate-100' };
    }
    // Check if partial
    if (analysis.isPartial) {
      return {
        text: `部分 (${analysis.modulesCompleted}/6)`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }
    if (analysis.studentViewed) {
      return { text: '已查看', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    return { text: '已生成', color: 'text-amber-600', bgColor: 'bg-amber-100' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-500">尚無學員資料</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
              學員名稱
            </th>
            {[1, 2, 3, 4].map(cycleNum => (
              <th
                key={cycleNum}
                className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                循環 {cycleNum}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {students.map(student => (
            <tr key={student.userId} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white">
                {student.userName}
              </td>
              {[1, 2, 3, 4].map(cycleNum => {
                const analysis = student[`cycle${cycleNum}` as keyof typeof student] as CycleAnalysis | undefined;
                const status = getCycleStatus(analysis);
                const isCurrentlyRegenerating =
                  isRegenerating?.userId === student.userId &&
                  isRegenerating?.cycleId === cycleNum;

                return (
                  <td key={cycleNum} className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}>
                        {status.text}
                      </span>

                      {/* Date (if exists) */}
                      {analysis && (
                        <span className="text-xs text-slate-400">
                          {formatDate(analysis.generatedAt)}
                        </span>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-1">
                        {analysis && (
                          <button
                            onClick={() => onViewReport(student.userId, cycleNum)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            title="查看分析報告"
                          >
                            查看
                          </button>
                        )}
                        <button
                          onClick={() => onRegenerateReport(student.userId, cycleNum)}
                          disabled={isCurrentlyRegenerating}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            isCurrentlyRegenerating
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : analysis
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title={
                            analysis?.isPartial
                              ? '重新生成（可能仍是部分分析）'
                              : analysis
                              ? '重新生成完整分析'
                              : '生成分析報告'
                          }
                        >
                          {isCurrentlyRegenerating ? (
                            <span className="flex items-center">
                              <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              生成中
                            </span>
                          ) : analysis?.isPartial ? (
                            '更新部分'
                          ) : analysis ? (
                            '重新生成'
                          ) : (
                            '生成'
                          )}
                        </button>
                      </div>

                      {/* Regeneration count (if > 1) */}
                      {analysis && analysis.regeneratedCount > 1 && (
                        <span className="text-xs text-slate-400">
                          第 {analysis.regeneratedCount} 次
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Footer */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
        <div className="flex justify-between items-center text-sm text-slate-600">
          <span>
            共 {students.length} 位學員
          </span>
          <span>
            已生成分析：
            {students.reduce((sum, s) =>
              sum + [s.cycle1, s.cycle2, s.cycle3, s.cycle4].filter(Boolean).length, 0
            )} / {students.length * 4}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ValueAnalysisTable;
