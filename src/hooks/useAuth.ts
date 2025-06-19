
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
  }, []);

  const login = (userData?: User) => {
    setLoading(true);
    const userToLogin = userData || placeholderUsers[0];
    setUser(userToLogin);
    sessionStorage.setItem('mockUser', JSON.stringify(userToLogin));
    setLoading(false);
    // Redirect to profile only if not already trying to access a non-auth page
    if (!pathname.startsWith('/auth')) {
        router.push('/profile');
    } else {
        router.push('/profile'); // Default redirect after login/signup
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('mockUser');
    router.push('/auth/signin');
  };

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
