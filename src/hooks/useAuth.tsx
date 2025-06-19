
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface SignUpData {
  username?: string; // Username is optional here, displayName in Firebase
  email: string;
  passwordOne: string;
}

interface SignInData {
  email: string;
  passwordOne: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean; // Specific loading state for auth operations
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: SignUpData) => Promise<void>;
  signInWithEmailPassword: (data: SignInData) => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const DEFAULT_REDIRECT_AUTHENTICATED = '/'; 
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth state check
  const [authLoading, setAuthLoading] = useState(false); // For specific auth actions like sign-in/up
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          avatarUrl: firebaseUser.photoURL || undefined,
          bio: undefined, 
          writtenStories: [],
          readingList: [],
          followersCount: 0,
          followingCount: 0,
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (user) {
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else {
      if (!isAuthRoute) {
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [user, loading, pathname, router]);

  const handleAuthError = (error: AuthError) => {
    console.error("Firebase Auth Error:", error.code, error.message);
    let friendlyMessage = "An unexpected error occurred. Please try again.";
    switch (error.code) {
      case 'auth/email-already-in-use':
        friendlyMessage = "This email address is already in use by another account.";
        break;
      case 'auth/invalid-email':
        friendlyMessage = "The email address is not valid.";
        break;
      case 'auth/operation-not-allowed':
        friendlyMessage = "Email/password accounts are not enabled.";
        break;
      case 'auth/weak-password':
        friendlyMessage = "The password is too weak. Please choose a stronger password.";
        break;
      case 'auth/user-disabled':
        friendlyMessage = "This user account has been disabled.";
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // Catches user-not-found and wrong-password in newer SDKs
        friendlyMessage = "Invalid email or password. Please check your credentials.";
        break;
      case 'auth/popup-closed-by-user':
        friendlyMessage = "Google Sign-In popup was closed before completion.";
        break;
      case 'auth/cancelled-popup-request':
      case 'auth/popup-blocked':
          friendlyMessage = "Google Sign-In popup was blocked by the browser. Please allow popups for this site.";
          break;
      default:
        friendlyMessage = error.message || friendlyMessage;
    }
    toast({ title: "Authentication Error", description: friendlyMessage, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Success", description: "Signed in with Google successfully!" });
      // onAuthStateChanged handles user state and redirection
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async ({ email, passwordOne, username }: SignUpData) => {
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      if (userCredential.user && username) {
        await updateProfile(userCredential.user, { displayName: username });
        // Refresh user state if necessary, though onAuthStateChanged should pick it up
         setUser(prevUser => prevUser ? {...prevUser, username: username } : null);
      }
      toast({ title: "Success", description: "Account created successfully! You are now signed in." });
      // onAuthStateChanged handles user state and redirection
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setAuthLoading(false);
    }
  };
  
  const signInWithEmailPassword = async ({ email, passwordOne }: SignInData) => {
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, passwordOne);
      toast({ title: "Success", description: "Signed in successfully!" });
      // onAuthStateChanged handles user state and redirection
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFirebase = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been signed out." });
      // onAuthStateChanged handles user state and redirection to sign-in
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setAuthLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, authLoading, signInWithGoogle, signUpWithEmailPassword, signInWithEmailPassword, signOutFirebase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
