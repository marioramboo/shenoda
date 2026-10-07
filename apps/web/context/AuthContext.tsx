'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken, getStoredRefreshToken, setStoredRefreshToken, refreshSession } from '@/lib/api';

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
  fatherConfessor?: string | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
  maritalStatus?: string | null;
  spouseName?: string | null;
  educationOrCareer?: string | null;
  whatsappPhone?: string | null;
  whatsappPhoneRaw?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  talents?: string[] | null;
  siblingsInfo?: Array<{ name: string; age?: number | string }> | null;
  activities?: string[] | null;
  isDeacon?: boolean | null;
  deaconName?: string | null;
  deaconRank?: string | null;
  profilePicture?: string | null;
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
  updateUser: (updatedUser: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthSuccess = (token: string, userData: AuthUser, refreshToken?: string) => {
    setAuthToken(token);
    setTokenState(token);
    setUser(userData);
    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }
  };

  const applyAuthCleared = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    setStoredRefreshToken(null);
  };

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await refreshSession();
      if (res?.accessToken && res?.user) {
        applyAuthSuccess(res.accessToken, res.user, res.refreshToken);
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
        applyAuthSuccess(res.data.accessToken, res.data.user, res.data.refreshToken);
      } else {
        throw new Error(res.data?.error?.message || 'فشل تسجيل الدخول');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      await api.post('/api/v1/auth/logout', {
        refreshToken: storedRefreshToken || undefined,
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      applyAuthCleared();
    }
  };

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
      }
    } catch {
      // Ignore
    }
  }, []);

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
        updateUser,
        refreshUser,
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
