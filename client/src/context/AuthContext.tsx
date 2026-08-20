import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionId: string;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionId(): string {
  let sid = localStorage.getItem('airlens-session');
  if (!sid) {
    sid = 'guest-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('airlens-session', sid);
  }
  return sid;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = getSessionId();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        return;
      }
      const { user: userData } = await authApi.me();
      setUser(userData);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { user: userData, accessToken } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const loginWithGoogle = async (credential: string) => {
    const { user: userData, accessToken } = await authApi.loginWithGoogle({ credential });
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const register = async (email: string, password: string, name?: string) => {
    const { user: userData, accessToken } = await authApi.register({ email, password, name });
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        sessionId,
        token: localStorage.getItem('accessToken'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
