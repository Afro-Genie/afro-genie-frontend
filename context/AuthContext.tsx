import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { spotifyAuthService, SpotifyUserProfile, SpotifyTokenResponse } from '../services/spotifyAuthService';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'moderator' | 'artist';
  createdAt: any;
  lastLogin: any;
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

interface AuthContextType {
  user: User | null;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get user profile from Firestore
  const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Helper function to create/update user profile in Firestore
  const updateUserProfile = async (user: User, spotifyData?: { profile: SpotifyUserProfile; tokens: SpotifyTokenResponse }) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Check if user document already exists to preserve role
      const existingDoc = await getDoc(userRef);
      const existingRole = existingDoc.exists() ? existingDoc.data().role : null;
      const existingSpotifyData = existingDoc.exists() ? existingDoc.data().spotifyTokens : null;
      
      // Set admin role for admin@afro-genie.com if not already set
      const shouldBeAdmin = user.email === 'admin@afro-genie.com';
      const role = shouldBeAdmin ? 'admin' : (existingRole || 'user');
      
      const userProfile: any = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Afro Genie Admin',
        photoURL: user.photoURL,
        role: role as 'user' | 'admin' | 'moderator',
        createdAt: existingDoc.exists() ? existingDoc.data().createdAt : serverTimestamp(),
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add Spotify data if provided
      if (spotifyData) {
        userProfile.spotifyId = spotifyData.profile.id;
        userProfile.spotifyTokens = {
          accessToken: spotifyData.tokens.access_token,
          refreshToken: spotifyData.tokens.refresh_token,
          expiresAt: Date.now() + (spotifyData.tokens.expires_in * 1000)
        };
        // Update photo if Spotify has one and user doesn't
        if (!userProfile.photoURL && spotifyData.profile.images?.[0]?.url) {
          userProfile.photoURL = spotifyData.profile.images[0].url;
        }
        // Update display name if Spotify has one and user doesn't
        if (!userProfile.displayName && spotifyData.profile.display_name) {
          userProfile.displayName = spotifyData.profile.display_name;
        }
      } else if (existingSpotifyData) {
        // Preserve existing Spotify data if not updating
        userProfile.spotifyTokens = existingSpotifyData;
        userProfile.spotifyId = existingDoc.data().spotifyId;
      }

      await setDoc(userRef, userProfile, { merge: true });
      
      // If this is admin@afro-genie.com and wasn't admin before, update the profile state
      if (shouldBeAdmin && existingRole !== 'admin') {
        const updatedProfile = await getUserProfile(user.uid);
        setUserProfile(updatedProfile);
      } else {
        setUserProfile(userProfile as UserProfile);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        // Get or create user profile
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          // Create new profile if it doesn't exist
          await updateUserProfile(user);
          profile = await getUserProfile(user.uid);
        } else {
          // Update last login and check if admin@afro-genie.com needs admin role
          await updateUserProfile(user);
          // Refresh profile to get updated role
          profile = await getUserProfile(user.uid);
        }

        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name
      await result.user.updateProfile({ displayName });
      // Send email verification
      await sendEmailVerification(result.user);
      // Profile will be created in the useEffect listener
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
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
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name to stage name
      await result.user.updateProfile({ 
        displayName: artistData.stageName,
        photoURL: artistData.photoURL 
      });

      // Send email verification
      await sendEmailVerification(result.user);

      // Create artist profile in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: artistData.stageName,
        photoURL: artistData.photoURL || result.user.photoURL,
        role: 'artist',
        artistProfile: {
          stageName: artistData.stageName,
          genre: artistData.genre,
          bio: artistData.bio,
          location: artistData.location,
          website: artistData.website,
          socialLinks: artistData.socialLinks,
          verified: true, // Auto-verified on signup
          verifiedAt: serverTimestamp()
        },
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true });

      // Create or update artist document
      const artistsQuery = query(
        collection(db, 'artists'),
        where('name', '==', artistData.stageName)
      );
      const artistsSnapshot = await getDocs(artistsQuery);
      
      if (artistsSnapshot.empty) {
        await addDoc(collection(db, 'artists'), {
          name: artistData.stageName,
          genre: artistData.genre,
          image: artistData.photoURL || '',
          userId: result.user.uid, // Link to user
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Artist sign up error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Profile will be created in the useEffect listener
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithSpotify = async () => {
    try {
      // Redirect to Spotify authorization with PKCE
      const { url } = await spotifyAuthService.getAuthorizationUrl();
      // Store the current URL to redirect back after auth
      sessionStorage.setItem('spotify_redirect_after_auth', window.location.href);
      window.location.href = url;
    } catch (error) {
      console.error('Spotify sign in error:', error);
      throw error;
    }
  };

  // Function to handle Spotify OAuth callback
  const handleSpotifyCallback = async (code: string) => {
    try {
      // Exchange code for tokens
      const tokens = await spotifyAuthService.exchangeCodeForToken(code);
      spotifyAuthService.storeTokens(tokens);

      // Get user profile from Spotify
      const spotifyProfile = await spotifyAuthService.getUserProfile(tokens.access_token);

      if (!spotifyProfile.email) {
        throw new Error('Spotify account does not have an email address. Please use a different sign-in method.');
      }

      // Generate a secure random password for Firebase
      const randomPassword = `spotify_${Math.random().toString(36).slice(-12)}${Date.now().toString(36)}`;

      let firebaseUser: User;

      try {
        // Try to create new account
        const result = await createUserWithEmailAndPassword(auth, spotifyProfile.email, randomPassword);
        firebaseUser = result.user;
        
        // Update profile with Spotify data
        await firebaseUser.updateProfile({
          displayName: spotifyProfile.display_name || spotifyProfile.email.split('@')[0],
          photoURL: spotifyProfile.images?.[0]?.url || null
        });

        // Create user profile with Spotify data
        await updateUserProfile(firebaseUser, {
          profile: spotifyProfile,
          tokens: tokens
        });
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          // User exists - we can't sign them in without password
          // For now, throw an error asking them to use email/password
          throw new Error('An account with this email already exists. Please sign in with email/password or use Google sign-in to link your accounts.');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Spotify callback error:', error);
      throw error;
    }
  };

  const signInAsAnonymous = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isArtist = userProfile?.role === 'artist';

  // Check for Spotify callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      handleSpotifyCallback(code).then(() => {
        // Check for artist signup redirect first, then general redirect
        const artistRedirect = sessionStorage.getItem('artist_signup_redirect');
        const redirectUrl = artistRedirect || sessionStorage.getItem('spotify_redirect_after_auth') || '/';
        sessionStorage.removeItem('spotify_redirect_after_auth');
        sessionStorage.removeItem('artist_signup_redirect');
        window.history.replaceState({}, document.title, redirectUrl);
        window.location.href = redirectUrl;
      }).catch((err) => {
        console.error('Spotify callback failed:', err);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signUpAsArtist,
    signInWithGoogle,
    signInWithSpotify,
    signInAnonymously: signInAsAnonymous,
    logout,
    isAdmin,
    isArtist
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

