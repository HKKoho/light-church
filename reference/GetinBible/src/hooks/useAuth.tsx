import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../types';
import { getUserById, setOwnPassword, signIn } from '../../services/userService';
import { getSessionToken, SESSION_STORAGE_KEY } from '../../services/supabaseClient';

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

  const saveSession = (sessionUser: User, token: string) => {
    setUser(sessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...sessionUser, token }));
  };

  // Restore the session from localStorage on mount. Sessions without a valid
  // token (expired, or saved by the old browser-side login) sign out.
  useEffect(() => {
    const token = getSessionToken();
    let saved: { id?: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    } catch {
      saved = null;
    }
    if (!token || !saved?.id) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setLoading(false);
      return;
    }
    // Re-fetch from the database to sync role and other data
    getUserById(saved.id)
      .then((dbUser) => {
        if (!dbUser) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }
        saveSession(
          {
            id: dbUser.id,
            name: dbUser.name,
            role: dbUser.role,
            loginTime: new Date(dbUser.lastLogin),
            createdAt: dbUser.createdAt,
            lastLogin: dbUser.lastLogin,
            email: dbUser.email,
            hasPassword: dbUser.hasPassword,
          },
          token,
        );
      })
      .catch((err) => console.error('Failed to restore user:', err))
      .finally(() => setLoading(false));
  }, []);

  const login = async (name: string, password?: string) => {
    // Password check and account creation happen on the server.
    const { user: dbUser, token } = await signIn(name, password);
    saveSession(
      {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        loginTime: new Date(dbUser.lastLogin),
        createdAt: dbUser.createdAt,
        lastLogin: dbUser.lastLogin,
        email: dbUser.email,
        hasPassword: dbUser.hasPassword,
      },
      token,
    );
  };

  const setupPassword = async (password: string, email?: string) => {
    const token = getSessionToken();
    if (!user || !token) throw new Error('Not logged in');
    const dbUser = await setOwnPassword(token, password, email);
    saveSession({ ...user, hasPassword: true, email: dbUser.email ?? user.email }, token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
