'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from 'src/lib/types';
import { authApi } from 'src/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup', '/'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshProfile = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch (error) {
      // Don't clear user on a failed refresh — keep existing state
    }
  };

  // Initial user fetch on boot
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Unconditionally fetch CSRF token first
      try {
        await authApi.getCsrf();
      } catch (csrfError) {
        console.warn("Failed to retrieve CSRF token on boot:", csrfError);
      }

      // 2. Fetch User Profile
      try {
        const u = await authApi.me();
        setUser(u);
      } catch (error: any) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);


  // Route protection rules
  useEffect(() => {
    if (!loading) {
      const isPublic = PUBLIC_ROUTES.includes(pathname || '');
      if (!user && !isPublic) {
        // Redirect unauthorized users to login
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/signup')) {
        // Redirect logged in users away from auth pages
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const u = await authApi.login({ email, password });
      setUser(u);
      router.push('/dashboard');
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, name: string, password: string) => {
    setLoading(true);
    try {
      const u = await authApi.signup({ email, name, password });
      setUser(u);
      router.push('/dashboard');
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
