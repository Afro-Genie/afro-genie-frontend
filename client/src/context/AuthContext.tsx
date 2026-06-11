import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'ARTIST';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const ACCESS_TOKEN_KEY = 'afrogenie.accessToken';
const REFRESH_TOKEN_KEY = 'afrogenie.refreshToken';
const USER_KEY = 'afrogenie.user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStorage = <T,>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const writeAuthStorage = (auth: AuthResponse) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(auth.accessToken));
  localStorage.setItem(REFRESH_TOKEN_KEY, JSON.stringify(auth.refreshToken));
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
};

const clearAuthStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const decodeJwtExp = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  const applyAuth = useCallback((auth: AuthResponse) => {
    setUser(auth.user);
    setAccessToken(auth.accessToken);
    setRefreshToken(auth.refreshToken);
    writeAuthStorage(auth);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    clearAuthStorage();
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      return false;
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const task = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          clearAuth();
          return false;
        }

        const auth = (await response.json()) as AuthResponse;
        applyAuth(auth);
        return true;
      } catch {
        clearAuth();
        return false;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = task;
    return task;
  }, [applyAuth, clearAuth, refreshToken]);

  const scheduleAutoRefresh = useCallback(
    (token: string) => {
      const exp = decodeJwtExp(token);
      if (!exp) {
        return 0;
      }

      const expiresAt = exp * 1000;
      const msUntilRefresh = Math.max(expiresAt - Date.now() - 60_000, 0);
      return window.setTimeout(() => {
        void refreshSession();
      }, msUntilRefresh);
    },
    [refreshSession]
  );

  useEffect(() => {
    const storedAccessToken = readStorage<string>(ACCESS_TOKEN_KEY);
    const storedRefreshToken = readStorage<string>(REFRESH_TOKEN_KEY);
    const storedUser = readStorage<AuthUser>(USER_KEY);

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(storedUser);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const timeoutId = scheduleAutoRefresh(accessToken);
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [accessToken, scheduleAutoRefresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const auth = (await response.json()) as AuthResponse;
      applyAuth(auth);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!response.ok) {
        throw new Error('Register failed');
      }

      const auth = (await response.json()) as AuthResponse;
      applyAuth(auth);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }
    } finally {
      clearAuth();
    }
  }, [clearAuth, refreshToken]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);

      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      let response = await fetch(input, {
        ...init,
        headers
      });

      if (response.status === 401 && refreshToken) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          return response;
        }

        const latestAccessToken = readStorage<string>(ACCESS_TOKEN_KEY);
        const retryHeaders = new Headers(init?.headers);
        if (latestAccessToken) {
          retryHeaders.set('Authorization', `Bearer ${latestAccessToken}`);
        }

        response = await fetch(input, {
          ...init,
          headers: retryHeaders
        });
      }

      return response;
    },
    [accessToken, refreshSession, refreshToken]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      loading,
      login,
      register,
      logout,
      refreshSession,
      authFetch
    }),
    [accessToken, authFetch, loading, login, logout, refreshSession, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
