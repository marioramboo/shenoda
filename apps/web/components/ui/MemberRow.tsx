import React from 'react';
import { cn } from '@/lib/utils';
import { Badge, BadgeProps } from './Badge';
import { ChevronLeft } from 'lucide-react';

export interface MemberRowProps {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  badgeText?: string;
  badgeVariant?: BadgeProps['variant'];
  onClick?: () => void;
  className?: string;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  name,
  subtitle,
  avatarUrl,
  badgeText,
  badgeVariant = 'neutral',
  onClick,
  className,
}) => {
  // Extract Arabic initials (first 2 words)
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('');

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'w-full flex items-center justify-between p-3.5 bg-bg-surface rounded-card border border-border-default transition-all duration-150',
        onClick && 'cursor-pointer hover:bg-bg-muted/40 hover:border-text-secondary/40 active:bg-bg-muted select-none',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-11 h-11 rounded-full object-cover shrink-0 border border-border-default"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-brand-primary-soft text-brand-primary font-bold text-body-medium flex items-center justify-center shrink-0 border border-border-default">
            {initials || 'م'}
          </div>
        )}

        <div className="flex flex-col min-w-0 text-right">
          <span className="text-body-default font-semibold text-text-primary truncate">
            {name}
          </span>
          {subtitle && (
            <span className="text-caption text-text-secondary truncate mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 mr-2">
        {badgeText && (
          <Badge variant={badgeVariant} withDot>
            {badgeText}
          </Badge>
        )}
        <ChevronLeft className="w-5 h-5 text-text-secondary shrink-0" />
      </div>
    </div>
  );
};
