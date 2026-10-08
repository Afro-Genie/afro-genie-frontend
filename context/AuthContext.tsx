import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  authApi,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAuthRefreshFn,
} from "../services/api";
import { toApiUrl } from "../lib/apiBase";
import { clearAllAuthData } from "../lib/fallbacks";
import { useBalanceStream, BalanceUpdateEvent } from "../hooks/useBalanceStream";

interface AuthUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
}

interface UserProfile {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "user" | "admin" | "moderator" | "artist";
  createdAt?: any;
  lastLogin?: any;
  artistProfile?: {
    stageName: string;
    genre: string;
    bio: string;
    location?: string;
    website?: string;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
    };
    verified: boolean;
    verifiedAt?: any;
  };
}

type BackendRole = "USER" | "ADMIN" | "ARTIST" | "MODERATOR" | "ARBITER";

const mapRole = (role: string): "user" | "admin" | "moderator" | "artist" => {
  const mapping: Record<string, "user" | "admin" | "moderator" | "artist"> = {
    USER: "user",
    ADMIN: "admin",
    MODERATOR: "moderator",
    ARBITER: "moderator",
    ARTIST: "artist",
  };
  return mapping[role] || "user";
};

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  balance: number | null;
  balanceStatus: "idle" | "connecting" | "open" | "error";
  lastBalanceEvent: BalanceUpdateEvent | null;
  refreshBalance: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signUpAsArtist: (
    email: string,
    password: string,
    artistData: {
      stageName: string;
      genre: string;
      bio: string;
      location?: string;
      website?: string;
      socialLinks?: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
        youtube?: string;
      };
      photoURL?: string;
    },
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
  isAdmin: boolean;
  isArtist: boolean;
  isModerator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const buildUser = (data: {
  id: string;
  email: string;
  displayName: string;
  role: string;
}): AuthUser => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: data.role,
});

