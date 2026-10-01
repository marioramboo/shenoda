'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import {
  PrepStatus,
  PREP_STATUS_LABELS,
  LessonAttachment,
} from '@shenoda/shared';
import {
  BookOpen,
  Plus,
  Calendar,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Search,
  ChevronLeft,
  X,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrepItem {
  id: string;
  authorUserId: string;
  stageId: string;
  lessonDate: string;
  title: string;
  scriptureRef?: string | null;
  mainObjective?: string | null;
  content: string;
  attachments?: LessonAttachment[] | null;
  status: PrepStatus;
  reviewerNotes?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  reviewedByLevel?: number | null;
  author?: { id: string; fullName: string };
  stage?: { id: string; name: string };
  reviewedBy?: { id: string; fullName: string; role?: { name: string } };
  createdAt: string;
}

export default function PreparationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isSupervisor = (user?.role.level || 1) >= 3;

  // Active view tab: 'mine' (تحضيراتي) | 'stage' (تحضيرات المرحلة للمشرفين)
  const [activeTab, setActiveTab] = useState<'mine' | 'stage'>('mine');
  const [preps, setPreps] = useState<PrepItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const availableStages = stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lessonDate, setLessonDate] = useState(() => {
    const nextFriday = new Date();
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7));
    return nextFriday.toISOString().split('T')[0];
  });
  const [stageId, setStageId] = useState<string>('');
  const [createStageId, setCreateStageId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [mainObjective, setMainObjective] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<PrepStatus>(PrepStatus.SUBMITTED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync stageId defaults
  useEffect(() => {
    if (availableStages.length > 0) {
      if (!createStageId) setCreateStageId(availableStages[0].id);
      // For level <= 3 servants, default stageId to their assigned stage
      if (user?.role?.level && user.role.level <= 3 && !stageId) {
        setStageId(availableStages[0].id);
      }
    }
  }, [availableStages, stageId, createStageId, user]);

  // Review Modal State (For supervisors)
  const [reviewModalPrep, setReviewModalPrep] = useState<PrepItem | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Fetch preps
  const fetchPreps = async () => {
    try {
      setIsLoading(true);
      const scopeParam = activeTab === 'mine' ? 'mine' : 'stage';
      const stageParam = stageId ? `&stageId=${stageId}` : '';
      const res = await api.get(`/api/v1/preparations?scope=${scopeParam}${stageParam}`);
      if (res.data?.data) {
        setPreps(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load lesson preparations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreps();
  }, [activeTab, stageId]);

  // Filtered preps
  const filteredPreps = useMemo(() => {
    if (!searchQuery.trim()) return preps;
    const q = searchQuery.toLowerCase();
    return preps.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.scriptureRef && p.scriptureRef.toLowerCase().includes(q)) ||
        (p.author?.fullName && p.author.fullName.toLowerCase().includes(q))
    );
  }, [preps, searchQuery]);

  // Handle Create Prep
  const handleCreatePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const targetStage = createStageId || stageId || availableStages[0]?.id;
    if (!title.trim() || !content.trim() || !targetStage) {
      setSubmitError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/v1/preparations', {
        stageId: targetStage,
        lessonDate,
        title: title.trim(),
        scriptureRef: scriptureRef.trim() || undefined,
        mainObjective: mainObjective.trim() || undefined,
        content: content.trim(),
        status,
      });

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setTitle('');
        setScriptureRef('');
        setMainObjective('');
        setContent('');
        fetchPreps();
      }
    } catch (err: any) {
      console.error('Failed to submit preparation:', err);
      setSubmitError(err.response?.data?.error?.message || 'حدث خطأ أثناء حفظ التحضير');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Review Submit (Supervisor approval or rejection)
  const handleReview = async (action: 'APPROVE' | 'REJECT') => {
    if (!reviewModalPrep) return;

    try {
      setIsReviewing(true);
      const isApproved = action === 'APPROVE';
      const defaultNote = isApproved
        ? 'تم الاطلاع واعتماد التحضير'
        : 'يرجى مراجعة وتعديل محتوى الدرس وإعادة تقديمه';

      const res = await api.patch(`/api/v1/preparations/${reviewModalPrep.id}`, {
        reviewerNotes: reviewerNotes.trim() || defaultNote,
        status: isApproved ? PrepStatus.REVIEWED : PrepStatus.DRAFT,
      });

      if (res.data?.success) {
        setReviewModalPrep(null);
        setReviewerNotes('');
        fetchPreps();
      }
    } catch (err) {
      console.error('Failed to review preparation:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (s: PrepStatus) => {
    switch (s) {
      case PrepStatus.REVIEWED:
        return (
          <Badge variant="success" withDot>
            تمت المراجعة
          </Badge>
        );
      case PrepStatus.SUBMITTED:
        return (
          <Badge variant="primary" withDot>
            تم التسليم
          </Badge>
        );
      case PrepStatus.DRAFT:
        return (
          <Badge variant="neutral" withDot>
            مسودة
          </Badge>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-app text-text-primary pb-28">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 bg-bg-surface/95 backdrop-blur-md border-b border-border-default shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-h2 font-bold text-text-primary">تحضير الدروس</h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  كتابة وتنظيم ومراجعة الدروس الأسبوعية
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-[38px] px-3.5 text-body-small font-bold"
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>تحضير جديد</span>
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={cn(
                  'flex-1 py-1.5 rounded-pill text-caption font-semibold transition-all border',
                  activeTab === 'mine'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                    : 'bg-bg-muted text-text-secondary border-border-default hover:text-text-primary'
                )}
              >
                تحضيراتي الشخصية
              </button>

              {isSupervisor && (
                <button
                  type="button"
                  onClick={() => setActiveTab('stage')}
                  className={cn(
                    'flex-1 py-1.5 rounded-pill text-caption font-semibold transition-all border',
                    activeTab === 'stage'
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-bg-muted text-text-secondary border-border-default hover:text-text-primary'
                  )}
                >
                  تحضيرات خدام المرحلة
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-md mx-auto px-4 pt-3 space-y-3">
          {/* Stage Selector Chips Bar for Supervisors (FR-5.2 / Multi-stage oversight) */}
          {availableStages.length > 0 && isSupervisor && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              <Chip
                selected={!stageId}
                onClick={() => setStageId('')}
              >
                الكل
              </Chip>
              {availableStages.map((stg) => (
                <Chip
                  key={stg.id}
                  selected={stageId === stg.id}
                  onClick={() => setStageId(stg.id)}
                >
                  {stg.name}
                </Chip>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في عنوان الدرس أو الشاهد..."
              className="w-full bg-bg-surface border border-border-default rounded-card py-2 pr-9 pl-4 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>

          {/* Preparations List */}
          {isLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
              <p className="text-body-small">جارٍ تحميل التحضيرات...</p>
            </div>
          ) : filteredPreps.length === 0 ? (
            <div className="text-center py-12 bg-bg-surface rounded-card border border-border-default">
              <BookOpen className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
              <p className="text-body font-bold text-text-secondary">لا توجد تحضيرات مسجلة</p>
              <p className="text-caption text-text-tertiary mt-1">
                اضغط على زر &quot;تحضير جديد&quot; للبدء في كتابة الدرس
              </p>
            </div>
          ) : (
            filteredPreps.map((prep) => {
              const formattedDate = new Date(prep.lessonDate).toLocaleDateString('ar-EG', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={prep.id}
                  className="bg-bg-surface rounded-card p-4 border border-border-default shadow-card space-y-3 hover:border-brand-primary/30 transition-all"
                >
                  {/* Header Row: Title, Date, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-brand-primary flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formattedDate}</span>
                        </span>
                        {prep.stage && (
                          <span className="text-caption text-text-tertiary bg-bg-muted px-2 py-0.5 rounded-full">
                            {prep.stage.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-body font-bold text-text-primary">{prep.title}</h3>
                    </div>

                    {getStatusBadge(prep.status)}
                  </div>

                  {/* Scripture & Author */}
                  <div className="flex flex-wrap items-center gap-2 text-caption">
                    {prep.scriptureRef && (
                      <span className="bg-brand-primary-soft text-brand-primary px-2.5 py-0.5 rounded-pill font-semibold">
                        {prep.scriptureRef}
                      </span>
                    )}
                    {prep.author && activeTab === 'stage' && (
                      <span className="text-text-secondary font-medium">
                        الخادم: <span className="text-text-primary font-bold">{prep.author.fullName}</span>
                      </span>
                    )}
                  </div>

                  {/* Objective & Content Preview */}
                  {prep.mainObjective && (
                    <div className="text-caption text-text-secondary bg-bg-muted/80 p-2 rounded-card">
                      <span className="font-bold text-text-primary block mb-0.5">الهدف من الدرس:</span>
                      <p className="line-clamp-2">{prep.mainObjective}</p>
                    </div>
                  )}

                  <p className="text-body-small text-text-secondary line-clamp-3 leading-relaxed">
                    {prep.content}
                  </p>

                  {/* Reviewer Notes Callout */}
                  {(prep.reviewerNotes || (prep.status === PrepStatus.DRAFT && (prep.reviewedByName || prep.reviewedBy))) && (
                    <div className={cn(
                      "border rounded-card p-3 flex items-start gap-2.5 shadow-sm",
                      prep.status === PrepStatus.DRAFT
                        ? "bg-status-danger-soft/80 border-status-danger/30 text-status-danger"
                        : "bg-status-success-soft/60 border-status-success/30 text-status-success"
                    )}>
                      {prep.status === PrepStatus.DRAFT ? (
                        <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                      )}
                      <div className="text-caption flex-1 text-right">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className={cn(
                            "font-bold",
                            prep.status === PrepStatus.DRAFT ? "text-status-danger" : "text-status-success"
                          )}>
                            {prep.status === PrepStatus.DRAFT
                              ? 'ملاحظات طلب التعديل (سبب الرفض):'
                              : 'ملاحظات وتوجيهات المشرف:'}
                          </span>
                          {(prep.reviewedByName || prep.reviewedBy?.fullName) && (
                            <span className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              prep.status === PrepStatus.DRAFT
                                ? "bg-status-danger/10 text-status-danger border-status-danger/20"
                                : "bg-status-success/10 text-status-success border-status-success/20"
                            )}>
                              بواسطة: {prep.reviewedByName || prep.reviewedBy?.fullName} {prep.reviewedByRole ? `(${prep.reviewedByRole})` : prep.reviewedBy?.role?.name ? `(${prep.reviewedBy?.role?.name})` : ''}
                            </span>
                          )}
                        </div>
                        {prep.reviewerNotes ? (
                          <div className={cn(
                            "p-2 rounded border text-body-small text-text-primary whitespace-pre-wrap leading-relaxed",
                            prep.status === PrepStatus.DRAFT
                              ? "bg-white/80 dark:bg-bg-surface/90 border-status-danger/20"
                              : "bg-white/80 dark:bg-bg-surface/90 border-status-success/20"
                          )}>
                            {prep.reviewerNotes}
                          </div>
                        ) : (
                          <p className="text-[11px] text-status-danger/90">
                            تم طلب إعادة تعديل هذا التحضير من قِبل المشرف.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Supervisor Review Action Button */}
                  {isSupervisor && activeTab === 'stage' && (
                    <div className="pt-1 border-t border-border-default/60">
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => {
                          setReviewModalPrep(prep);
                          setReviewerNotes(prep.reviewerNotes || '');
                        }}
                        className="h-[36px] text-body-small"
                      >
                        <MessageSquare className="w-3.5 h-3.5 ml-1.5" />
                        <span>مراجعة الدرس وإضافة تقييم</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>

        {/* Create Prep Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md max-h-[90vh] flex flex-col rounded-t-sheet sm:rounded-card border border-border-default shadow-card overflow-hidden">
              <div className="p-4 border-b border-border-default flex items-center justify-between shrink-0">
                <h3 className="text-body font-bold text-text-primary">إعداد تحضير جديد</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePrep} className="flex-1 overflow-y-auto p-4 space-y-3">
                {submitError && (
                  <div className="p-2.5 bg-status-danger-soft text-status-danger rounded-card text-caption font-medium">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    المرحلة الدراسية:
                  </label>
                  <select
                    value={createStageId || stageId || availableStages[0]?.id || ''}
                    onChange={(e) => setCreateStageId(e.target.value)}
                    className="w-full bg-bg-muted border border-border-default rounded-card px-3 py-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary font-cairo"
                    required
                  >
                    {availableStages.map((stg) => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    تاريخ إلقاء الدرس:
                  </label>
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full bg-bg-muted border border-border-default rounded-card px-3 py-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    عنوان الدرس:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: دعوة إبراهيم الخليل وطاعته"
                    className="w-full bg-bg-muted border border-border-default rounded-card px-3 py-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    الشاهد الكتابي:
                  </label>
                  <input
                    type="text"
                    value={scriptureRef}
                    onChange={(e) => setScriptureRef(e.target.value)}
                    placeholder="مثال: تكوين 12: 1-9"
                    className="w-full bg-bg-muted border border-border-default rounded-card px-3 py-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    الهدف العام للدرس:
                  </label>
                  <input
                    type="text"
                    value={mainObjective}
                    onChange={(e) => setMainObjective(e.target.value)}
                    placeholder="ما الرسالة الروحية التي تريد توصيلها للطفل/المخدوم؟"
                    className="w-full bg-bg-muted border border-border-default rounded-card px-3 py-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    محتوى التحضير والوسائل الإيضاحية:
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="اكتب مقدمة الدرس، النقاط الرئيسية، الآية للحفظ، والأسئلة التطبيقية..."
                    rows={6}
                    className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isSubmitting}
                    className="h-[42px]"
                  >
                    تسليم التحضير
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setIsCreateModalOpen(false)}
                    className="h-[42px]"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal (Supervisor) */}
        {reviewModalPrep && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md rounded-t-sheet sm:rounded-card p-4 border border-border-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-body font-bold text-text-primary">
                  مراجعة درس: {reviewModalPrep.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewModalPrep(null)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-caption font-semibold text-text-secondary block mb-1">
                  ملاحظات وتوجيهات أمين الخدمة:
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="اكتب التوجيهات أو الملاحظات البناءة للخادم..."
                  rows={4}
                  className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border-default">
                {/* 1. زر الموافقة */}
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={isReviewing}
                  onClick={() => handleReview('APPROVE')}
                  className="h-[40px] bg-status-success hover:bg-status-success/90 text-white gap-1.5 font-semibold text-caption"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>موافقة واعتماد</span>
                </Button>

                {/* 2. زر الرفض */}
                <Button
                  variant="outline"
                  fullWidth
                  isLoading={isReviewing}
                  onClick={() => handleReview('REJECT')}
                  className="h-[40px] text-status-danger border-[#F5C2BE] hover:bg-status-danger-soft gap-1.5 font-semibold text-caption"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض (طلب إعادة التحضير)</span>
                </Button>

                {/* 3. زر الإلغاء */}
                <Button
                  variant="outline"
                  fullWidth
                  disabled={isReviewing}
                  onClick={() => setReviewModalPrep(null)}
                  className="h-[40px] text-text-secondary hover:text-text-primary text-caption"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Global Bottom Tab Bar */}
        <TabBar
          activeTab="plan"
          onTabChange={(tab) => {
            if (tab === 'dashboard') router.push('/dashboard');
            else if (tab === 'members') router.push('/members');
            else if (tab === 'attendance') router.push('/attendance');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
