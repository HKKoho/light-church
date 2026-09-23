import React from 'react';
import { Link } from 'react-router-dom';
import { FullModule, Cycle } from '../../../types';
import StatusBadge from './StatusBadge';

interface BibleBookTableProps {
  modules: FullModule[];
  cycles: Cycle[];
  onDelete: (id: number) => void;
  onStatusChange: (id: number, newStatus: 'draft' | 'published' | 'archived') => void;
}

const BibleBookTable: React.FC<BibleBookTableProps> = ({
  modules,
  cycles,
  onDelete,
  onStatusChange
}) => {
  const getCycleName = (cycleId: number) => {
    return cycles.find(c => c.id === cycleId)?.title || `循環 ${cycleId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (modules.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-500 mb-4">尚無月課</p>
        <Link
          to="/admin/modules/new"
          className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          建立第一個月課
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              標題
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              循環
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              狀態
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              更新時間
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {modules.map((module) => (
            <tr key={module.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                {module.id}
              </td>
              <td className="px-6 py-4 text-sm text-slate-900">
                <div>
                  <div className="font-medium">{module.title.split('｜')[1] || module.title}</div>
                  <div className="text-slate-500 text-xs mt-1">{module.subtitle}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {getCycleName(module.cycleId)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={module.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {formatDate(module.updatedAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Link
                  to={`/admin/modules/${module.id}`}
                  className="text-amber-600 hover:text-amber-900 transition-colors"
                >
                  編輯
                </Link>
                <span className="text-slate-300">|</span>
                <div className="relative inline-block group">
                  <button className="text-blue-600 hover:text-blue-900 transition-colors">
                    狀態
                  </button>
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => onStatusChange(module.id, 'draft')}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      草稿
                    </button>
                    <button
                      onClick={() => onStatusChange(module.id, 'published')}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      已發布
                    </button>
                    <button
                      onClick={() => onStatusChange(module.id, 'archived')}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      已封存
                    </button>
                  </div>
                </div>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => onDelete(module.id)}
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
  );
};

export default BibleBookTable;
