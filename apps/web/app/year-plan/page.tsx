'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YearPlanRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/plan');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full" />
    </div>
  );
}
