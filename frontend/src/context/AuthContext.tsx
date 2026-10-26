import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('durga_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('durga_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Verify token validity with /auth/me
    authApi
      .getProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('durga_user', JSON.stringify(profile));
      })
      .catch(() => {
        localStorage.removeItem('durga_token');
        localStorage.removeItem('durga_user');
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth_logout', handleLogout);
    return () => window.removeEventListener('auth_logout', handleLogout);
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await authApi.login(credentials);
    localStorage.setItem('durga_token', res.accessToken);
    localStorage.setItem('durga_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('durga_token');
      localStorage.removeItem('durga_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
