import React, { useState, useEffect } from 'react';
import {
  getOverallStats,
  getModuleCompletionStats,
  getCycleCompletionStats,
  getAllUserProgress,
  getRecentActivity,
  OverallStats,
  ModuleCompletionStat,
  CycleCompletionStat,
  UserProgressDetail
} from '../../../services/analyticsService';
import {
  getAllStudentsAnalyses,
  generateCycleAnalysis,
  getCycleAnalysis
} from '../../../services/analysisService';
import { StudentAnalysisOverview, CycleAnalysis } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { useToast } from '../../components/admin/Toast';
import ValueAnalysisTable from '../../components/admin/ValueAnalysisTable';
import AnalysisReportModal from '../../components/admin/AnalysisReportModal';

const AnalyticsView: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [moduleStats, setModuleStats] = useState<ModuleCompletionStat[]>([]);
  const [cycleStats, setCycleStats] = useState<CycleCompletionStat[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgressDetail[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    userName: string;
    moduleTitle: string;
    completedAt: string;
  }>>([]);

  // Analysis state
  const [analysisData, setAnalysisData] = useState<StudentAnalysisOverview[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    analysis: CycleAnalysis;
    userName: string;
    cycleTitle: string;
  } | null>(null);
  const [regenerating, setRegenerating] = useState<{ userId: string; cycleId: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overall, modules, cycles, users, recent, analyses] = await Promise.all([
        getOverallStats(),
        getModuleCompletionStats(),
        getCycleCompletionStats(),
        getAllUserProgress(),
        getRecentActivity(10),
        getAllStudentsAnalyses()
      ]);

      setOverallStats(overall);
      setModuleStats(modules);
      setCycleStats(cycles);
      setUserProgress(users);
      setRecentActivity(recent);
      setAnalysisData(analyses);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      showToast('載入數據失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Analysis handlers
  const handleViewReport = async (userId: string, cycleId: number) => {
    const student = analysisData.find(s => s.userId === userId);
    const analysis = student?.[`cycle${cycleId}` as keyof typeof student] as CycleAnalysis | undefined;

    if (analysis) {
      const { data: cycles } = await supabase
        .from('cycles')
        .select('title')
        .eq('id', cycleId)
        .single();

      setSelectedAnalysis({
        analysis,
        userName: student.userName,
        cycleTitle: cycles?.title || `循環 ${cycleId}`
      });
    }
  };

  const handleRegenerateReport = async (userId: string, cycleId: number) => {
    setRegenerating({ userId, cycleId });
    try {
      await generateCycleAnalysis(userId, cycleId);
      showToast(`成功生成循環 ${cycleId} 分析報告`, 'success');
      await loadData(); // Refresh data
    } catch (err: any) {
      console.error('Failed to generate analysis:', err);
      showToast(err.message || '生成失敗，請稍後再試', 'error');
    } finally {
      setRegenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const maxModuleCompletion = Math.max(...moduleStats.map(m => m.completionCount), 1);
  const maxCycleCompletion = Math.max(...cycleStats.map(c => c.completionCount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">數據分析</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          重新整理
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-slate-500 mb-2">總學員數</p>
          <p className="text-3xl font-bold text-slate-800">{overallStats?.totalStudents || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-slate-500 mb-2">已發布月課</p>
          <p className="text-3xl font-bold text-green-600">{overallStats?.publishedModules || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-slate-500 mb-2">總完成次數</p>
          <p className="text-3xl font-bold text-amber-600">{overallStats?.totalCompletions || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-slate-500 mb-2">平均完成率</p>
          <p className="text-3xl font-bold text-blue-600">{overallStats?.averageCompletionRate || 0}%</p>
        </div>
      </div>

      {/* Module Completion Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">月課完成統計</h2>
        <div className="space-y-3">
          {moduleStats.slice(0, 10).map((module) => (
            <div key={module.moduleId}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-slate-700 truncate">
                  {module.moduleTitle}
                </span>
                <span className="text-sm font-semibold text-slate-900 ml-2">
                  {module.completionCount} ({module.uniqueUsers} 人)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all"
                  style={{ width: `${(module.completionCount / maxModuleCompletion) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cycle Completion */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">循環完成統計</h2>
          <div className="space-y-3">
            {cycleStats.map((cycle) => (
              <div key={cycle.cycleId}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-700">{cycle.cycleTitle}</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {cycle.completionCount}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(cycle.completionCount / maxCycleCompletion) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">最近活動</h2>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-slate-500 text-sm">尚無活動記錄</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                  <div className="flex-1">
                    <p className="text-slate-700">
                      <span className="font-medium">{activity.userName}</span> 完成了
                    </p>
                    <p className="text-slate-500 text-xs truncate">{activity.moduleTitle}</p>
                  </div>
                  <span className="text-slate-400 text-xs ml-2 whitespace-nowrap">
                    {formatDate(activity.completedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Progress Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">學員進度</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  學員名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  完成月課數
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  完成率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  最後活動
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {userProgress.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    尚無學員進度資料
                  </td>
                </tr>
              ) : (
                userProgress.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{user.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.completedModules.length} 個
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${user.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {user.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(user.lastActivity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Value System Analysis Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">價值觀發展分析</h2>
          <p className="text-sm text-slate-500 mt-1">
            AI 生成的學員靈性成長與聖經世界觀對齊分析報告
          </p>
        </div>
        <ValueAnalysisTable
          students={analysisData}
          onViewReport={handleViewReport}
          onRegenerateReport={handleRegenerateReport}
          isRegenerating={regenerating}
        />
      </div>

      {/* Analysis Report Modal */}
      {selectedAnalysis && (
        <AnalysisReportModal
          analysis={selectedAnalysis.analysis}
          userName={selectedAnalysis.userName}
          cycleTitle={selectedAnalysis.cycleTitle}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  );
};

export default AnalyticsView;
