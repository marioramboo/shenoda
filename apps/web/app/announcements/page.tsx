'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PollCard, PollItem } from '@/components/polls/PollCard';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
enum TargetScopeLevel {
  STAGE_SUBSET = 'STAGE_SUBSET',
  STAGE_ALL = 'STAGE_ALL',
  SECTOR_ALL = 'SECTOR_ALL',
  ORG_ALL = 'ORG_ALL',
}
import {
  Megaphone,
  Vote,
  Bell,
  Plus,
  Pin,
  CheckCircle2,
  Clock,
  Shield,
  Lock,
  X,
  AlertCircle,
  Sparkles,
  Send,
  Layers,
  ChevronLeft,
} from 'lucide-react';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetScopeType: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  author: {
    id: string;
    fullName: string;
    role?: { name: string; level: number };
  };
  targetStage?: { id: string; name: string } | null;
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'announcements' | 'polls'>('announcements');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'pinned'>('all');

  // Announcements State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Polls State
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoadingPolls, setIsLoadingPolls] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);

  // Notification Drawer
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Announcement Composer Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annScope, setAnnScope] = useState<TargetScopeLevel>(TargetScopeLevel.STAGE_ALL);
  const [annStageId, setAnnStageId] = useState<string>('');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [isSubmittingAnn, setIsSubmittingAnn] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Poll Composer Form State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollClosesAt, setPollClosesAt] = useState('');
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [pollComposerError, setPollComposerError] = useState<string | null>(null);

  const canAuthor = (user?.role?.level ?? 1) >= 3;
  const userLevel = user?.role?.level ?? 1;

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchPolls();
    }
  }, [user]);

  // Dynamic stages list (from API or user.scopes)
  const [stagesList, setStagesList] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchStages = async () => {
      try {
        const res = await api.get('/api/v1/stages');
        if (res.data?.success && Array.isArray(res.data.stages)) {
          if (isMounted) setStagesList(res.data.stages);
        }
      } catch {
        // Fallback silently to user.scopes.stages
      }
    };
    fetchStages();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableStages = useMemo(() => {
    return stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);
  }, [stagesList, user]);

  useEffect(() => {
    if (availableStages.length > 0 && !annStageId) {
      setAnnStageId(availableStages[0].id);
    }
  }, [availableStages, annStageId]);

  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const res = await api.get('/api/v1/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const fetchPolls = async () => {
    setIsLoadingPolls(true);
    try {
      const res = await api.get('/api/v1/polls');
      if (res.data.success) {
        setPolls(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
    } finally {
      setIsLoadingPolls(false);
    }
  };

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      await api.patch(`/api/v1/announcements/${announcementId}/read`);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, isRead: true, readAt: new Date().toISOString() } : a
        )
      );
    } catch (err) {
      console.error('Failed to mark announcement as read:', err);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      setComposerError('يرجى ملء عنوان الإعلان والمحتوى');
      return;
    }

    setIsSubmittingAnn(true);
    setComposerError(null);

    try {
      await api.post('/api/v1/announcements', {
        title: annTitle.trim(),
        content: annContent.trim(),
        targetScopeType: annScope,
        targetStageId: annStageId || user?.scopes?.stages?.[0]?.id,
        isPinned: annIsPinned,
        expiresAt: annExpiresAt ? new Date(annExpiresAt).toISOString() : undefined,
      });

      setIsComposerOpen(false);
      setAnnTitle('');
      setAnnContent('');
      setAnnIsPinned(false);
      setAnnExpiresAt('');
      await fetchAnnouncements();
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      const msg =
        err.response?.data?.error?.message ||
        'حدث خطأ أثناء نشر الإعلان، يرجى مراجعة الصلاحيات';
      setComposerError(msg);
    } finally {
      setIsSubmittingAnn(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOptions.length < 2 || !pollClosesAt) {
      setPollComposerError('يرجى كتابة السؤال وخيارين على الأقل وتحديد موعد الإغلاق');
      return;
    }

    setIsSubmittingPoll(true);
    setPollComposerError(null);

    try {
      await api.post('/api/v1/polls', {
        question: pollQuestion.trim(),
        options: validOptions,
        closesAt: new Date(pollClosesAt).toISOString(),
        allowMultiple: pollAllowMultiple,
        stageId: user?.scopes?.stages?.[0]?.id,
      });

      setIsPollComposerOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollClosesAt('');
      setPollAllowMultiple(false);
      await fetchPolls();
    } catch (err: any) {
      console.error('Error creating poll:', err);
      const msg =
        err.response?.data?.error?.message ||
        'حدث خطأ أثناء إنشاء استطلاع الرأي';
      setPollComposerError(msg);
    } finally {
      setIsSubmittingPoll(false);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filterMode === 'unread') return !a.isRead;
    if (filterMode === 'pinned') return a.isPinned;
    return true;
  });

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-app text-text-primary pb-24" dir="rtl">
        {/* App Bar */}
        <header className="sticky top-0 z-30 bg-brand-primary text-text-inverse px-4 py-3 shadow-card">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-input bg-white/10 text-brand-accent">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-h2 font-bold leading-tight">الإعلانات والتنبيهات</h1>
                <p className="text-caption text-brand-primary-soft">
                  منظومة التواصل واستطلاعات الرأي الكنسية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNotifDrawerOpen(true)}
                className="relative p-2 rounded-button bg-white/10 hover:bg-white/20 transition-colors text-white"
                title="مركز الإشعارات"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent text-brand-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-brand-primary">
                    {unreadCount}
                  </span>
                )}
              </button>

              {canAuthor && (
                <button
                  type="button"
                  onClick={() =>
                    activeTab === 'announcements'
                      ? setIsComposerOpen(true)
                      : setIsPollComposerOpen(true)
                  }
                  className="px-3.5 py-1.5 rounded-button bg-brand-accent text-brand-primary font-bold text-caption hover:bg-brand-accent-soft transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {activeTab === 'announcements' ? 'إعلان جديد' : 'استطلاع جديد'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="flex rounded-card bg-bg-surface p-1 border border-border-default shadow-card">
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`flex-1 py-2.5 rounded-input text-body-medium font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'announcements'
                  ? 'bg-brand-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              الإعلانات الرسمية
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-pill text-[11px] font-bold bg-brand-accent text-brand-primary">
                  {unreadCount} جديد
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('polls')}
              className={`flex-1 py-2.5 rounded-input text-body-medium font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'polls'
                  ? 'bg-brand-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Vote className="w-4 h-4" />
              استطلاعات الرأي ({polls.length})
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
          {activeTab === 'announcements' ? (
            <div>
              {/* Filter Chips */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-pill text-caption font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-brand-primary text-text-inverse'
                      : 'bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40'
                  }`}
                >
                  كل الإعلانات ({announcements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('unread')}
                  className={`px-3 py-1 rounded-pill text-caption font-semibold transition-all ${
                    filterMode === 'unread'
                      ? 'bg-brand-primary text-text-inverse'
                      : 'bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40'
                  }`}
                >
                  غير المقروءة ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('pinned')}
                  className={`px-3 py-1 rounded-pill text-caption font-semibold transition-all ${
                    filterMode === 'pinned'
                      ? 'bg-brand-primary text-text-inverse'
                      : 'bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40'
                  }`}
                >
                  المثبتة ({announcements.filter((a) => a.isPinned).length})
                </button>
              </div>

              {/* Feed List */}
              {isLoadingAnnouncements ? (
                <div className="py-16 text-center text-text-secondary">
                  جارٍ تحميل الإعلانات...
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="py-20 text-center bg-bg-surface rounded-card border border-border-default p-8 space-y-3">
                  <Megaphone className="w-12 h-12 text-brand-primary/30 mx-auto" />
                  <h3 className="text-h2 font-bold text-text-primary">لا توجد إعلانات حالياً</h3>
                  <p className="text-body-small text-text-secondary max-w-sm mx-auto">
                    {filterMode === 'unread'
                      ? 'لقد قرأت جميع الإعلانات الواردة إليك.'
                      : 'لم يتم نشر أي إعلانات موجهة لنطاقك حتى الآن.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAnnouncements.map((ann) => (
                    <article
                      key={ann.id}
                      className={`relative bg-bg-surface rounded-card border p-4 shadow-card transition-all ${
                        ann.isPinned
                          ? 'border-brand-accent/50 bg-brand-accent-soft/10 ring-1 ring-brand-accent/30'
                          : 'border-border-default'
                      } ${!ann.isRead ? 'border-r-4 border-r-brand-accent' : ''}`}
                    >
                      {/* Pinned & Read Status Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {ann.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-caption font-bold bg-brand-accent text-brand-primary shadow-sm">
                              <Pin className="w-3.5 h-3.5" />
                              إعلان مثبت
                            </span>
                          )}

                          {!ann.isRead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-bold bg-brand-accent-soft text-brand-accent border border-brand-accent/30">
                              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                              جديد
                            </span>
                          )}

                          {ann.targetStage && (
                            <span className="px-2 py-0.5 rounded-pill text-caption bg-bg-app text-text-secondary">
                              {ann.targetStage.name}
                            </span>
                          )}
                        </div>

                        <span className="text-caption text-text-secondary flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(ann.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-h2 font-bold text-text-primary mb-2 leading-snug">
                        {ann.title}
                      </h2>

                      {/* Body */}
                      <p className="text-body-default text-text-primary leading-relaxed whitespace-pre-line mb-4">
                        {ann.content}
                      </p>

                      {/* Author & Footer */}
                      <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-primary text-text-inverse font-bold text-caption flex items-center justify-center">
                            {ann.author.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-body-small font-bold text-text-primary leading-tight">
                              {ann.author.fullName}
                            </p>
                            <span className="text-[11px] text-text-secondary">
                              {ann.author.role?.name || 'مسؤول الخدمة'}
                            </span>
                          </div>
                        </div>

                        {!ann.isRead ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(ann.id)}
                            className="px-3 py-1 rounded-button bg-brand-primary-soft text-brand-primary font-semibold text-caption hover:bg-brand-primary hover:text-white transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تعيين كمقروء
                          </button>
                        ) : (
                          <span className="text-caption text-text-secondary flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                            تمت القراءة
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Polls Tab
            <div className="space-y-4">
              {isLoadingPolls ? (
                <div className="py-16 text-center text-text-secondary">
                  جارٍ تحميل استطلاعات الرأي...
                </div>
              ) : polls.length === 0 ? (
                <div className="py-20 text-center bg-bg-surface rounded-card border border-border-default p-8 space-y-3">
                  <Vote className="w-12 h-12 text-brand-primary/30 mx-auto" />
                  <h3 className="text-h2 font-bold text-text-primary">
                    لا توجد استطلاعات رأي نشطة
                  </h3>
                  <p className="text-body-small text-text-secondary max-w-sm mx-auto">
                    يمكن لأمناء الخدمة والمشرفين إنشاء استطلاعات سريعة للمشاركة في اتخاذ القرارات.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} onVoted={fetchPolls} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Drawer: New Announcement Composer */}
        {isComposerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsComposerOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-bg-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
              <div className="p-4 bg-brand-primary text-text-inverse flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-brand-accent" />
                  <h2 className="text-h2 font-bold">إنشاء إعلان رسمي جديد</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="p-1 rounded-button text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="flex-1 overflow-y-auto p-4 space-y-4">
                {composerError && (
                  <div className="p-3 rounded-input bg-status-danger-soft border border-status-danger/30 text-status-danger text-body-small flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{composerError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-body-small font-bold text-text-primary mb-1">
                    عنوان الإعلان <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="مثال: موعد اجتماع الخدام الطارئ"
                    className="w-full px-3 py-2 rounded-input border border-border-default focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-body-small font-bold text-text-primary mb-1">
                    نص الإعلان والمحتوى <span className="text-status-danger">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="اكتب تفاصيل الإعلان والتعليمات المنظمة هنا..."
                    className="w-full px-3 py-2 rounded-input border border-border-default focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* Audience Scoping with Upward-Addressing Ban Enforcement */}
                <div className="p-3.5 rounded-card bg-bg-app border border-border-default space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-primary" />
                    <label className="text-body-small font-bold text-text-primary">
                      نطاق توجيه الإعلان (قاعدة التسلسل الرئاسي FR-10.2)
                    </label>
                  </div>
                  <p className="text-caption text-text-secondary">
                    وفقاً لقواعد الكنيسة، لا يمكن توجيه إعلانات للمشرفين أو الرتب الأعلى منك.
                  </p>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="annScope"
                        checked={annScope === TargetScopeLevel.STAGE_ALL}
                        onChange={() => setAnnScope(TargetScopeLevel.STAGE_ALL)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-body-small font-medium text-text-primary">
                        خدام مرحلة محددة {availableStages.length === 1 && `(${availableStages[0].name})`}
                      </span>
                    </label>

                    {annScope === TargetScopeLevel.STAGE_ALL && availableStages.length > 1 && (
                      <div className="mr-6 my-1">
                        <select
                          value={annStageId || availableStages[0]?.id}
                          onChange={(e) => setAnnStageId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-body-small rounded-input border border-border-default bg-bg-surface text-text-primary focus:border-brand-primary focus:outline-none"
                        >
                          {availableStages.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label
                      className={`flex items-center gap-2.5 ${
                        userLevel < 4 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="annScope"
                        disabled={userLevel < 4}
                        checked={annScope === TargetScopeLevel.SECTOR_ALL}
                        onChange={() => setAnnScope(TargetScopeLevel.SECTOR_ALL)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-body-small font-medium text-text-primary">
                          كل خدام القطاع (مقتصر على أمين القطاع Level 4+)
                        </span>
                        {userLevel < 4 && <Lock className="w-3.5 h-3.5 text-text-disabled" />}
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-2.5 ${
                        userLevel < 5 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="annScope"
                        disabled={userLevel < 5}
                        checked={annScope === TargetScopeLevel.ORG_ALL}
                        onChange={() => setAnnScope(TargetScopeLevel.ORG_ALL)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-body-small font-medium text-text-primary">
                          الكنيسة بالكامل (مقتصر على الأمين العام Level 5)
                        </span>
                        {userLevel < 5 && <Lock className="w-3.5 h-3.5 text-text-disabled" />}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-input border border-border-default">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-brand-accent" />
                    <div>
                      <p className="text-body-small font-bold text-text-primary">تثبيت الإعلان</p>
                      <p className="text-[11px] text-text-secondary">
                        يظهر أعلى القائمة مع شارة الصليب الذهبي
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={annIsPinned}
                    onChange={(e) => setAnnIsPinned(e.target.checked)}
                    className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>

                <div className="pt-4 border-t border-border-default flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2 rounded-button text-text-secondary hover:bg-bg-app text-body-small font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAnn}
                    className="px-5 py-2 rounded-button bg-brand-primary text-text-inverse font-bold text-body-small hover:bg-brand-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingAnn ? 'جارٍ النشر...' : 'نشر الإعلان الآن'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: New Poll Composer */}
        {isPollComposerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsPollComposerOpen(false)}
            />
            <div className="relative w-full max-w-md bg-bg-surface rounded-card shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-brand-primary text-text-inverse flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-brand-accent" />
                  <h2 className="text-h2 font-bold">إنشاء استطلاع رأي جديد</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPollComposerOpen(false)}
                  className="p-1 rounded-button text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePoll} className="p-4 space-y-4">
                {pollComposerError && (
                  <div className="p-3 rounded-input bg-status-danger-soft text-status-danger text-body-small flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pollComposerError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-body-small font-bold text-text-primary mb-1">
                    سؤال الاستطلاع <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="مثال: ما هو الموعد الأنسب لليوم الرياضي؟"
                    className="w-full px-3 py-2 rounded-input border border-border-default focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-body-small font-bold text-text-primary">
                      الخيارات المتاحة (2 على الأقل) <span className="text-status-danger">*</span>
                    </label>
                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={addPollOption}
                        className="text-caption text-brand-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة خيار
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => updatePollOption(idx, e.target.value)}
                          placeholder={`الخيار ${idx + 1}`}
                          className="flex-1 px-3 py-2 rounded-input border border-border-default focus:border-brand-primary text-body-small"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(idx)}
                            className="p-2 text-status-danger hover:bg-status-danger-soft rounded-input"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-body-small font-bold text-text-primary mb-1">
                    موعد انتهاء الاستطلاع <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={pollClosesAt}
                    onChange={(e) => setPollClosesAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-input border border-border-default focus:border-brand-primary text-body-small"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-input border border-border-default">
                  <span className="text-body-small font-medium text-text-primary">
                    السماح باختيار أكثر من إجابة
                  </span>
                  <input
                    type="checkbox"
                    checked={pollAllowMultiple}
                    onChange={(e) => setPollAllowMultiple(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPollComposerOpen(false)}
                    className="px-4 py-2 rounded-button text-text-secondary hover:bg-bg-app text-body-small font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPoll}
                    className="px-5 py-2 rounded-button bg-brand-primary text-text-inverse font-bold text-body-small hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
                  >
                    {isSubmittingPoll ? 'جارٍ الإنشاء...' : 'بدء الاستطلاع'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slide-over Notification Center Drawer */}
        <NotificationDrawer
          isOpen={isNotifDrawerOpen}
          onClose={() => setIsNotifDrawerOpen(false)}
        />

        {/* Bottom Tab Bar */}
        <TabBar
          activeTab="plan"
          onTabChange={(tab) => {
            if (tab === 'dashboard') router.push('/dashboard');
            else if (tab === 'members') router.push('/members');
            else if (tab === 'attendance') router.push('/attendance');
            else if (tab === 'plan') router.push('/plan');
            else if (tab === 'profile') router.push('/preparations');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
