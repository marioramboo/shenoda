import React from 'react';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@shenoda/shared';
import { Check, X, Clock, HelpCircle } from 'lucide-react';

export interface AttendanceToggleProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
}

export const AttendanceToggle: React.FC<AttendanceToggleProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  showLabels = true,
}) => {
  const options: {
    status: AttendanceStatus;
    label: string;
    icon: React.ReactNode;
    activeClasses: string;
  }[] = [
    {
      status: 'PRESENT',
      label: 'حاضر',
      icon: <Check className="w-4 h-4" strokeWidth={2.5} />,
      activeClasses: 'bg-status-success text-white border-status-success shadow-sm',
    },
    {
      status: 'ABSENT',
      label: 'غائب',
      icon: <X className="w-4 h-4" strokeWidth={2.5} />,
      activeClasses: 'bg-status-danger text-white border-status-danger shadow-sm',
    },
    {
      status: 'EXCUSED',
      label: 'معتذر',
      icon: <Clock className="w-4 h-4" strokeWidth={2.5} />,
      activeClasses: 'bg-status-warning text-white border-status-warning shadow-sm',
    },
    {
      status: 'UNSET',
      label: 'غير محدد',
      icon: <HelpCircle className="w-4 h-4" strokeWidth={2} />,
      activeClasses: 'bg-text-secondary text-white border-text-secondary shadow-sm',
    },
  ];

  return (
    <div
      role="group"
      aria-label="تسجيل الحضور"
      className={cn(
        'inline-flex items-center p-1 bg-bg-muted rounded-pill border border-border-default select-none',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = value === opt.status;
        return (
          <button
            key={opt.status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.status)}
            aria-pressed={isSelected}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-pill text-body-small font-medium transition-all duration-150',
              isSelected
                ? opt.activeClasses
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/60'
            )}
          >
            {opt.icon}
            {showLabels && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
