
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUserType } from '@/types'; // Renamed to avoid conflict
import { auth } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile, // Renamed to avoid conflict
  updateEmail as updateFirebaseEmail, // Renamed
  updatePassword as updateFirebasePassword, // Renamed
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { placeholderUsers } from '@/lib/placeholder-data'; // For initial mock role

interface SignUpData {
  username: string;
  email: string;
  passwordOne: string;
}

interface SignInData {
  email: string;
  passwordOne: string;
}

// Define AppUser with all properties including optional ones like role
interface AppUser extends AppUserType {
  email?: string; // Ensure email is part of AppUser
  displayName?: string;
  role?: 'reader' | 'writer';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (data: SignUpData) => Promise<void>;
  signInWithEmailPassword: (data: SignInData) => Promise<void>;
  signOutFirebase: () => Promise<void>;
  updateUserProfile: (updates: Partial<AppUser>) => Promise<void>; // For displayName, photoURL, bio, role
  updateUserEmail_mock: (newEmail: string) => Promise<void>; // Mocked
  updateUserPassword_mock: (newPassword: string) => Promise<void>; // Mocked
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const PUBLIC_ROUTES: string[] = []; // Add any other public routes here if needed
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
        // Try to get stored role, or default
        let userRole: 'reader' | 'writer' | undefined = undefined;
        try {
          const storedUserDetails = sessionStorage.getItem(`userDetails-${firebaseUser.uid}`);
          if (storedUserDetails) {
            userRole = JSON.parse(storedUserDetails).role;
          }
        } catch (e) { console.error("Error parsing stored user details", e); }


        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
          avatarUrl: firebaseUser.photoURL || undefined,
          email: firebaseUser.email || undefined,
          bio: undefined, 
          role: userRole || placeholderUsers.find(pu => pu.id === firebaseUser.uid)?.role || 'reader', // Mock or fetch
          writtenStories: [], 
          readingList: [], 
          followersCount: 0, 
          followingCount: 0, 
        };
        setUser(appUser);
        sessionStorage.setItem(`userDetails-${firebaseUser.uid}`, JSON.stringify({ role: appUser.role, bio: appUser.bio }));
      } else {
        setUser(null);
        // Clear any stored user details on logout
        // Consider if you have user-specific items to clear
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (user) { // User is authenticated
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else { // User is not authenticated
      if (!isAuthRoute && !isPublicRoute) {
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [user, loading, pathname, router]);

  const handleAuthError = (error: AuthError, operation?: string) => {
    console.error(`Firebase Auth Error during ${operation || 'operation'}:`, error.code, error.message);
    let friendlyMessage = "An unexpected error occurred. Please try again.";
    let title = "Authentication Error";

    switch (error.code) {
      case 'auth/email-already-in-use':
        friendlyMessage = "This email address is already in use by another account.";
        title = "Sign-Up Failed";
        break;
      case 'auth/invalid-email':
        friendlyMessage = "The email address is not valid.";
        break;
      case 'auth/operation-not-allowed':
        friendlyMessage = "Email/password accounts are not enabled. Please contact support.";
        break;
      case 'auth/weak-password':
        friendlyMessage = "The password is too weak. Please choose a stronger password of at least 6 characters.";
        title = "Sign-Up Failed";
        break;
      case 'auth/user-disabled':
        friendlyMessage = "This user account has been disabled.";
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        friendlyMessage = "Invalid email or password. Please check your credentials.";
        title = "Sign-In Failed";
        break;
      case 'auth/popup-closed-by-user':
        title = "Google Sign-In Cancelled";
        friendlyMessage = "Google Sign-In was cancelled or the popup was closed before completion. Please try again. Ensure pop-ups are allowed for this site in your browser settings. If you have multiple Google accounts, try signing out of all Google accounts in your browser and then try signing in again, or use an incognito window.";
        break;
      case 'auth/popup-blocked':
        title = "Google Sign-In Blocked";
        friendlyMessage = "Google Sign-In popup was blocked by your browser. Please allow pop-ups for this site and try again. Ad-blockers or other extensions might also interfere.";
        break;
      case 'auth/account-exists-with-different-credential':
        title = "Account Exists With Different Sign-In Method";
        friendlyMessage = "An account already exists with this email address but was created using a different sign-in method (e.g., Email/Password). To link these accounts and use Google Sign-In, please check your Firebase project's 'User account linking' settings in the Firebase Console (Authentication -> Settings -> User account linking) and ensure it's configured to 'Link accounts that use the same email address'. Otherwise, sign in using your original method or use a different Google account.";
        break;
      case 'auth/network-request-failed':
        friendlyMessage = "A network error occurred. Please check your internet connection and try again.";
        break;
      case 'auth/unauthorized-domain':
        friendlyMessage = "This domain is not authorized for Firebase Authentication. Check your Firebase project settings (Authentication -> Settings -> Authorized domains).";
        break;
      case 'auth/invalid-api-key':
        friendlyMessage = "The API Key provided for Firebase is invalid. Please check your .env file and Firebase project settings.";
        break;
      default:
        friendlyMessage = `An error occurred: ${error.message}. Please try again. (Code: ${error.code})`;
    }
    toast({ title: title, description: friendlyMessage, variant: "destructive" });
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${firebaseUser.displayName || firebaseUser.email}! Redirecting...` });
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
        await updateFirebaseProfile(userCredential.user, { displayName: username });
        // Persist role and bio (if any collected at sign-up)
        const defaultRole = 'reader'; // Or based on sign-up form
        sessionStorage.setItem(`userDetails-${userCredential.user.uid}`, JSON.stringify({ role: defaultRole, bio: "" }));
      }
      toast({ title: "Sign Up Successful", description: "Your account has been created. Welcome!" });
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
      toast({ title: "Sign In Successful", description: "You are now signed in. Redirecting..." });
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
    } catch (error) {
      handleAuthError(error as AuthError, "Sign Out");
    } finally {
      setAuthLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    try {
      const { displayName, avatarUrl, bio, role } = updates;
      const profileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
      if (displayName !== undefined) profileUpdates.displayName = displayName;
      if (avatarUrl !== undefined) profileUpdates.photoURL = avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        await updateFirebaseProfile(auth.currentUser, profileUpdates);
      }
      
      // Update local user state
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, ...updates };
         // Persist non-auth properties like bio and role
        sessionStorage.setItem(`userDetails-${updatedUser.id}`, JSON.stringify({ role: updatedUser.role, bio: updatedUser.bio }));
        return updatedUser;
      });

      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    } catch (error) {
      handleAuthError(error as AuthError, "Profile Update");
    } finally {
      setAuthLoading(false);
    }
  };

  // Mocked functions for email and password updates
  const updateUserEmail_mock = async (newEmail: string) => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    // In a real app: await updateFirebaseEmail(auth.currentUser, newEmail);
    // This often requires re-authentication.
    // For mock:
    setUser(prev => prev ? ({ ...prev, email: newEmail }) : null);
    toast({ title: "Email Update (Mock)", description: `Email would be updated to ${newEmail}. Re-authentication is typically required.` });
    setAuthLoading(false);
  };

  const updateUserPassword_mock = async (newPassword: string) => {
     if (!auth.currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return;
    }
    setAuthLoading(true);
    // In a real app: await updateFirebasePassword(auth.currentUser, newPassword);
    // This often requires re-authentication.
    toast({ title: "Password Update (Mock)", description: "Password would be updated. Re-authentication is typically required." });
    setAuthLoading(false);
  };


  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        authLoading, 
        signInWithGoogle, 
        signUpWithEmailPassword, 
        signInWithEmailPassword, 
        signOutFirebase,
        updateUserProfile,
        updateUserEmail_mock,
        updateUserPassword_mock
    }}>
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
