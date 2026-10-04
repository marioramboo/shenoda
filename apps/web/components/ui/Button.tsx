import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      iconLeading,
      iconTrailing,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-button font-medium rounded-button transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] transition-transform';

    const variantStyles = {
      primary:
        'bg-brand-primary text-white hover:bg-brand-primary-dark active:bg-brand-primary-dark shadow-sm',
      secondary:
        'bg-brand-primary-soft text-brand-primary hover:bg-[#d8e2f0] active:bg-[#cad8ec]',
      accent:
        'bg-brand-accent text-white hover:bg-[#a67923] active:bg-[#976d1e] shadow-sm',
      outline:
        'border border-border-default bg-transparent text-text-primary hover:bg-bg-muted hover:border-text-secondary active:bg-border-default',
      danger:
        'bg-status-danger text-white hover:bg-[#ab3024] active:bg-[#98291e] shadow-sm',
    };

    const sizeStyles = {
      sm: 'h-[36px] px-3 text-caption gap-1.5',
      md: 'h-[44px] px-4 text-button gap-2',
      lg: 'h-[50px] px-6 text-body-medium font-semibold gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {iconLeading && <span className="inline-flex shrink-0">{iconLeading}</span>}
            <span>{children}</span>
            {iconTrailing && <span className="inline-flex shrink-0">{iconTrailing}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
