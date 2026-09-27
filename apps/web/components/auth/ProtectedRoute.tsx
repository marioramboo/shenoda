'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  minLevel?: number;
}

export function ProtectedRoute({ children, minLevel }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        <p className="text-body-small text-text-secondary font-cairo">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (minLevel && user && user.role.level < minLevel) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-bg-surface border border-border-default rounded-card shadow-card p-6 max-w-md">
          <h2 className="text-h2 font-bold text-status-danger mb-2">غير مصرح بالوصول</h2>
          <p className="text-body-small text-text-secondary">
            رتبتك الحالية ({user.role.name}) لا تمتلك الصلاحية الكافية للوصول إلى هذه الصفحة.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
