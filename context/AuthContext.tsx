import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, setTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/api';
import { spotifyAuthService, SpotifyUserProfile, SpotifyTokenResponse } from '../services/spotifyAuthService';
import { toApiUrl } from '../lib/apiBase';

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
  role: 'user' | 'admin' | 'moderator' | 'artist';
  createdAt?: any;
  lastLogin?: any;
  spotifyId?: string;
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

type BackendRole = 'USER' | 'ADMIN' | 'ARTIST' | 'MODERATOR';

const mapRole = (role: string): 'user' | 'admin' | 'moderator' | 'artist' => {
  const mapping: Record<string, 'user' | 'admin' | 'moderator' | 'artist'> = {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    ARTIST: 'artist',
  };
  return mapping[role] || 'user';
};

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signUpAsArtist: (email: string, password: string, artistData: {
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
  }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithSpotify: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
  isAdmin: boolean;
  isArtist: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const buildUser = (data: { id: string; email: string; displayName: string; role: string }): AuthUser => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: data.role,
});

const buildProfile = (data: { id: string; email: string; displayName: string; role: string }): UserProfile => ({
  uid: data.id,
  id: data.id,
  email: data.email,
  displayName: data.displayName,
  photoURL: null,
  role: mapRole(data.role),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const initFromAuthResult = useCallback((authResult: {
    user: { id: string; email: string; displayName: string; role: string };
    accessToken: string;
    refreshToken: string;
  }) => {
    setTokens(authResult.accessToken, authResult.refreshToken);
    setUser(buildUser(authResult.user));
    setUserProfile(buildProfile(authResult.user));
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const accessTokenParam = params.get('accessToken');
        const refreshTokenParam = params.get('refreshToken');
        const userId = params.get('userId');
        const email = params.get('email');
        const displayName = params.get('displayName');
        const role = params.get('role');

        if (accessTokenParam && refreshTokenParam && userId) {
          setTokens(accessTokenParam, refreshTokenParam);
          const authUser = { id: userId, email: email || '', displayName: displayName || email?.split('@')[0] || 'User', role: role || 'USER' };
          setUser(buildUser(authUser));
          setUserProfile(buildProfile(authUser));
          window.history.replaceState({}, document.title, window.location.pathname);
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
  };

  const signUp = async (email: string, password: string, displayName: string) => {
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
    }
  ) => {
    const result = await authApi.register(email, password, artistData.stageName);
    initFromAuthResult(result);
  };

  const signInWithGoogle = async () => {
    window.location.href = authApi.getGoogleUrl();
  };

  const signInWithSpotify = async () => {
    try {
      const { url } = await spotifyAuthService.getAuthorizationUrl();
      sessionStorage.setItem('spotify_redirect_after_auth', window.location.href);
      window.location.href = url;
    } catch (error) {
      console.error('Spotify sign in error:', error);
      throw error;
    }
  };

  const signInAnonymously = async () => {
    console.warn('Anonymous sign-in is not available with the current backend');
    throw new Error('Anonymous sign-in is not available');
  };

  const logout = async () => {
    try {
      const storedRefresh = getRefreshToken();
      if (storedRefresh) {
        await authApi.logout(storedRefresh).catch(() => {});
      }
    } finally {
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

      if (options.body && !nextHeaders['Content-Type']) {
        nextHeaders['Content-Type'] = 'application/json';
      }

      const token = getAccessToken();
      if (token) {
        nextHeaders['Authorization'] = `Bearer ${token}`;
      }

      return nextHeaders;
    };

    let headers = buildHeaders();
    let res = await fetch(toApiUrl(url), {
      ...options,
      headers,
    });

    if (res.status === 401) {
      const storedRefresh = getRefreshToken();
      if (!storedRefresh) {
        clearTokens();
        setUser(null);
        setUserProfile(null);
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expired. Please sign in again.');
      }

      try {
        const refreshed = await authApi.refresh(storedRefresh);
        initFromAuthResult(refreshed);
        headers = buildHeaders();
        res = await fetch(toApiUrl(url), {
          ...options,
          headers,
        });
      } catch {
        clearTokens();
        setUser(null);
        setUserProfile(null);
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expired. Please sign in again.');
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(body.error || body.message || 'Request failed');
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  };

  const isAdmin = userProfile?.role === 'admin';
  const isArtist = userProfile?.role === 'artist';

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
