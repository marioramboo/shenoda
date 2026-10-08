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
  Trash2,
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
  targetSector?: { id: string; name: string } | null;
}

interface StageSelectorProps {
  title: string;
  subtitle: string;
  stages: Array<{ id: string; name: string }>;
  selectedStageIds: string[];
  isAllStages: boolean;
  onToggleAll: () => void;
  onToggleStage: (id: string) => void;
}

function StageSelectorList({
  title,
  subtitle,
  stages,
  selectedStageIds,
  isAllStages,
  onToggleAll,
  onToggleStage,
}: StageSelectorProps) {
  return (
    <div className="p-3.5 rounded-card bg-bg-app border border-border-default space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-primary" />
          <label className="text-body-small font-bold text-text-primary">
            {title}
          </label>
        </div>
        {isAllStages ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-brand-accent text-brand-primary shadow-sm">
            كامل القطاع ({stages.length})
          </span>
        ) : (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-pill bg-bg-surface text-text-secondary border border-border-default">
            {selectedStageIds.length} من {stages.length} مراحل
          </span>
        )}
      </div>

      <p className="text-caption text-text-secondary">
        {subtitle}
      </p>

      <div className="rounded-input border border-border-default overflow-hidden bg-bg-surface divide-y divide-border-default">
        {/* Toggle All Stages */}
        <div
          onClick={onToggleAll}
          className={`p-2.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
            isAllStages ? 'bg-brand-primary/10 font-bold' : 'hover:bg-bg-app'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={isAllStages}
              onChange={onToggleAll}
              className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-body-small font-bold text-text-primary">
              الكل (جميع مراحل القطاع)
            </span>
          </div>
          <span className="text-[11px] text-text-secondary font-medium">
            {stages.length} مراحل
          </span>
        </div>

        {/* Individual Stages List */}
        <div className="max-h-48 overflow-y-auto divide-y divide-border-default/50">
          {stages.map((stage) => {
            const isChecked = selectedStageIds.includes(stage.id);
            return (
              <div
                key={stage.id}
                onClick={() => onToggleStage(stage.id)}
                className={`p-2.5 pr-8 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  isChecked ? 'bg-brand-primary/5' : 'hover:bg-bg-app'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleStage(stage.id)}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    className={`text-body-small ${
                      isChecked ? 'font-semibold text-brand-primary' : 'text-text-primary'
                    }`}
                  >
                    {stage.name}
                  </span>
                </div>
                {isChecked && (
                  <span className="text-[11px] text-brand-primary font-bold">
                    محدد ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Helper feedback message */}
      {selectedStageIds.length === 0 ? (
        <p className="text-[11px] text-status-danger font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          يرجى تحديد مرحلة واحدة على الأقل أو اختيار النشر للكل
        </p>
      ) : isAllStages ? (
        <p className="text-[11px] text-brand-primary font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
          سيصل لجميع خدام المراحل التابعة لقطاعك ({stages.length} مراحل)
        </p>
      ) : (
        <p className="text-[11px] text-text-secondary font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
          سيصل لخدام المراحل المحددة فقط ({selectedStageIds.length} مراحل)
        </p>
      )}
    </div>
  );
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

  // Sector Secretary Multi-Stage Targeting State (Announcements)
  const [annSelectedStageIds, setAnnSelectedStageIds] = useState<string[]>([]);
  const [annIsAllStages, setAnnIsAllStages] = useState(true);

  // Poll Composer Form State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollClosesAt, setPollClosesAt] = useState('');
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [pollComposerError, setPollComposerError] = useState<string | null>(null);

  // Sector Secretary Multi-Stage Targeting State (Polls)
  const [pollSelectedStageIds, setPollSelectedStageIds] = useState<string[]>([]);
  const [pollIsAllStages, setPollIsAllStages] = useState(true);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'announcement' | 'poll';
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canAuthor = (user?.role?.level ?? 1) >= 3;
  const userLevel = user?.role?.level ?? 1;

  const canDeleteAnnouncement = (ann: AnnouncementItem) => {
    if (!user) return false;
    if (user.id === ann.author.id) return true;
    if (userLevel >= 4) return true;
    return false;
  };

  const canDeletePoll = (poll: PollItem) => {
    if (!user) return false;
    if (poll.createdBy && user.id === poll.createdBy.id) return true;
    if (userLevel >= 4) return true;
    return false;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (deleteTarget.type === 'announcement') {
        await api.delete(`/api/v1/announcements/${deleteTarget.id}`);
        setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      } else {
        await api.delete(`/api/v1/polls/${deleteTarget.id}`);
        setPolls((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      const msg =
        err.response?.data?.error?.message ||
        'حدث خطأ أثناء محاولة الحذف، يرجى المحاولة لاحقاً';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

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
    if (availableStages.length > 0) {
      if (annSelectedStageIds.length === 0) {
        setAnnSelectedStageIds(availableStages.map((s: any) => s.id));
      }
      if (pollSelectedStageIds.length === 0) {
        setPollSelectedStageIds(availableStages.map((s: any) => s.id));
      }
      if (!annStageId) {
        setAnnStageId(availableStages[0].id);
      }
    }
  }, [availableStages]);

  const toggleAnnAll = () => {
    if (annIsAllStages || annSelectedStageIds.length === availableStages.length) {
      setAnnIsAllStages(false);
      setAnnSelectedStageIds([]);
    } else {
      setAnnIsAllStages(true);
      setAnnSelectedStageIds(availableStages.map((s: any) => s.id));
    }
  };

  const toggleAnnStage = (stageId: string) => {
    let next: string[];
    if (annSelectedStageIds.includes(stageId)) {
      next = annSelectedStageIds.filter((id) => id !== stageId);
    } else {
      next = [...annSelectedStageIds, stageId];
    }
    setAnnSelectedStageIds(next);
    setAnnIsAllStages(next.length === availableStages.length && availableStages.length > 0);
  };

  const togglePollAll = () => {
    if (pollIsAllStages || pollSelectedStageIds.length === availableStages.length) {
      setPollIsAllStages(false);
      setPollSelectedStageIds([]);
    } else {
      setPollIsAllStages(true);
      setPollSelectedStageIds(availableStages.map((s: any) => s.id));
    }
  };

  const togglePollStage = (stageId: string) => {
    let next: string[];
    if (pollSelectedStageIds.includes(stageId)) {
      next = pollSelectedStageIds.filter((id) => id !== stageId);
    } else {
      next = [...pollSelectedStageIds, stageId];
    }
    setPollSelectedStageIds(next);
    setPollIsAllStages(next.length === availableStages.length && availableStages.length > 0);
  };

  const openAnnouncementComposer = () => {
    setAnnTitle('');
    setAnnContent('');
    setAnnIsPinned(false);
    setAnnExpiresAt('');
    setComposerError(null);
    setAnnScope(TargetScopeLevel.STAGE_ALL);
    setAnnIsAllStages(true);
    setAnnSelectedStageIds(availableStages.map((s: any) => s.id));
    setIsComposerOpen(true);
  };

  const openPollComposer = () => {
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollClosesAt('');
    setPollAllowMultiple(false);
    setPollComposerError(null);
    setPollIsAllStages(true);
    setPollSelectedStageIds(availableStages.map((s: any) => s.id));
    setIsPollComposerOpen(true);
  };

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

    if (
      userLevel >= 4 &&
      annScope !== TargetScopeLevel.ORG_ALL &&
      !annIsAllStages &&
      annSelectedStageIds.length === 0
    ) {
      setComposerError('يرجى تحديد مرحلة واحدة على الأقل أو اختيار النشر لكافة مراحل القطاع');
      return;
    }

    setIsSubmittingAnn(true);
    setComposerError(null);

    try {
      const payload: any = {
        title: annTitle.trim(),
        content: annContent.trim(),
        isPinned: annIsPinned,
        expiresAt: annExpiresAt ? new Date(annExpiresAt).toISOString() : undefined,
      };

      if (userLevel >= 5 && annScope === TargetScopeLevel.ORG_ALL) {
        payload.targetScopeType = TargetScopeLevel.ORG_ALL;
      } else if (userLevel >= 4) {
        if (annIsAllStages || annSelectedStageIds.length === availableStages.length) {
          payload.targetScopeType = TargetScopeLevel.SECTOR_ALL;
          payload.targetSectorId = user?.scopes?.sectors?.[0]?.id || null;
          payload.targetStageIds = availableStages.map((s: any) => s.id);
        } else {
          payload.targetScopeType = TargetScopeLevel.STAGE_ALL;
          payload.targetStageIds = annSelectedStageIds;
          payload.targetStageId = annSelectedStageIds[0] || null;
          payload.targetSectorId = user?.scopes?.sectors?.[0]?.id || null;
        }
      } else {
        payload.targetScopeType = TargetScopeLevel.STAGE_ALL;
        payload.targetStageId = annStageId || user?.scopes?.stages?.[0]?.id || availableStages[0]?.id;
      }

      await api.post('/api/v1/announcements', payload);

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

    if (userLevel >= 4 && !pollIsAllStages && pollSelectedStageIds.length === 0) {
      setPollComposerError('يرجى تحديد مرحلة واحدة على الأقل أو اختيار النشر لكافة مراحل القطاع');
      return;
    }

    setIsSubmittingPoll(true);
    setPollComposerError(null);

    try {
      const payload: any = {
        question: pollQuestion.trim(),
        options: validOptions,
        closesAt: new Date(pollClosesAt).toISOString(),
        allowMultiple: pollAllowMultiple,
      };

      if (userLevel >= 4) {
        if (pollIsAllStages || pollSelectedStageIds.length === availableStages.length) {
          payload.isAllSector = true;
          payload.sectorId = user?.scopes?.sectors?.[0]?.id || null;
          payload.stageIds = availableStages.map((s: any) => s.id);
          payload.stageId = null;
        } else {
          payload.isAllSector = false;
          payload.stageIds = pollSelectedStageIds;
          payload.stageId = pollSelectedStageIds[0] || null;
          payload.sectorId = user?.scopes?.sectors?.[0]?.id || null;
        }
      } else {
        payload.stageId = user?.scopes?.stages?.[0]?.id || availableStages[0]?.id;
      }

      await api.post('/api/v1/polls', payload);

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
                      ? openAnnouncementComposer()
                      : openPollComposer()
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

                          {ann.targetStage ? (
                            <span className="px-2 py-0.5 rounded-pill text-caption bg-bg-app text-text-secondary border border-border-default font-medium">
                              {ann.targetStage.name}
                            </span>
                          ) : ann.targetSector ? (
                            <span className="px-2 py-0.5 rounded-pill text-caption bg-brand-primary-soft text-brand-primary font-medium">
                              {ann.targetSector.name} (كامل القطاع)
                            </span>
                          ) : ann.targetScopeType === 'SECTOR_ALL' ? (
                            <span className="px-2 py-0.5 rounded-pill text-caption bg-brand-primary-soft text-brand-primary font-medium">
                              كامل القطاع
                            </span>
                          ) : ann.targetScopeType === 'ORG_ALL' ? (
                            <span className="px-2 py-0.5 rounded-pill text-caption bg-brand-accent-soft text-brand-primary font-medium">
                              الكنيسة بالكامل
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-caption text-text-secondary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(ann.createdAt).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>

                          {canDeleteAnnouncement(ann) && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'announcement',
                                  id: ann.id,
                                  title: ann.title,
                                })
                              }
                              className="p-1 rounded-button text-text-secondary hover:text-status-danger hover:bg-status-danger-soft transition-colors"
                              title="حذف الإعلان"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      onVoted={fetchPolls}
                      canDelete={canDeletePoll(poll)}
                      onDelete={(p) =>
                        setDeleteTarget({
                          type: 'poll',
                          id: p.id,
                          title: p.question,
                        })
                      }
                    />
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

                {/* Audience Scoping with Multi-Stage Selection for Sector Secretary */}
                {userLevel >= 4 ? (
                  <div className="space-y-3">
                    <StageSelectorList
                      title="توجيه الإعلان إلى مراحل القطاع"
                      subtitle="يمكنك اختيار نشر الإعلان لكافة مراحل القطاع دفعة واحدة، أو تحديد مرحلة أو أكثر"
                      stages={availableStages}
                      selectedStageIds={annSelectedStageIds}
                      isAllStages={annIsAllStages}
                      onToggleAll={toggleAnnAll}
                      onToggleStage={toggleAnnStage}
                    />

                    {userLevel >= 5 && (
                      <div className="p-3 rounded-card bg-bg-app border border-border-default">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={annScope === TargetScopeLevel.ORG_ALL}
                            onChange={(e) =>
                              setAnnScope(
                                e.target.checked
                                  ? TargetScopeLevel.ORG_ALL
                                  : TargetScopeLevel.STAGE_ALL
                              )
                            }
                            className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-body-small font-bold text-text-primary">
                              نشر الإعلان للكنيسة بالكامل (مقتصر على الأمين العام Level 5)
                            </span>
                            <Lock className="w-3.5 h-3.5 text-brand-accent" />
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-card bg-bg-app border border-border-default space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-brand-primary" />
                      <label className="text-body-small font-bold text-text-primary">
                        نطاق توجيه الإعلان
                      </label>
                    </div>
                    <div className="p-2.5 rounded-input bg-bg-surface border border-border-default flex items-center justify-between">
                      <span className="text-body-small text-text-secondary">المرحلة المستهدفة:</span>
                      <span className="text-body-small font-bold text-brand-primary">
                        {availableStages[0]?.name || user?.scopes?.stages?.[0]?.name || 'المرحلة المسندة'}
                      </span>
                    </div>
                  </div>
                )}

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
            <div className="relative w-full max-w-md bg-bg-surface rounded-card shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-4 bg-brand-primary text-text-inverse flex items-center justify-between shrink-0">
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

              <form onSubmit={handleCreatePoll} className="p-4 space-y-4 overflow-y-auto flex-1">
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

                {/* Target Audience / Stage Selection for Poll */}
                {userLevel >= 4 ? (
                  <StageSelectorList
                    title="توجيه الاستطلاع إلى مراحل القطاع"
                    subtitle="يمكنك إنشاء الاستطلاع لكافة مراحل القطاع دفعة واحدة، أو تحديد مرحلة أو أكثر"
                    stages={availableStages}
                    selectedStageIds={pollSelectedStageIds}
                    isAllStages={pollIsAllStages}
                    onToggleAll={togglePollAll}
                    onToggleStage={togglePollStage}
                  />
                ) : (
                  <div className="p-3 rounded-card bg-bg-app border border-border-default space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Vote className="w-4 h-4 text-brand-primary" />
                      <span className="text-body-small font-bold text-text-primary">
                        نطاق الاستطلاع
                      </span>
                    </div>
                    <div className="p-2 rounded-input bg-bg-surface border border-border-default flex items-center justify-between">
                      <span className="text-caption text-text-secondary">المرحلة المستهدفة:</span>
                      <span className="text-body-small font-bold text-brand-primary">
                        {availableStages[0]?.name || user?.scopes?.stages?.[0]?.name || 'المرحلة المسندة'}
                      </span>
                    </div>
                  </div>
                )}

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

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeleteTarget(null)}
            />
            <div className="relative w-full max-w-sm bg-bg-surface rounded-card p-6 shadow-2xl border border-border-default text-center space-y-4 z-10 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-status-danger-soft text-status-danger flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-h2 font-bold text-text-primary mb-1.5">
                  {deleteTarget.type === 'announcement' ? 'تأكيد حذف الإعلان' : 'تأكيد حذف استطلاع الرأي'}
                </h3>
                <p className="text-body-small text-text-secondary">
                  هل أنت متأكد من رغبتك في حذف{' '}
                  <span className="font-bold text-text-primary">"{deleteTarget.title}"</span>؟
                </p>
                <p className="text-[12px] text-status-danger mt-1.5 font-medium">
                  {deleteTarget.type === 'announcement'
                    ? 'سيتم حذف الإعلان نهائياً ولا يمكن استرجاعه.'
                    : 'سيتم حذف الاستطلاع وكافة الأصوات المسجلة نهائياً.'}
                </p>
              </div>

              {deleteError && (
                <div className="p-2.5 rounded-input bg-status-danger-soft text-status-danger text-caption flex items-center gap-1.5 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 rounded-button bg-bg-app text-text-secondary font-semibold text-body-small hover:bg-border-default/50 transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-button bg-status-danger text-white font-bold text-body-small hover:bg-status-danger/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'جارٍ الحذف...' : 'نعم، حذف'}
                </button>
              </div>
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
