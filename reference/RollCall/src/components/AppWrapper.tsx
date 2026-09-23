'use client';

import { useState, useEffect } from 'react';
import RollCallSystem from '@/components/RollCallSystem';
import Auth from '@/components/Auth';

const AppWrapper: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user was previously authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (status: boolean) => {
    setIsAuthenticated(status);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <RollCallSystem onLogout={handleLogout} />
      )}
    </div>
  );
};

export default AppWrapper;
