'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TabBar } from '@/components/layout/TabBar';
import { ChurchLogo } from '@/components/layout/ChurchLogo';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { PollCard, PollItem } from '@/components/polls/PollCard';
import { api } from '@/lib/api';
import { getCopticDate } from '@shenoda/shared';
import { cn } from '@/lib/utils';
import { Bell, Megaphone, Pin, Vote, User, Loader2, ChevronLeft } from 'lucide-react';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  isRead: boolean;
  author?: { fullName: string; role?: { name: string } };
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const copticDate = getCopticDate();
  const gregorianDate = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const load = useCallback(async () => {
    try {
      const [annRes, pollRes] = await Promise.allSettled([
        api.get('/api/v1/announcements'),
        api.get('/api/v1/polls'),
      ]);
      if (annRes.status === 'fulfilled' && annRes.value.data?.success) {
        setAnnouncements(annRes.value.data.data || []);
      }
      if (pollRes.status === 'fulfilled' && pollRes.value.data?.success) {
        setPolls(pollRes.value.data.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const toggleAnnouncement = async (a: AnnouncementItem) => {
    setExpandedId((prev) => (prev === a.id ? null : a.id));
    if (!a.isRead) {
      try {
        await api.patch(`/api/v1/announcements/${a.id}/read`);
        setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isRead: true } : x)));
      } catch {
        /* non-blocking */
      }
    }
  };

  const openPolls = polls.filter((p) => !p.isClosed && new Date(p.closesAt) > new Date());
  const sortedAnnouncements = [...announcements].sort(
    (a, b) => Number(b.isPinned) - Number(a.isPinned) || +new Date(b.createdAt) - +new Date(a.createdAt)
  );
  const unreadCount = announcements.filter((a) => !a.isRead).length;

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          {/* Header: logo | church name + dates | bell + avatar */}
          <header className="sticky top-0 z-30 bg-bg-surface border-b border-border-default shadow-card px-4 py-3 flex items-center gap-3">
            <ChurchLogo />
            <div className="flex-1 min-w-0 text-right">
              <h1 className="text-body-default font-bold text-brand-primary leading-tight truncate">
                كنيسة الأنبا شنودة
              </h1>
              <p className="text-caption text-text-secondary truncate">
                {copticDate.formatted} • {gregorianDate}
              </p>
            </div>
            <button
              id="home-notifications"
              type="button"
              onClick={() => setIsNotifOpen(true)}
              aria-label="الإشعارات"
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-muted transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              id="home-avatar"
              type="button"
              onClick={() => router.push('/profile')}
              aria-label="الملف الشخصي"
              className="w-10 h-10 rounded-full bg-brand-primary-soft border border-[#D5E1F0] flex items-center justify-center text-brand-primary font-bold hover:bg-[#d8e3f0] transition-colors"
            >
              {user?.fullName ? user.fullName.trim().charAt(0) : <User className="w-5 h-5" />}
            </button>
          </header>

          <main className="px-4 py-4 flex flex-col gap-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3 text-text-secondary">
                <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                <span className="text-body-small">جاري التحميل...</span>
              </div>
            ) : (
              <>
                {/* Polls */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-h2 font-bold text-text-primary flex items-center gap-2">
                      <Vote className="w-5 h-5 text-brand-accent" />
                      استطلاعات الرأي
                    </h2>
                    {(user?.role?.level ?? 1) >= 3 && (
                      <button
                        type="button"
                        onClick={() => router.push('/announcements')}
                        className="text-caption font-semibold text-brand-primary flex items-center gap-0.5"
                      >
                        إدارة <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {openPolls.length === 0 ? (
                    <EmptyBox text="لا توجد استطلاعات مفتوحة حالياً" />
                  ) : (
                    openPolls.map((p) => <PollCard key={p.id} poll={p} onVoted={load} />)
                  )}
                </section>

                {/* Announcements */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-h2 font-bold text-text-primary flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-brand-accent" />
                    الإعلانات
                  </h2>
                  {sortedAnnouncements.length === 0 ? (
                    <EmptyBox text="لا توجد إعلانات حالياً" />
                  ) : (
                    sortedAnnouncements.map((a) => {
                      const open = expandedId === a.id;
                      return (
                        <article
                          key={a.id}
                          className={cn(
                            'bg-bg-surface border rounded-card p-4 shadow-card text-right transition-colors',
                            a.isRead ? 'border-border-default' : 'border-brand-primary/40'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAnnouncement(a)}
                            className="w-full text-right flex flex-col gap-1.5"
                          >
                            <div className="flex items-center gap-2">
                              {a.isPinned && <Pin className="w-3.5 h-3.5 text-brand-accent shrink-0" />}
                              <h3 className="text-body-default font-bold text-text-primary flex-1">
                                {a.title}
                              </h3>
                              {!a.isRead && <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />}
                            </div>
                            <p className={cn('text-body-small text-text-secondary leading-relaxed whitespace-pre-wrap', !open && 'line-clamp-2')}>
                              {a.content}
                            </p>
                            <span className="text-caption text-text-disabled">
                              {a.author?.fullName} •{' '}
                              {new Date(a.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                            </span>
                          </button>
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            )}
          </main>
        </div>

        <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        <TabBar activeTab="dashboard" />
      </div>
    </ProtectedRoute>
  );
}

const EmptyBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-5 bg-bg-surface border border-dashed border-border-default rounded-card text-center text-body-small text-text-secondary">
    {text}
  </div>
);
