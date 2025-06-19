
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
  loading: boolean; 
  authLoading: boolean; 
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: SignUpData) => Promise<void>;
  signInWithEmailPassword: (data: SignInData) => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
// Define routes that require authentication
const PROTECTED_ROUTES_REQUIRE_AUTH = ['/profile', '/write', '/messages', '/ai-assistant']; 
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); 
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
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
    const isProtectedRoute = PROTECTED_ROUTES_REQUIRE_AUTH.some(route => pathname.startsWith(route));

    if (user) { 
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else { 
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
        friendlyMessage = "Email/password accounts are not enabled. Please contact support.";
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
        friendlyMessage = "Google Sign-In popup was closed. If this was unintentional, please try again and ensure pop-ups are allowed and not closed prematurely by your browser or an extension.";
        break;
      case 'auth/cancelled-popup-request': 
      case 'auth/popup-blocked':
          friendlyMessage = "Google Sign-In popup was blocked or cancelled. Please ensure pop-ups are allowed for this site and try again. You might need to check your browser settings or ad-blockers.";
          break;
      case 'auth/account-exists-with-different-credential':
        friendlyMessage = "An account already exists with this email address but was created using a different sign-in method (e.g., Email/Password). Please sign in using that original method, or use a different Google account.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "A network error occurred. Please check your internet connection and try again.";
        break;
      case 'auth/unauthorized-domain':
        friendlyMessage = "This domain is not authorized for Firebase Authentication. Please check your Firebase project settings (Authentication -> Settings -> Authorized domains) and add the domain your app is running on (e.g., localhost).";
        break;
      case 'auth/invalid-api-key':
        friendlyMessage = "The API Key provided for Firebase is invalid. Please check your .env file and Firebase project settings.";
        break;
      default:
        friendlyMessage = `An error occurred: ${error.message}. Please try again. (Code: ${error.code})`;
    }
    toast({ title: "Authentication Error", description: friendlyMessage, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Firebase's onAuthStateChanged listener will handle user state update and subsequent redirection.
      // We can show a success toast here.
      const displayName = result.user.displayName || result.user.email;
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${displayName}! You will be redirected shortly.` });
      // No need to manually setUser here as onAuthStateChanged will do it.
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
        await updateProfile(userCredential.user, { displayName: username });
        // Manually update local user state for quicker UI update before onAuthStateChanged potentially fires
        const appUser: AppUser = {
          id: userCredential.user.uid,
          username: username,
          avatarUrl: userCredential.user.photoURL || undefined,
          bio: undefined, writtenStories: [], readingList: [], followersCount: 0, followingCount: 0,
        };
        setUser(appUser); // This ensures UI updates even before onAuthStateChanged might
      }
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
      // Redirection will be handled by the main useEffect hook based on user state change
    } catch (error) {
      handleAuthError(error as AuthError, "Email/Password Sign-Up");
    } finally {
      setAuthLoading(false);
    }
  };
  
  const signInWithEmailPassword = async ({ email, passwordOne }: SignInData) => {
    setAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, passwordOne);
      // Manually update local user state
      const firebaseUser = userCredential.user;
       const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
          avatarUrl: firebaseUser.photoURL || undefined,
          bio: undefined, writtenStories: [], readingList: [], followersCount: 0, followingCount: 0,
        };
      setUser(appUser);
      toast({ title: "Sign In Successful", description: "You are now signed in." });
      // Redirection will be handled by the main useEffect hook
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
      setUser(null); 
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // Redirection to /auth/signin will be handled by the main useEffect
    } catch (error) {
      handleAuthError(error as AuthError, "Sign Out");
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

