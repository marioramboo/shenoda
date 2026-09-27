import React from 'react';
import { cn } from '@/lib/utils';

export interface MobileShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  header,
  footer,
  className,
  withPadding = true,
}) => {
  return (
    <div className="min-h-screen bg-bg-app flex justify-center selection:bg-brand-primary-soft selection:text-brand-primary">
      <div className="w-full max-w-md min-h-screen bg-bg-app flex flex-col relative shadow-2xl sm:border-x sm:border-border-default/80">
        {header && <div className="sticky top-0 z-40 w-full">{header}</div>}

        <main
          className={cn(
            'flex-1 w-full',
            withPadding && 'px-4 py-4',
            footer ? 'pb-24' : 'pb-6',
            className
          )}
        >
          {children}
        </main>

        {footer && <div className="sticky bottom-0 z-40 w-full">{footer}</div>}
      </div>
    </div>
  );
};
