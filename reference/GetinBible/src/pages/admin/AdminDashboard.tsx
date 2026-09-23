import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllModules } from '../../../services/moduleService';
import { getAllUsers } from '../../../services/userService';
import { supabase } from '../../../services/supabaseClient';

interface DashboardStats {
  totalModules: number;
  publishedModules: number;
  totalUsers: number;
  completionRate: number;
  loading: boolean;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalModules: 0,
    publishedModules: 0,
    totalUsers: 0,
    completionRate: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch modules
        const modules = await getAllModules();
        const publishedCount = modules.filter(m => m.status === 'published').length;

        // Fetch users (students only)
        const users = await getAllUsers();
        const studentCount = users.filter(u => u.role === 'student').length;

        // Fetch completion data
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('user_id, module_id, completed')
          .eq('completed', true);

        // Calculate completion rate
        let completionRate = 0;
        if (studentCount > 0 && publishedCount > 0 && progressData) {
          const totalPossibleCompletions = studentCount * publishedCount;
          const actualCompletions = progressData.length;
          completionRate = Math.round((actualCompletions / totalPossibleCompletions) * 100);
        }

        setStats({
          totalModules: modules.length,
          publishedModules: publishedCount,
          totalUsers: studentCount,
          completionRate,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">GetinBible 管理後台</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">總月課數</h3>
          <p className="text-3xl font-bold text-slate-800">
            {stats.loading ? (
              <span className="animate-pulse bg-slate-200 rounded w-12 h-8 inline-block"></span>
            ) : (
              stats.totalModules
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">已發布月課</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.loading ? (
              <span className="animate-pulse bg-slate-200 rounded w-12 h-8 inline-block"></span>
            ) : (
              stats.publishedModules
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">總學員數</h3>
          <p className="text-3xl font-bold text-slate-800">
            {stats.loading ? (
              <span className="animate-pulse bg-slate-200 rounded w-12 h-8 inline-block"></span>
            ) : (
              stats.totalUsers
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">完成率</h3>
          <p className="text-3xl font-bold text-amber-600">
            {stats.loading ? (
              <span className="animate-pulse bg-slate-200 rounded w-12 h-8 inline-block"></span>
            ) : (
              `${stats.completionRate}%`
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">快速連結</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/modules"
            className="block p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-800 mb-1">月課管理</h3>
            <p className="text-sm text-slate-600">建立、編輯、發布月課內容</p>
          </Link>
          <Link
            to="/admin/cycles"
            className="block p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-800 mb-1">季度管理</h3>
            <p className="text-sm text-slate-600">管理課程循環結構</p>
          </Link>
          <Link
            to="/admin/users"
            className="block p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-800 mb-1">使用者管理</h3>
            <p className="text-sm text-slate-600">管理學員與管理員</p>
          </Link>
          <Link
            to="/admin/analytics"
            className="block p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-800 mb-1">數據分析</h3>
            <p className="text-sm text-slate-600">查看學習進度與統計</p>
          </Link>
          <Link
            to="/admin/migrate"
            className="block p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-slate-800 mb-1">數據遷移</h3>
            <p className="text-sm text-slate-600">從常數遷移到資料庫</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
