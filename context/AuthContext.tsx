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
import {
  spotifyAuthService,
  SpotifyUserProfile,
  SpotifyTokenResponse,
} from "../services/spotifyAuthService";
import { toApiUrl } from "../lib/apiBase";
import { clearAllAuthData } from "../lib/fallbacks";

interface AuthUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  spotifyId?: string | null;
  spotifyProduct?: string | null;
}

interface UserProfile {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "user" | "admin" | "moderator" | "artist";
  spotifyId?: string | null;
  spotifyProduct?: string | null;
  createdAt?: any;
  lastLogin?: any;
  spotifyTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
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

type BackendRole = "USER" | "ADMIN" | "ARTIST" | "MODERATOR";

const mapRole = (role: string): "user" | "admin" | "moderator" | "artist" => {
  const mapping: Record<string, "user" | "admin" | "moderator" | "artist"> = {
    USER: "user",
    ADMIN: "admin",
    MODERATOR: "moderator",
    ARTIST: "artist",
  };
  return mapping[role] || "user";
};

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
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
  signInWithSpotify: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
  isAdmin: boolean;
  isArtist: boolean;
  isSpotifyPremium: boolean;
  refreshSpotifyProduct: () => Promise<void>;
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
  spotifyId?: string | null;
  spotifyProduct?: string | null;
}): AuthUser => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: data.role,
  spotifyId: data.spotifyId ?? null,
  spotifyProduct: data.spotifyProduct ?? null,
});

