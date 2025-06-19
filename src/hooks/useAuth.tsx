
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { placeholderUsers } from '@/lib/placeholder-data';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ROUTES = ['/auth/signin', '/auth/signup'];
const DEFAULT_REDIRECT_AUTHENTICATED = '/'; // Redirect here if logged in and tries to access auth routes
const DEFAULT_REDIRECT_UNAUTHENTICATED = '/auth/signin'; // Redirect here if not logged in

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const storedUser = sessionStorage.getItem('mockUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        setUser(null);
        sessionStorage.removeItem('mockUser');
      }
      setLoading(false);
    };
    checkAuth();
  }, []); // Runs once on mount to check sessionStorage

  useEffect(() => {
    if (loading) {
      return; // Don't do anything while loading auth state
    }

    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (user) { // User is authenticated
      if (isAuthRoute) {
        router.push(DEFAULT_REDIRECT_AUTHENTICATED);
      }
    } else { // User is not authenticated
      if (!isAuthRoute) {
        router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
      }
    }
  }, [user, loading, pathname, router]); // Re-run when auth state, loading status, or path changes

  const login = (userData?: User) => {
    // setLoading(true); // Optional: can cause flicker if login is fast
    const userToLogin = userData || placeholderUsers[0];
    setUser(userToLogin);
    sessionStorage.setItem('mockUser', JSON.stringify(userToLogin));
    setLoading(false); // Ensure loading is false after user is set for the redirect effect to work correctly
    router.push(DEFAULT_REDIRECT_AUTHENTICATED); // Redirect to homepage
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('mockUser');
    router.push(DEFAULT_REDIRECT_UNAUTHENTICATED);
  };

  // If loading, or if unauthenticated and not on an auth route (redirection pending),
  // we could return a loader. However, to avoid conflicts with RootLayout,
  // we'll rely on the useEffect for redirection. The brief rendering of children
  // before redirect is usually acceptable for simple cases.
  // For a full-page loader here, it would typically replace `children`.
  // if (loading) return <YourGlobalLoader />;
  // if (!user && !AUTH_ROUTES.includes(pathname) && !loading) return <YourGlobalLoader />;


  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
