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
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();
  const router = useRouter();
  const [showTimeoutFallback, setShowTimeoutFallback] = React.useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowTimeoutFallback(true);
      }, 5000);
    } else {
      setShowTimeoutFallback(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div dir="rtl" className="w-full min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center gap-3 font-cairo">
        <Loader2 className="w-9 h-9 text-brand-primary animate-spin" />
        <p className="text-body-default font-medium text-text-primary">جاري التحقق من الجلسة...</p>
        {showTimeoutFallback && (
          <div className="mt-3 flex flex-col sm:flex-row items-center gap-2 animate-fade-in">
            <button
              type="button"
              onClick={() => checkAuth()}
              className="px-4 py-2 text-caption font-bold rounded-button bg-brand-primary text-white hover:bg-brand-primary-dark transition-colors"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="px-4 py-2 text-caption font-bold rounded-button border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              الانتقال لصفحة الدخول
            </button>
          </div>
        )}
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
