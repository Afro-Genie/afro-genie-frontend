import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: any;
  lastLogin: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
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
  const updateUserProfile = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Check if user document already exists to preserve role
      const existingDoc = await getDoc(userRef);
      const existingRole = existingDoc.exists() ? existingDoc.data().role : null;
      
      // Set admin role for admin@afro-genie.com if not already set
      const shouldBeAdmin = user.email === 'admin@afro-genie.com';
      const role = shouldBeAdmin ? 'admin' : (existingRole || 'user');
      
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Afro Genie Admin',
        photoURL: user.photoURL,
        role: role as 'user' | 'admin' | 'moderator',
        createdAt: existingDoc.exists() ? existingDoc.data().createdAt : serverTimestamp(),
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

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
      // Profile will be created in the useEffect listener
    } catch (error) {
      console.error('Sign up error:', error);
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

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously: signInAsAnonymous,
    logout,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

