import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllModules, getAllCycles, deleteModule, updateModuleStatus } from '../../../services/moduleService';
import { FullModule, Cycle, ModuleStatus } from '../../../types';
import BibleBookTable from '../../components/admin/BibleBookTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/Toast';

const BibleBooksManager: React.FC = () => {
  const { showToast } = useToast();
  const [modules, setModules] = useState<FullModule[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all');
  const [cycleFilter, setCycleFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modulesData, cyclesData] = await Promise.all([
        getAllModules(),
        getAllCycles()
      ]);
      setModules(modulesData);
      setCycles(cyclesData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setModuleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (moduleToDelete === null) return;

    try {
      await deleteModule(moduleToDelete);
      setModules(modules.filter(m => m.id !== moduleToDelete));
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
      showToast('月課已成功刪除', 'success');
    } catch (err) {
      console.error('Failed to delete module:', err);
      showToast('刪除失敗，請稍後再試', 'error');
    }
  };

  const handleStatusChange = async (id: number, newStatus: ModuleStatus) => {
    try {
      await updateModuleStatus(id, newStatus);
      setModules(modules.map(m =>
        m.id === id ? { ...m, status: newStatus } : m
      ));
      showToast('狀態已更新', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('更新狀態失敗，請稍後再試', 'error');
    }
  };

  // Apply filters
  const filteredModules = modules.filter(module => {
    if (statusFilter !== 'all' && module.status !== statusFilter) return false;
    if (cycleFilter !== 'all' && module.cycleId !== cycleFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        module.title.toLowerCase().includes(query) ||
        module.subtitle.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">月課管理</h1>
        <Link
          to="/admin/modules/new"
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          建立新月課
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">總月課數</p>
          <p className="text-2xl font-bold text-slate-800">{modules.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">已發布</p>
          <p className="text-2xl font-bold text-green-600">
            {modules.filter(m => m.status === 'published').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">草稿</p>
          <p className="text-2xl font-bold text-gray-600">
            {modules.filter(m => m.status === 'draft').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">已封存</p>
          <p className="text-2xl font-bold text-orange-600">
            {modules.filter(m => m.status === 'archived').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              搜尋
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋標題或副標題..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              狀態篩選
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ModuleStatus | 'all')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
              <option value="archived">已封存</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              循環篩選
            </label>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">全部循環</option>
              {cycles.map(cycle => (
                <option key={cycle.id} value={cycle.id}>{cycle.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <BibleBookTable
        modules={filteredModules}
        cycles={cycles}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="確認刪除月課"
        message="確定要刪除此月課嗎？此操作無法復原，所有相關資料（問題、觀點、討論提示）都會被刪除。"
        confirmLabel="刪除"
        cancelLabel="取消"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setModuleToDelete(null);
        }}
      />
    </div>
  );
};

export default BibleBooksManager;
