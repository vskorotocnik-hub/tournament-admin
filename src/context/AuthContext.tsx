import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, getStoredTokens, storeTokens, clearTokens } from '../lib/api';
import type { AuthUser } from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const tokens = getStoredTokens();
      if (!tokens) {
        setUser(null);
        return;
      }
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    await refreshUser();
  };

  const logout = async () => {
    const tokens = getStoredTokens();
    if (tokens?.refreshToken) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch { /* игнорируем */ }
    }
    clearTokens();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
