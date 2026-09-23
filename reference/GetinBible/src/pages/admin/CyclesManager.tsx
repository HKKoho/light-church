import React, { useState, useEffect } from 'react';
import { getAllCycles, createCycle, updateCycle, deleteCycle, getAllModules } from '../../../services/moduleService';
import { Cycle } from '../../../types';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/Toast';

const CyclesManager: React.FC = () => {
  const { showToast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<number | null>(null);
  const [moduleCount, setModuleCount] = useState<Record<number, number>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sort_order: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cyclesData, modulesData] = await Promise.all([
        getAllCycles(),
        getAllModules()
      ]);
      setCycles(cyclesData);

      // Count modules per cycle
      const counts: Record<number, number> = {};
      modulesData.forEach(module => {
        counts[module.cycleId] = (counts[module.cycleId] || 0) + 1;
      });
      setModuleCount(counts);
    } catch (err) {
      console.error('Failed to load cycles:', err);
      showToast('載入資料失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingCycle(null);
    setFormData({
      title: '',
      description: '',
      sort_order: cycles.length + 1
    });
  };

  const handleEdit = (cycle: Cycle) => {
    setIsCreating(false);
    setEditingCycle(cycle);
    setFormData({
      title: cycle.title,
      description: cycle.description,
      sort_order: cycles.findIndex(c => c.id === cycle.id) + 1
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('請輸入循環標題', 'warning');
      return;
    }

    try {
      if (isCreating) {
        await createCycle(formData);
        showToast('循環建立成功！', 'success');
      } else if (editingCycle) {
        await updateCycle(editingCycle.id, formData);
        showToast('循環更新成功！', 'success');
      }
      setIsCreating(false);
      setEditingCycle(null);
      loadData();
    } catch (err) {
      console.error('Failed to save cycle:', err);
      showToast('儲存失敗，請稍後再試', 'error');
    }
  };

  const handleDelete = (id: number) => {
    setCycleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (cycleToDelete === null) return;

    try {
      await deleteCycle(cycleToDelete);
      setCycles(cycles.filter(c => c.id !== cycleToDelete));
      setDeleteDialogOpen(false);
      setCycleToDelete(null);
      showToast('循環刪除成功！', 'success');
    } catch (err) {
      console.error('Failed to delete cycle:', err);
      showToast('刪除失敗。請確保該循環沒有關聯的月課。', 'error');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingCycle(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">季度管理</h1>
        {!isCreating && !editingCycle && (
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增循環
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingCycle) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {isCreating ? '建立新循環' : '編輯循環'}
          </h2>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                循環標題 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例：第一循環：世界是否值得信任？"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="循環描述..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                排序順序
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                min="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                儲存
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cycles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                順序
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                標題
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                月課數量
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {cycles.map((cycle, index) => (
              <tr key={cycle.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  {cycle.title}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {cycle.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {moduleCount[cycle.id] || 0} 個月課
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(cycle)}
                    className="text-amber-600 hover:text-amber-900 transition-colors"
                  >
                    編輯
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleDelete(cycle.id)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="確認刪除循環"
        message="確定要刪除此循環嗎？如果該循環有關聯的月課，刪除將會失敗。"
        confirmLabel="刪除"
        cancelLabel="取消"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCycleToDelete(null);
        }}
      />
    </div>
  );
};

export default CyclesManager;
