'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  BookOpenCheck,
  CalendarCheck2,
  Menu,
} from 'lucide-react';

/**
 * 'attendance' and 'profile' are kept as legacy keys: both live under "More" now.
 */
export type TabKey =
  | 'dashboard'
  | 'members'
  | 'prep'
  | 'plan'
  | 'more'
  | 'attendance'
  | 'profile';

export interface TabBarProps {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  className?: string;
}

type PrimaryTabKey = 'dashboard' | 'members' | 'prep' | 'plan' | 'more';

const TABS: {
  key: PrimaryTabKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'dashboard', label: 'الرئيسية', href: '/dashboard', icon: Home },
  { key: 'members', label: 'المخدومين', href: '/members', icon: Users },
  { key: 'prep', label: 'تحضير', href: '/prep', icon: BookOpenCheck },
  { key: 'plan', label: 'تدبير', href: '/plan', icon: CalendarCheck2 },
  { key: 'more', label: 'المزيد', href: '/more', icon: Menu },
];

function inferTab(pathname: string | null): PrimaryTabKey {
  if (!pathname) return 'dashboard';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/members')) return 'members';
  if (pathname.startsWith('/prep') || pathname.startsWith('/preparations')) return 'prep';
  if (pathname.startsWith('/plan') || pathname.startsWith('/calendar') || pathname.startsWith('/year-plan'))
    return 'plan';
  return 'more';
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const normalizedActive: PrimaryTabKey | undefined =
    activeTab === 'attendance' || activeTab === 'profile' ? 'more' : activeTab;
  const currentTab: PrimaryTabKey = normalizedActive || inferTab(pathname);

  const handleTabClick = (tab: (typeof TABS)[number]) => {
    onTabChange?.(tab.key);
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
              id={`tab-${tab.key}`}
              type="button"
              onClick={() => handleTabClick(tab)}
              aria-current={isActive ? 'page' : undefined}
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
