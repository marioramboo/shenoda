'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TabBar } from '@/components/layout/TabBar';
import {
  BarChart3,
  BookHeart,
  Users,
  Megaphone,
  CalendarDays,
  ClipboardList,
  Shield,
  ShieldAlert,
  UserCircle,
  LogOut,
  ChevronLeft,
  FileCheck2,
} from 'lucide-react';

interface MoreItem {
  id: string;
  title: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minLevel?: number;
  tint: string;
}

const ITEMS: MoreItem[] = [
  { id: 'admin-center', title: '⚡ لوحة تحكم مدير النظام', hint: 'الرقابة الشاملة، سجل التغييرات الحية، وإدارة النظام', href: '/admin', icon: ShieldAlert, minLevel: 6, tint: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' },
  { id: 'profile', title: 'حسابي', hint: 'بياناتي الشخصية وإعدادات الحساب', href: '/profile', icon: UserCircle, tint: 'bg-brand-primary-soft text-brand-primary' },
  { id: 'spiritual', title: 'المفكرة الروحية', hint: 'الصلاة، الكتاب المقدس، الصوم والاعتراف (خاصة)', href: '/spiritual', icon: BookHeart, tint: 'bg-brand-accent-soft text-brand-accent' },
  { id: 'analytics', title: 'التحليلات والتقارير', hint: 'مؤشرات الحضور وتصدير PDF/Excel', href: '/analytics', icon: BarChart3, minLevel: 3, tint: 'bg-brand-primary-soft text-brand-primary' },
  { id: 'servants', title: 'الخدام', hint: 'متابعة الخدام وبياناتهم', href: '/attendance?view=servants', icon: Users, minLevel: 3, tint: 'bg-status-success-soft text-status-success' },
  { id: 'announcements', title: 'إدارة الإعلانات والاستطلاعات', hint: 'نشر إعلان أو إنشاء استطلاع', href: '/announcements', icon: Megaphone, minLevel: 3, tint: 'bg-brand-accent-soft text-brand-accent' },
  { id: 'reviews', title: 'مراجعة التحضيرات', hint: 'تحضيرات الخدام واعتمادها', href: '/preparations', icon: FileCheck2, minLevel: 2, tint: 'bg-status-info-soft text-status-info' },
  { id: 'attendance', title: 'سجل الحضور والافتقاد', hint: 'جداول المتابعة وتنبيهات الغياب', href: '/attendance', icon: ClipboardList, tint: 'bg-status-success-soft text-status-success' },
  { id: 'calendar', title: 'التقويم', hint: 'المواعيد والفعاليات القادمة', href: '/calendar', icon: CalendarDays, tint: 'bg-brand-primary-soft text-brand-primary' },
  { id: 'admin', title: 'إدارة الخدمة', hint: 'إضافة الخدام، النقل والإيقاف', href: '/admin', icon: Shield, minLevel: 3, tint: 'bg-brand-accent-soft text-brand-accent' },
];

export default function MorePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const level = user?.role?.level ?? 1;

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card h-14 px-4 flex items-center">
            <h1 className="text-h2 font-bold">المزيد</h1>
          </header>

          <main className="px-4 py-4 flex flex-col gap-4">
            <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-primary-soft border border-[#D5E1F0] text-brand-primary font-bold text-lg flex items-center justify-center">
                {user?.fullName?.trim().charAt(0)}
              </div>
              <div className="text-right min-w-0">
                <p className="text-body-default font-bold text-text-primary truncate">{user?.fullName}</p>
                <p className="text-caption text-text-secondary">{user?.role?.name}</p>
              </div>
            </section>

            <nav aria-label="قائمة المزيد" className="flex flex-col gap-2">
              {ITEMS.filter((i) => level >= (i.minLevel ?? 1)).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`more-${item.id}`}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex items-center gap-3 text-right hover:border-brand-primary/50 transition-colors group"
                  >
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.tint}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-default font-bold text-text-primary">{item.title}</span>
                      <span className="block text-caption text-text-secondary">{item.hint}</span>
                    </span>
                    <ChevronLeft className="w-4 h-4 text-text-secondary group-hover:text-brand-primary transition-colors" />
                  </button>
                );
              })}
            </nav>

            <button
              id="more-logout"
              type="button"
              onClick={handleLogout}
              className="h-12 rounded-button border border-status-danger/30 text-status-danger font-semibold flex items-center justify-center gap-2 hover:bg-status-danger-soft transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </main>
        </div>
        <TabBar activeTab="more" />
      </div>
    </ProtectedRoute>
  );
}
