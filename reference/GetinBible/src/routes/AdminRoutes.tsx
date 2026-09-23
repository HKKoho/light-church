import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import BibleBooksManager from '../pages/admin/BibleBooksManager';
import BibleBookEditor from '../pages/admin/BibleBookEditor';
import CyclesManager from '../pages/admin/CyclesManager';
import UsersManager from '../pages/admin/UsersManager';
import AnalyticsView from '../pages/admin/AnalyticsView';
import MichaelDigitalTwin from '../pages/admin/MichaelDigitalTwin';
import MigrationPage from '../pages/admin/MigrationPage';
import SettingsPage from '../pages/admin/SettingsPage';
import ErrorBoundary from '../components/ErrorBoundary';

const AdminRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="modules" element={<BibleBooksManager />} />
          <Route path="modules/new" element={<BibleBookEditor />} />
          <Route path="modules/:id" element={<BibleBookEditor />} />
          <Route path="cycles" element={<CyclesManager />} />
          <Route path="users" element={<UsersManager />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="michael-digital-twin" element={<MichaelDigitalTwin />} />
          <Route path="migrate" element={<MigrationPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default AdminRoutes;
