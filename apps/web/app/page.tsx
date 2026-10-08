'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChurchLogo } from '@/components/layout/ChurchLogo';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <main
      dir="rtl"
      className="w-full min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center gap-4 font-cairo"
    >
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <ChurchLogo className="w-16 h-16 shadow-lg border-2 border-brand-accent" />
        <div className="flex items-center gap-2 mt-2 text-text-secondary">
          <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
          <span className="text-body-default font-medium">جاري التحميل...</span>
        </div>
      </div>
    </main>
  );
}
