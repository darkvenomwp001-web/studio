
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
  type User as FirebaseUser 
} from 'firebase/auth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const DEFAULT_REDIRECT_AUTHENTICATED = '/'; // Redirect to homepage after login
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const appUser: AppUser = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || 'Anonymous User',
          avatarUrl: firebaseUser.photoURL || undefined,
          // Firebase doesn't provide bio, followersCount, etc. by default.
          // These would typically be fetched from your app's database (e.g., Firestore)
          // after a user logs in, using firebaseUser.uid as the key.
          // For this prototype, we'll leave them undefined.
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
    if (loading) {
      return; // Don't do anything while loading
    }

    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (user) { // User is authenticated
      if (isAuthRoute) { // and trying to access an auth page (signin/signup)
        router.push(DEFAULT_REDIRECT_AUTHENTICATED); // Redirect to homepage
      }
      // If user is authenticated and on a non-auth page, they can stay.
    } else { // User is NOT authenticated
      if (!isAuthRoute) { // and trying to access a protected page
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED); // Redirect to signin page
      }
      // If user is not authenticated and on an auth page, they can stay.
    }
  }, [user, loading, pathname, router]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user.
      // The useEffect above will handle redirection once user state is updated.
    } catch (error) {
      console.error("Error signing in with Google:", error);
      // Optionally, show a toast message to the user here
      setLoading(false); // Ensure loading is false on error so UI isn't stuck
    }
    // setLoading will be managed by the onAuthStateChanged listener's effect
  };

  const signOutFirebase = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null.
      // The useEffect above will handle redirection.
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally, show a toast message
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutFirebase }}>
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
