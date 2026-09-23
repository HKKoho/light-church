'use client';

import { useState, useEffect } from 'react';
import RollCallSystem from '@/components/RollCallSystem';
import Auth from '@/components/Auth';

// ... rest of AppWrapper code ...
const AppWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        // Add any additional initialization logic here
        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
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