const buildProfile = (data: {
  id: string;
  email: string;
  displayName: string;
  role: string;
}): UserProfile => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: mapRole(data.role),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { balance, status: balanceStatus, lastEvent: lastBalanceEvent, refresh: refreshBalance } = useBalanceStream(
    user?.id ?? null,
  );

  const initFromAuthResult = useCallback(
    (authResult: {
      user: {
        id: string;
        email: string;
        displayName: string;
        role: string;
      };
      accessToken: string;
      refreshToken: string;
    }) => {
      setTokens(authResult.accessToken, authResult.refreshToken);
      setUser(buildUser(authResult.user));
      setUserProfile(buildProfile(authResult.user));
    },
    [],
  );

  // Inject the token refresh function into api.ts so all API helpers
  // (songsApi, artistsApi, etc.) use the same refresh logic as authFetch.
  // This is the single source of truth for token refresh.
  useEffect(() => {
    setAuthRefreshFn(async () => {
      try {
        const storedRefresh = getRefreshToken();
        if (!storedRefresh) return false;
        const result = await authApi.refresh(storedRefresh);
        initFromAuthResult(result);
        return true;
      } catch {
        clearTokens();
        setUser(null);
        setUserProfile(null);
        window.dispatchEvent(new Event("auth:expired"));
        return false;
      }
    });

    return () => setAuthRefreshFn(null);
  }, [initFromAuthResult]);

  useEffect(() => {
    const init = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const accessTokenParam = params.get("accessToken");
        const refreshTokenParam = params.get("refreshToken");
        const userId = params.get("userId");
        const email = params.get("email");
        const displayName = params.get("displayName");
        const role = params.get("role");

        if (accessTokenParam && refreshTokenParam && userId) {
          setTokens(accessTokenParam, refreshTokenParam);
          const authUser = {
            id: userId,
            email: email || "",
            displayName: displayName || email?.split("@")[0] || "User",
            role: role || "USER",
          };
          setUser(buildUser(authUser));
          setUserProfile(buildProfile(authUser));
          window.history.replaceState(
            {},
            document.title,
            window.location.origin + "/",
          );
          setLoading(false);
          return;
        }

        const storedRefresh = getRefreshToken();
        if (storedRefresh) {
          try {
            const result = await authApi.refresh(storedRefresh);
            initFromAuthResult(result);
          } catch {
            clearTokens();
          }
        }
      } catch {
        clearTokens();
      }
      setLoading(false);
    };

    init();
  }, [initFromAuthResult]);

  const signIn = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    initFromAuthResult(result);

    if (result.user.role === 'ARTIST') {
      window.location.href = '/artist';
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const result = await authApi.register(email, password, displayName);
    initFromAuthResult(result);
  };

  const signUpAsArtist = async (
    email: string,
    password: string,
    artistData: {
      stageName: string;
      genre: string;
      bio: string;
      location?: string;
      website?: string;
      socialLinks?: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
        youtube?: string;
      };
      photoURL?: string;
    },
  ) => {
    const result = await authApi.registerArtist({
      email,
      password,
      stageName: artistData.stageName,
      genre: artistData.genre,
      bio: artistData.bio,
      location: artistData.location,
      website: artistData.website,
      socialLinks: artistData.socialLinks,
      photoURL: artistData.photoURL,
    });
    initFromAuthResult(result);

    if (result.user.role === 'ARTIST') {
      window.location.href = '/artist';
    }
  };

  const signInWithGoogle = async () => {
    window.location.href = authApi.getGoogleUrl();
  };

  const signInAnonymously = async () => {
    console.warn("Anonymous sign-in is not available with the current backend");
    throw new Error("Anonymous sign-in is not available");
  };

  const logout = async () => {
    try {
      const storedRefresh = getRefreshToken();
      if (storedRefresh) {
        await authApi.logout(storedRefresh).catch(() => {});
      }
    } finally {
      // Clear all auth-related data (JWT + OAuth session keys)
      clearAllAuthData();
      clearTokens();
      setUser(null);
      setUserProfile(null);
    }
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const buildHeaders = () => {
      const nextHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      if (options.body && !nextHeaders["Content-Type"]) {
        nextHeaders["Content-Type"] = "application/json";
      }

      const token = getAccessToken();
      if (token) {
        nextHeaders["Authorization"] = `Bearer ${token}`;
      }

      return nextHeaders;
    };

    let headers = buildHeaders();
    let res = await fetch(toApiUrl(url), {
      ...options,
      headers,
    });

    if (res.status === 401) {
      let refreshed = false;
      const storedRefresh = getRefreshToken();
      if (storedRefresh) {
        try {
          const result = await authApi.refresh(storedRefresh);
          initFromAuthResult(result);
          refreshed = true;
        } catch {
          refreshed = false;
        }
      }

      if (!refreshed) {
        clearTokens();
        setUser(null);
        setUserProfile(null);
        window.dispatchEvent(new Event("auth:expired"));
        throw new Error("Session expired. Please sign in again.");
      }

      headers = buildHeaders();
      res = await fetch(toApiUrl(url), {
        ...options,
        headers,
      });
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Request failed" }));
      const sanitize = (val: unknown) =>
        typeof val === "string" ? val.replace(/[<>"'`]/g, "") : "Request failed";
      throw new Error(sanitize(body.error) || sanitize(body.message) || "Request failed");
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  };

  const isAdmin = userProfile?.role === "admin";
  const isArtist = userProfile?.role === "artist";
  const isModerator = userProfile?.role === "moderator" || userProfile?.role === "admin";

  const value = {
    user,
    userProfile,
    loading,
    balance,
    balanceStatus,
    lastBalanceEvent,
    refreshBalance,
    signIn,
    signUp,
    signUpAsArtist,
    signInWithGoogle,
    signInAnonymously,
    logout,
    authFetch,
    isAdmin,
    isArtist,
    isModerator,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
