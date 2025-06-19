
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
const DEFAULT_REDIRECT_AUTHENTICATED = '/';
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
          // Add other fields from your AppUser type as needed, potentially fetched from your DB
          // For now, we only map basic info from Firebase
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
      return;
    }

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

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user and redirection
      // No need to manually push here, as the effect above will handle it once user state changes
    } catch (error) {
      console.error("Error signing in with Google:", error);
      // Potentially show a toast message to the user
      setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) will be handled by onAuthStateChanged's effect
  };

  const signOutFirebase = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null, triggering redirect effect
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutFirebase: signOutFirebase }}>
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
