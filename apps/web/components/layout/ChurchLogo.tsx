import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const ChurchLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'relative w-14 h-14 rounded-full bg-white border-2 border-brand-accent/60 shadow-card shrink-0 overflow-hidden',
      className
    )}
  >
    <Image
      src="/logo.jpg"
      alt="شعار الكنيسة"
      fill
      sizes="56px"
      className="object-cover scale-150"
    />
  </div>
);