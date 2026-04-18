import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, getStoredTokens, storeTokens, clearTokens, isTwoFactorChallenge, ApiError } from '../lib/api';
import type { AuthUser } from '../lib/api';

/**
 * When the server refuses a staff session because the caller's IP is
 * not on the approved whitelist, every admin page would otherwise
 * cascade-fire GETs that each return 403 and spam the DevTools
 * console. We capture the block state here and render a dedicated
 * screen in `App.tsx`, so no page component ever mounts in a
 * half-broken state.
 */
export interface IpBlockState {
  ip: string;
  status: 'PENDING' | 'REJECTED' | 'UNKNOWN';
  message: string;
}

function isIpBlock(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'IP_NOT_APPROVED';
}

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
  /**
   * Fine-grained permission check. ADMIN is always a wildcard (returns true
   * for everything). MODERATOR returns true only if the capability string is
   * present in `user.capabilities`. Non-staff always returns false.
   */
  hasCapability: (cap: string) => boolean;
  /**
   * OWNER flag — single super-user defined by the OWNER_USER_ID env var on
   * the server. Only the owner can manage the IP whitelist (approve new
   * staff IPs, revoke access). ADMINs are NOT automatically owners.
   */
  isOwner: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2fa: (pending2faToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /**
   * Populated when the current session is blocked by the staff IP
   * whitelist (server returns 403 `IP_NOT_APPROVED`). `App.tsx` renders
   * a dedicated screen when this is non-null so downstream pages don't
   * even try to fetch data.
   */
  ipBlock: IpBlockState | null;
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
  const [ipBlock, setIpBlock] = useState<IpBlockState | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const tokens = getStoredTokens();
      if (!tokens) {
        setUser(null);
        setIpBlock(null);
        return;
      }
      const res = await authApi.me();
      setUser(res.user);
      setIpBlock(null);
    } catch (err) {
      if (isIpBlock(err)) {
        // Don't wipe tokens — the session is valid, just blocked by IP.
        // Keeping tokens lets the user retry as soon as the owner
        // approves the whitelist entry without a fresh login.
        const p = err.payload || {};
        setIpBlock({
          ip: String(p.ip || 'unknown'),
          status: (p.status as IpBlockState['status']) || 'UNKNOWN',
          message:
            typeof p.message === 'string'
              ? p.message
              : 'Ваш IP не одобрен. Обратитесь к владельцу.',
        });
        setUser(null);
        return;
      }
      setUser(null);
      setIpBlock(null);
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
  const isOwner = !!user?.isOwner;

  const hasCapability = useCallback((cap: string) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // wildcard
    if (user.role !== 'MODERATOR') return false;
    return (user.capabilities ?? []).includes(cap);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isStaff,
        isAdmin,
        isModerator,
        isOwner,
        hasCapability,
        loading,
        login,
        verify2fa,
        logout,
        refreshUser,
        ipBlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
