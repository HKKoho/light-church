import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole, deleteUser } from '../../../services/userService';
import { getUserProgress } from '../../../services/progressService';
import { UserRole } from '../../../types';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/Toast';

interface UserWithProgress {
  id: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  completedCount?: number;
}

const UsersManager: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProgress | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersData = await getAllUsers();

      // Load progress for each user
      const usersWithProgress = await Promise.all(
        usersData.map(async (user) => {
          try {
            const progress = await getUserProgress(user.id);
            return { ...user, completedCount: progress.length };
          } catch {
            return { ...user, completedCount: 0 };
          }
        })
      );

      setUsers(usersWithProgress);
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('載入使用者失敗', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (user: UserWithProgress) => {
    setSelectedUser(user);
    setNewRole(user.role === 'admin' ? 'student' : 'admin');
    setRoleChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      await updateUserRole(selectedUser.id, newRole);
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      setRoleChangeDialog(false);
      setSelectedUser(null);
      showToast('角色更新成功！', 'success');
    } catch (err) {
      console.error('Failed to update role:', err);
      showToast('更新角色失敗', 'error');
    }
  };

  const handleDelete = (user: UserWithProgress) => {
    setSelectedUser(user);
    setDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setDeleteDialog(false);
      setSelectedUser(null);
      showToast('使用者刪除成功！', 'success');
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('刪除使用者失敗', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Apply filters
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (searchQuery) {
      return user.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    students: users.filter(u => u.role === 'student').length
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
      <h1 className="text-3xl font-bold text-slate-800">使用者管理</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">總使用者數</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">管理員</p>
          <p className="text-2xl font-bold text-amber-600">{stats.admins}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-500">學員</p>
          <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              搜尋
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋使用者名稱..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              角色篩選
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">全部角色</option>
              <option value="student">學員</option>
              <option value="admin">管理員</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                使用者名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                角色
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                完成月課數
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                建立時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                最後登入
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{user.id.substring(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? '管理員' : '學員'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {user.completedCount || 0} 個
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(user.lastLogin)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleRoleChange(user)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    切換角色
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            沒有符合條件的使用者
          </div>
        )}
      </div>

      {/* Role Change Dialog */}
      <ConfirmDialog
        isOpen={roleChangeDialog}
        title="確認變更角色"
        message={`確定要將 ${selectedUser?.name} 的角色從「${selectedUser?.role === 'admin' ? '管理員' : '學員'}」變更為「${newRole === 'admin' ? '管理員' : '學員'}」嗎？`}
        confirmLabel="確認變更"
        cancelLabel="取消"
        type="warning"
        onConfirm={confirmRoleChange}
        onCancel={() => {
          setRoleChangeDialog(false);
          setSelectedUser(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog}
        title="確認刪除使用者"
        message={`確定要刪除使用者「${selectedUser?.name}」嗎？此操作將同時刪除該使用者的所有進度和回應記錄，無法復原。`}
        confirmLabel="刪除"
        cancelLabel="取消"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialog(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default UsersManager;
