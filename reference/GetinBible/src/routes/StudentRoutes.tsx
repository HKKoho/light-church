import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Login from '../../components/Login';
import StudentHome from '../pages/student/StudentHome';
import LearningReflection from '../pages/student/LearningReflection';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/admin/Toast';
import ErrorBoundary from '../components/ErrorBoundary';

const StudentRoutes: React.FC = () => {
  const { user, login, setupPassword } = useAuth();
  const { showToast } = useToast();

  const handleLogin = async (name: string, password?: string) => {
    try {
      await login(name, password);
    } catch (error: any) {
      console.error('Login failed:', error);
      showToast(error.message || '登入失敗，請檢查網路連線', 'error');
      throw error;
    }
  };

  const handleSetupPassword = async (password: string, email?: string) => {
    try {
      await setupPassword(password, email);
    } catch (error) {
      console.error('Password setup failed:', error);
      showToast('密碼設定失敗', 'error');
    }
  };

  const handleLogout = () => {
    // Logout logic handled through useAuth in Layout component if needed
  };

  return (
    <ErrorBoundary>
      <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} onSetupPassword={handleSetupPassword} />
        }
      />
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Layout onHomeClick={() => window.location.reload()}>
              <div className="mb-6 flex justify-between items-center text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                    學員
                  </span>
                  <span className="font-medium text-slate-600">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('wisdom_prism_user');
                    window.location.reload();
                  }}
                  className="hover:text-amber-600 transition-colors underline"
                >
                  登出 / 更換學員
                </button>
              </div>
              <StudentHome />
            </Layout>
          )
        }
      />
      <Route
        path="/reflection"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Layout onHomeClick={() => window.location.reload()}>
              <div className="mb-6 flex justify-between items-center text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                    學員
                  </span>
                  <span className="font-medium text-slate-600">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('wisdom_prism_user');
                    window.location.reload();
                  }}
                  className="hover:text-amber-600 transition-colors underline"
                >
                  登出 / 更換學員
                </button>
              </div>
              <LearningReflection />
            </Layout>
          )
        }
      />
      </Routes>
    </ErrorBoundary>
  );
};

export default StudentRoutes;
