import React from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  count?: number | string;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  className,
  selected = false,
  count,
  icon,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-body-small font-medium transition-all select-none focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 shrink-0 active:scale-95',
        selected
          ? 'bg-brand-primary text-text-inverse shadow-sm'
          : 'bg-bg-surface border border-border-default text-text-secondary hover:border-text-secondary hover:text-text-primary',
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-caption font-semibold min-w-[18px]',
            selected
              ? 'bg-brand-primary-dark text-white'
              : 'bg-bg-muted text-text-primary'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};
