'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '@/lib/api';

export interface RoleInfo {
  id: string;
  code: string;
  name: string;
  level: number;
}

export interface ScopeItem {
  id: string;
  name: string;
  code?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  status: string;
  role: RoleInfo;
  scopes: {
    stages: ScopeItem[];
    sectors: ScopeItem[];
  };
}

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthSuccess = (token: string, userData: AuthUser) => {
    setAuthToken(token);
    setTokenState(token);
    setUser(userData);
  };

  const applyAuthCleared = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.post('/api/v1/auth/refresh');
      if (res.data?.success && res.data?.accessToken) {
        applyAuthSuccess(res.data.accessToken, res.data.user);
      } else {
        applyAuthCleared();
      }
    } catch {
      applyAuthCleared();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/v1/auth/login', {
        identifier,
        password,
      });

      if (res.data?.success) {
        applyAuthSuccess(res.data.accessToken, res.data.user);
      } else {
        throw new Error(res.data?.error?.message || 'فشل تسجيل الدخول');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      applyAuthCleared();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
