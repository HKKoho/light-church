import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './src/hooks/useAuth';
import { ToastProvider } from './src/components/admin/Toast';
import StudentRoutes from './src/routes/StudentRoutes';
import AdminRoutes from './src/routes/AdminRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/*" element={<StudentRoutes />} />
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;