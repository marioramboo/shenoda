import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-bg-surface rounded-card p-4 border border-border-default shadow-card flex flex-col justify-between transition-all duration-200 hover:shadow-elevated',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-body-small font-medium text-text-secondary line-clamp-1">
          {label}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-button bg-brand-primary-soft text-brand-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="text-display font-bold text-text-primary tracking-tight">
          {value}
        </span>

        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-caption font-semibold px-2 py-0.5 rounded-pill',
              trend.direction === 'up' && 'bg-status-success-soft text-status-success',
              trend.direction === 'down' && 'bg-status-danger-soft text-status-danger',
              trend.direction === 'neutral' && 'bg-bg-muted text-text-secondary'
            )}
          >
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-caption text-text-secondary mt-1 line-clamp-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
