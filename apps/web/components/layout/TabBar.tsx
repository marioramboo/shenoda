'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  className?: string;
}

const TABS: {
  key: TabKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'dashboard',
    label: 'الرئيسية',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'members',
    label: 'المخدومين',
    href: '/members',
    icon: Users,
  },
  {
    key: 'attendance',
    label: 'الحضور',
    href: '/attendance',
    icon: ClipboardCheck,
  },
  {
    key: 'plan',
    label: 'الخطة',
    href: '/plan',
    icon: CalendarCheck2,
  },
  {
    key: 'profile',
    label: 'حسابي',
    href: '/profile',
    icon: UserCheck,
  },
];

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Inferred tab from current pathname if activeTab is not explicitly specified
  const currentTab: TabKey =
    activeTab ||
    (pathname?.startsWith('/members')
      ? 'members'
      : pathname?.startsWith('/attendance')
      ? 'attendance'
      : pathname?.startsWith('/plan')
      ? 'plan'
      : pathname?.startsWith('/profile')
      ? 'profile'
      : 'dashboard');

  const handleTabClick = (tab: (typeof TABS)[number]) => {
    if (onTabChange) {
      onTabChange(tab.key);
    }
    if (pathname !== tab.href) {
      router.push(tab.href);
    }
  };

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-bg-surface border-t border-border-default shadow-nav',
        className
      )}
    >
      <div className="max-w-md mx-auto h-16 px-2 flex items-center justify-around">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-caption transition-colors duration-150 select-none relative cursor-pointer',
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
