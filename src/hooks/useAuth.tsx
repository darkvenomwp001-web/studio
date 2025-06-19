
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
  username: string;
  email: string;
  passwordOne: string;
}

interface SignInData {
  email: string;
  passwordOne: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean; // Initial auth state check loading
  authLoading: boolean; // Specific loading state for auth operations (sign-in, sign-up)
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: SignUpData) => Promise<void>;
  signInWithEmailPassword: (data: SignInData) => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const PROTECTED_ROUTES_REQUIRE_AUTH = ['/profile', '/write', '/messages', '/ai-assistant']; // Add any other routes that need auth
const DEFAULT_REDIRECT_AUTHENTICATED = '/'; 
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true); 
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true); 
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
          avatarUrl: firebaseUser.photoURL || undefined,
          // Initialize other fields as needed or fetch them from your database
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
    if (loading) return; // Don't redirect until initial auth check is complete

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isProtectedRoute = PROTECTED_ROUTES_REQUIRE_AUTH.some(route => pathname.startsWith(route));

    if (user) { // User is authenticated
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else { // User is not authenticated
      if (isProtectedRoute && !isAuthRoute) {
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [user, loading, pathname, router]);

  const handleAuthError = (error: AuthError, operation?: string) => {
    console.error(`Firebase Auth Error during ${operation || 'operation'}:`, error.code, error.message);
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
        friendlyMessage = "The password is too weak. Please choose a stronger password of at least 6 characters.";
        break;
      case 'auth/user-disabled':
        friendlyMessage = "This user account has been disabled.";
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        friendlyMessage = "Invalid email or password. Please check your credentials.";
        break;
      case 'auth/popup-closed-by-user':
        friendlyMessage = "Google Sign-In popup was closed before completion.";
        break;
      case 'auth/cancelled-popup-request':
      case 'auth/popup-blocked':
          friendlyMessage = "Google Sign-In popup was blocked by the browser. Please allow popups for this site.";
          break;
      case 'auth/account-exists-with-different-credential':
        friendlyMessage = "An account already exists with this email address using a different sign-in method. Try signing in with that method.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "A network error occurred. Please check your internet connection and try again.";
        break;
      default:
        friendlyMessage = `An error occurred: ${error.message}. Please try again. Code: ${error.code}`;
    }
    toast({ title: "Authentication Error", description: friendlyMessage, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${result.user.displayName || result.user.email}!` });
      // onAuthStateChanged handles user state update and redirection logic in useEffect
    } catch (error) {
      handleAuthError(error as AuthError, "Google Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithEmailPassword = async ({ email, passwordOne, username }: SignUpData) => {
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordOne);
      if (userCredential.user) {
        // It's important to await updateProfile
        await updateProfile(userCredential.user, { displayName: username });
        // The onAuthStateChanged listener will pick up the new user and their updated profile.
        // For an immediate UI update if onAuthStateChanged is slow, you can optimistically update:
        setUser({
            id: userCredential.user.uid,
            username: username, // Use the provided username
            avatarUrl: userCredential.user.photoURL || undefined,
            bio: undefined,
            writtenStories: [],
            readingList: [],
            followersCount: 0,
            followingCount: 0,
        });
      }
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
      // onAuthStateChanged handles redirection
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };
  
  const signInWithEmailPassword = async ({ email, passwordOne }: SignInData) => {
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, passwordOne);
      toast({ title: "Sign In Successful", description: "You are now signed in." });
      // onAuthStateChanged handles redirection
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-In");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutFirebase = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // onAuthStateChanged handles redirection
    } catch (error) {
      handleAuthError(error as AuthError, "Sign Out");
    } finally {
      setUser(null); // Explicitly clear user state locally for faster UI update
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
