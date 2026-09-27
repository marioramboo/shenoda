import React from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarCheck2,
  UserCheck,
} from 'lucide-react';

export type TabKey = 'dashboard' | 'members' | 'attendance' | 'plan' | 'profile';

export interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutDashboard,
    },
    {
      key: 'members',
      label: 'المخدومين',
      icon: Users,
    },
    {
      key: 'attendance',
      label: 'الحضور',
      icon: ClipboardCheck,
    },
    {
      key: 'plan',
      label: 'الخطة',
      icon: CalendarCheck2,
    },
    {
      key: 'profile',
      label: 'حسابي',
      icon: UserCheck,
    },
  ];

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-bg-surface border-t border-border-default shadow-nav',
        className
      )}
    >
      <div className="max-w-md mx-auto h-16 px-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-caption transition-colors duration-150 select-none relative',
                isActive
                  ? 'text-brand-primary font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-brand-primary rounded-full" />
              )}
              <div
                className={cn(
                  'p-1 rounded-full transition-transform',
                  isActive && 'scale-110'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.3]' : 'stroke-[1.8]')} />
              </div>
              <span className="mt-0.5 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
