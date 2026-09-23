import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: '儀表板', icon: '📊' },
    { path: '/admin/modules', label: '月課管理', icon: '📚' },
    { path: '/admin/cycles', label: '季度管理', icon: '🔄' },
    { path: '/admin/users', label: '使用者管理', icon: '👥' },
    { path: '/admin/analytics', label: '數據分析', icon: '📈' },
    { path: '/admin/michael-digital-twin', label: 'Michael 數位分身', icon: '🤖' },
    { path: '/admin/settings', label: '系統設定', icon: '⚙️' },
    { path: '/admin/migrate', label: '數據遷移', icon: '🔧' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-amber-400">GetinBible</h1>
          <p className="text-sm text-slate-400 mt-1">內容管理</p>
        </div>
        <nav className="mt-6">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center px-6 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span className="mr-3">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">
                管理員
              </span>
              <span className="text-slate-700 font-medium">{user?.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-sm text-slate-600 hover:text-amber-600 transition-colors"
              >
                查看學員介面
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-600 hover:text-amber-600 transition-colors underline"
              >
                登出
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
