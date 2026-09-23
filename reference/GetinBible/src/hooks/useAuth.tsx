import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../types';
import { findOrCreateUser, verifyPassword, setStudentPassword } from '../../services/userService';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (name: string, password?: string) => Promise<void>;
  setupPassword: (password: string, email?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('wisdom_prism_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.id) {
          // Re-fetch from database to sync role and other data
          findOrCreateUser(parsed.name)
            .then(dbUser => {
              setUser({
                id: dbUser.id,
                name: dbUser.name,
                role: dbUser.role,
                loginTime: new Date(dbUser.lastLogin),
                createdAt: dbUser.createdAt,
                lastLogin: dbUser.lastLogin
              });
            })
            .catch(err => {
              console.error('Failed to restore user:', err);
              // Fallback to local storage data
              setUser({ ...parsed, loginTime: new Date(parsed.loginTime) });
            })
            .finally(() => setLoading(false));
        } else {
          setUser({ ...parsed, loginTime: new Date(parsed.loginTime) });
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse user data');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (name: string, password?: string) => {
    try {
      // If password provided, verify it first
      if (password) {
        const result = await verifyPassword(name, password);
        if (!result.valid) {
          throw new Error('密碼不正確');
        }
      }

      const dbUser = await findOrCreateUser(name);
      const newUser: User = {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        loginTime: new Date(dbUser.lastLogin),
        createdAt: dbUser.createdAt,
        lastLogin: dbUser.lastLogin,
        email: dbUser.email,
        hasPassword: dbUser.hasPassword
      };

      console.log('Login successful:', {
        name: newUser.name,
        role: newUser.role,
        isAdmin: newUser.role === 'admin',
        id: newUser.id
      });

      setUser(newUser);
      // Always update localStorage with latest data from database
      localStorage.setItem('wisdom_prism_user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const setupPassword = async (password: string, email?: string) => {
    if (!user) throw new Error('Not logged in');
    await setStudentPassword(user.id, password, email);
    const updatedUser = { ...user, hasPassword: true, email: email || user.email };
    setUser(updatedUser);
    localStorage.setItem('wisdom_prism_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wisdom_prism_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, setupPassword, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
