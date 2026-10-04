import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Coptic-cross church mark used as the app logo (sketch: "لوجو" circle).
 */
export const ChurchLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-label="شعار الكنيسة"
    className={cn(
      'w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center border-2 border-brand-accent/60 shadow-card shrink-0',
      className
    )}
  >
    <svg viewBox="0 0 32 32" className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M16 4v24M4 16h24" />
      <path d="M16 4l-2.2 2.2M16 4l2.2 2.2M16 28l-2.2-2.2M16 28l2.2-2.2M4 16l2.2-2.2M4 16l2.2 2.2M28 16l-2.2-2.2M28 16l-2.2 2.2" strokeWidth="1.6" />
    </svg>
  </div>
);
