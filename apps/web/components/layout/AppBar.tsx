import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface AppBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  subtitle,
  onBack,
  actions,
  className,
}) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-brand-primary text-text-inverse shadow-card transition-all',
        className
      )}
    >
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="الرجوع"
              className="w-9 h-9 -mr-1 flex items-center justify-center rounded-button hover:bg-white/10 active:bg-white/20 transition-colors text-white"
            >
              {/* In RTL, back is forward in reading direction, i.e. pointing right */}
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="flex flex-col min-w-0 text-right">
            <h1 className="text-h2 font-bold text-white truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="text-caption text-brand-primary-soft/90 truncate leading-none mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1.5 shrink-0 text-white">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