const buildProfile = (data: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  spotifyId?: string | null;
  spotifyProduct?: string | null;
}): UserProfile => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: mapRole(data.role),
  spotifyId: data.spotifyId ?? null,
  spotifyProduct: data.spotifyProduct ?? null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const initFromAuthResult = useCallback(
    (authResult: {
      user: {
        id: string;
        email: string;
        displayName: string;
        role: string;
        spotifyProduct?: string | null;
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

        const spotifyCode = params.get("code");
        const spotifyState = params.get("state");
        const spotifyError = params.get("error");
        const spotifyErrorDesc = params.get("error_description");

        if (spotifyError) {
          console.error(
            "[Auth] Spotify OAuth error:",
            spotifyError,
            spotifyErrorDesc,
          );
          window.history.replaceState(
            {},
            document.title,
            window.location.origin + "/",
          );
          setLoading(false);
          return;
        }

        if (spotifyCode) {
          // Clear URL immediately to prevent StrictMode double-exchange
          window.history.replaceState(
            {},
            document.title,
            window.location.origin + "/",
          );

          console.log(
            "[Auth] Spotify OAuth callback received, exchanging code...",
          );
          try {
            const spotifyAuthResult =
              await spotifyAuthService.exchangeCodeForToken(
                spotifyCode,
                spotifyState,
              );
            spotifyAuthService.storeTokens(spotifyAuthResult);

            const isLinkAction = spotifyAuthResult.stateData?.action === "link";

            if (isLinkAction) {
              // Link flow: user is already logged in, just link the Spotify account
              console.log("[Auth] Spotify link flow...");
              try {
                const linkResult = await authApi.linkSpotify(
                  spotifyAuthResult.access_token,
                );
                setUser((prev) =>
                  prev
                    ? {
                        ...prev,
                        spotifyId: "linked",
                        spotifyProduct: linkResult.spotifyProduct,
                      }
                    : prev,
                );
                setUserProfile((prev) =>
                  prev
                    ? {
                        ...prev,
                        spotifyId: "linked",
                        spotifyProduct: linkResult.spotifyProduct,
                      }
                    : prev,
                );
                console.log("[Auth] Spotify account linked successfully");
              } catch (linkErr) {
                console.error("[Auth] Spotify link error:", linkErr);
              }
            } else {
              // Normal sign-in flow
              console.log("[Auth] Spotify sign-in flow, calling backend...");
              const authResult = await authApi.signInWithSpotify(
                spotifyAuthResult.access_token,
              );
              initFromAuthResult(authResult);
              console.log(
                "[Auth] Spotify sign-in successful, user:",
                authResult.user.email,
              );
            }

            const redirectAfterAuth = sessionStorage.getItem(
              "spotify_redirect_after_auth",
            );
            sessionStorage.removeItem("spotify_redirect_after_auth");

            if (redirectAfterAuth) {
              try {
                const targetUrl = new URL(
                  redirectAfterAuth,
                  window.location.origin,
                );
                if (
                  (targetUrl.protocol === "https:" ||
                    targetUrl.protocol === "http:") &&
                  targetUrl.origin === window.location.origin
                ) {
                  window.location.replace(targetUrl.toString());
                  return;
                }
              } catch {
                // Invalid URL — ignore and fall through
              }
            }
          } catch (err: any) {
            console.error(
              "[Auth] Spotify auth callback error:",
              err?.message || err,
            );
            // Show user-friendly error for common issues
            if (err?.message?.includes("Redirect URI mismatch")) {
              console.error(
                "[Auth] REDIRECT URI MISMATCH — Check that your Spotify Developer Dashboard has the correct URI registered.",
              );
              console.error(
                "[Auth] Expected redirect URI:",
                spotifyAuthService.getRedirectUri(),
              );
            }
          }
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

  // Sync Spotify premium status on mount, when token refreshes, and when
  // the SDK signals a token refresh (via custom event from WebPlaybackContext).
  // Only runs for users who actually have a linked Spotify account.
  useEffect(() => {
    if (!userProfile?.id || !userProfile?.spotifyId) return;

    const syncSpotify = async () => {
      const spotifyToken = spotifyAuthService.getStoredAccessToken();
      if (!spotifyToken) return;

      // If Spotify token is expired or about to expire, refresh and re-check product
      if (spotifyAuthService.isTokenExpiringSoon()) {
        try {
          const result = await spotifyAuthService.refreshAndFetchProduct();
          await authApi.syncSpotifyProduct(result.accessToken).catch(() => {});
          if (result.product !== undefined) {
            setUserProfile((prev) =>
              prev ? { ...prev, spotifyProduct: result.product } : prev,
            );
            setUser((prev) =>
              prev ? { ...prev, spotifyProduct: result.product } : prev,
            );
          }
        } catch {
          // Non-fatal: premium status will be re-checked on next login
        }
      } else {
        // Token is still valid — just sync current product status to backend
        try {
          await authApi.syncSpotifyProduct(spotifyToken);
        } catch {
          // Non-fatal
        }
      }
    };

    syncSpotify();

    // Re-check product when the SDK signals a token refresh
    const onSdkTokenRefreshed = () => {
      const token = spotifyAuthService.getStoredAccessToken();
      if (!token) return;
      spotifyAuthService.getUserProfile(token)
        .then((profile) => {
          const product = profile.product ?? null;
          setUserProfile((prev) =>
            prev ? { ...prev, spotifyProduct: product } : prev,
          );
          setUser((prev) =>
            prev ? { ...prev, spotifyProduct: product } : prev,
          );
          // Persist to backend so the server-side product status stays in sync
          authApi.syncSpotifyProduct(token).catch(() => {});
        })
        .catch(() => {});
    };

    window.addEventListener('spotify:token-refreshed', onSdkTokenRefreshed);
    return () => window.removeEventListener('spotify:token-refreshed', onSdkTokenRefreshed);
  }, [userProfile?.id, userProfile?.spotifyId]);

  // Periodic re-check of Spotify premium status (every 30 min)
  // Only runs for users who actually have a linked Spotify account.
  useEffect(() => {
    if (!userProfile?.id || !userProfile?.spotifyId) return;

    const interval = setInterval(
      async () => {
        const spotifyToken = spotifyAuthService.getStoredAccessToken();
        if (!spotifyToken) return;

        try {
          if (spotifyAuthService.isTokenExpiringSoon()) {
            const result = await spotifyAuthService.refreshAndFetchProduct();
            await authApi
              .syncSpotifyProduct(result.accessToken)
              .catch(() => {});
            if (result.product !== undefined) {
              setUserProfile((prev) =>
                prev ? { ...prev, spotifyProduct: result.product } : prev,
              );
              setUser((prev) =>
                prev ? { ...prev, spotifyProduct: result.product } : prev,
              );
            }
          } else {
            await authApi.syncSpotifyProduct(spotifyToken);
          }
        } catch {
          // Non-fatal
        }
      },
      30 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [userProfile?.id, userProfile?.spotifyId]);

  const signIn = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    initFromAuthResult(result);
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
  };

  const signInWithGoogle = async () => {
    window.location.href = authApi.getGoogleUrl();
  };

  const signInWithSpotify = async () => {
    try {
      const { url } = await spotifyAuthService.getAuthorizationUrl();
      const currentUrl = new URL(window.location.href);
      if (currentUrl.protocol === "https:" || currentUrl.protocol === "http:") {
        sessionStorage.setItem(
          "spotify_redirect_after_auth",
          currentUrl.toString(),
        );
      }
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Spotify sign in error:", error);
      throw error;
    }
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
      // Clear Spotify tokens first to prevent stale premium state
      spotifyAuthService.clearTokens();
      // Clear all auth-related data (JWT + Spotify + OAuth session keys)
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
  const isSpotifyPremium = userProfile?.spotifyProduct === "premium";

  const refreshSpotifyProduct = useCallback(async () => {
    // Guard: only refresh for users who actually have a linked Spotify account
    if (!userProfile?.id || !userProfile?.spotifyId) return;

    const spotifyToken = spotifyAuthService.getStoredAccessToken();
    if (!spotifyToken) return;

    try {
      const result = await authApi.syncSpotifyProduct(spotifyToken);
      setUserProfile((prev) =>
        prev ? { ...prev, spotifyProduct: result.spotifyProduct } : prev,
      );
      setUser((prev) =>
        prev ? { ...prev, spotifyProduct: result.spotifyProduct } : prev,
      );
    } catch {
      // Non-fatal: premium status will be re-checked on next login
    }
  }, [userProfile?.id, userProfile?.spotifyId]);

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signUpAsArtist,
    signInWithGoogle,
    signInWithSpotify,
    signInAnonymously,
    logout,
    authFetch,
    isAdmin,
    isArtist,
    isSpotifyPremium,
    refreshSpotifyProduct,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
