import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      iconLeading,
      iconTrailing,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="text-body-small font-medium text-text-primary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {iconLeading && (
            <div className="absolute right-3.5 flex items-center justify-center pointer-events-none text-text-secondary">
              {iconLeading}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border transition-colors',
              'placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary',
              'disabled:bg-bg-muted disabled:text-text-disabled disabled:cursor-not-allowed',
              error
                ? 'border-status-danger text-status-danger focus:ring-status-danger focus:border-status-danger'
                : 'border-border-default',
              iconLeading ? 'pr-11 pl-4' : 'px-4',
              iconTrailing ? 'pl-11' : '',
              className
            )}
            {...props}
          />

          {iconTrailing && (
            <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-text-secondary">
              {iconTrailing}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-caption text-status-danger mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-caption text-text-secondary mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
