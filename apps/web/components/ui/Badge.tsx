import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary' | 'accent';
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  withDot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    success: 'bg-status-success-soft text-status-success border-transparent',
    danger: 'bg-status-danger-soft text-status-danger border-transparent',
    warning: 'bg-status-warning-soft text-status-warning border-transparent',
    info: 'bg-status-info-soft text-status-info border-transparent',
    neutral: 'bg-bg-muted text-text-secondary border-transparent',
    primary: 'bg-brand-primary-soft text-brand-primary border-transparent',
    accent: 'bg-brand-accent-soft text-brand-accent border-transparent',
  };

  const dotColors = {
    success: 'bg-status-success',
    danger: 'bg-status-danger',
    warning: 'bg-status-warning',
    info: 'bg-status-info',
    neutral: 'bg-text-secondary',
    primary: 'bg-brand-primary',
    accent: 'bg-brand-accent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-caption font-medium select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
