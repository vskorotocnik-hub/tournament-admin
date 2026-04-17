import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, getStoredTokens, storeTokens, clearTokens, isTwoFactorChallenge } from '../lib/api';
import type { AuthUser } from '../lib/api';

export interface TwoFactorChallenge {
  pending2faToken: string;
  username: string;
}

interface LoginResult {
  challenge?: TwoFactorChallenge;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** User has ANY staff role (ADMIN or MODERATOR) — allowed into the panel. */
  isStaff: boolean;
  /** User is a full ADMIN — allowed to mutate ledger / config / roles. */
  isAdmin: boolean;
  /**
   * MODERATOR role — granted read-only + moderation actions (ban, resolve).
   * Exposed as a dedicated flag so UI can swap affordances (hide balance
   * buttons, show an amber ribbon, etc.) rather than sniffing `user.role`
   * in every page.
   */
  isModerator: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2fa: (pending2faToken: string, code: string) => Promise<void>;
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await authApi.login({ email, password });
    if (isTwoFactorChallenge(res)) {
      return {
        challenge: {
          pending2faToken: res.pending2faToken,
          username: res.user.username,
        },
      };
    }
    storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    await refreshUser();
    return {};
  };

  const verify2fa = async (pending2faToken: string, code: string) => {
    const res = await authApi.loginVerify2fa({ pending2faToken, code });
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
  const isModerator = user?.role === 'MODERATOR';
  const isStaff = isAdmin || isModerator;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isStaff,
        isAdmin,
        isModerator,
        loading,
        login,
        verify2fa,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
