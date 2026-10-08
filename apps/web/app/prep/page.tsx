'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TabBar } from '@/components/layout/TabBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  Check,
  Loader2,
  Calendar,
  Sparkles,
  Users,
} from 'lucide-react';

interface LessonEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  category: string;
  stageId?: string;
  stage?: { id: string; name: string };
  description?: string | null;
  planId?: string;
}

interface LessonParsedInfo {
  bibleVerse: string;
  references: string;
  overview: string;
}

function parseLessonDescription(desc?: string | null): LessonParsedInfo {
  if (!desc) return { bibleVerse: '', references: '', overview: '' };
  if (desc.trim().startsWith('{')) {
    try {
      const p = JSON.parse(desc);
      return {
        bibleVerse: p.bibleVerse || '',
        references: p.references || '',
        overview: p.overview || '',
      };
    } catch {
      // fallback
    }
  }
  return { bibleVerse: '', references: '', overview: desc };
}

export default function CurriculumPrepPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSupervisor = (user?.role?.level ?? 1) >= 3;

  const [loading, setLoading] = useState(true);
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [lessons, setLessons] = useState<LessonEvent[]>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Lesson Authoring Modal state (for Stage Secretary / Supervisor: level >= 3)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonEvent | null>(null);
  const [lessonModalTitle, setLessonModalTitle] = useState('');
  const [lessonModalDate, setLessonModalDate] = useState('');
  const [lessonModalBibleVerse, setLessonModalBibleVerse] = useState('');
  const [lessonModalReferences, setLessonModalReferences] = useState('');
  const [lessonModalOverview, setLessonModalOverview] = useState('');
  const [lessonModalSubmitting, setLessonModalSubmitting] = useState(false);
  const [lessonModalError, setLessonModalError] = useState<string | null>(null);

  // User's own preparations map: eventId -> prep
  const [myPrepsMap, setMyPrepsMap] = useState<Record<string, any>>({});

  // Inspection data for current lesson
  const [inspectionData, setInspectionData] = useState<any | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectFilter, setInspectFilter] = useState<'all' | 'prepared' | 'unprepared'>('all');

  // Preparation Modal state (Photo 8)
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [prepObjective, setPrepObjective] = useState('');
  const [prepVisualAid, setPrepVisualAid] = useState('');
  const [prepElements, setPrepElements] = useState('');
  const [prepContent, setPrepContent] = useState('');
  const [prepExtraReferences, setPrepExtraReferences] = useState('');
  const [prepServantReflection, setPrepServantReflection] = useState('');
  const [prepSubmitting, setPrepSubmitting] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal state (for supervisors)
  const [reviewModalPrep, setReviewModalPrep] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load stages
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/v1/stages');
        if (res.data?.success && Array.isArray(res.data.stages)) {
          if (mounted) setStagesList(res.data.stages);
        }
      } catch {
        // fallback
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const availableStages = useMemo(() => {
    return stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);
  }, [stagesList, user]);

  useEffect(() => {
    if (availableStages.length > 0 && !selectedStageId) {
      setSelectedStageId(availableStages[0].id);
    }
  }, [availableStages, selectedStageId]);

  // Load year plans and lessons for selected stage
  const fetchLessons = useCallback(async () => {
    if (!selectedStageId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/year-plans?stageId=${selectedStageId}`);
      let allFoundLessons: LessonEvent[] = [];
      let foundPlanId: string | null = null;

      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        foundPlanId = res.data.data[0].id;
        for (const plan of res.data.data) {
          // If events are not populated in list, fetch plan detail
          if (Array.isArray(plan.events) && plan.events.length > 0) {
            allFoundLessons.push(
              ...plan.events
                .filter((e: any) => e.category === 'SPIRITUAL_LESSON')
                .map((e: any) => ({ ...e, planId: plan.id }))
            );
          } else {
            try {
              const detailRes = await api.get(`/api/v1/year-plans/${plan.id}`);
              if (detailRes.data?.success && Array.isArray(detailRes.data.data?.events)) {
                allFoundLessons.push(
                  ...detailRes.data.data.events
                    .filter((e: any) => e.category === 'SPIRITUAL_LESSON')
                    .map((e: any) => ({ ...e, planId: plan.id }))
                );
              }
            } catch {
              // ignore
            }
          }
        }
      }

      setCurrentPlanId(foundPlanId);

      // Sort by startDate
      allFoundLessons.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
      setLessons(allFoundLessons);

      // Select upcoming or nearest lesson
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const upcomingIdx = allFoundLessons.findIndex((l) => new Date(l.startDate) >= now);
      setSelectedLessonIndex(upcomingIdx >= 0 ? upcomingIdx : Math.max(0, allFoundLessons.length - 1));
    } catch (err) {
      console.error('Failed to load curriculum lessons:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStageId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // Load user's preparations
  const fetchMyPreps = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/preparations?scope=mine');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const map: Record<string, any> = {};
        for (const p of res.data.data) {
          if (p.eventId) map[p.eventId] = p;
          // also map by title match as fallback
          if (p.title) map[p.title.trim().toLowerCase()] = p;
        }
        setMyPrepsMap(map);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) fetchMyPreps();
  }, [user, fetchMyPreps]);

  const currentLesson = lessons[selectedLessonIndex] || null;
  const currentParsedInfo = useMemo(() => {
    return parseLessonDescription(currentLesson?.description);
  }, [currentLesson]);

  const userPrepForCurrent = useMemo(() => {
    if (!currentLesson) return null;
    return myPrepsMap[currentLesson.id] || myPrepsMap[currentLesson.title.trim().toLowerCase()] || null;
  }, [currentLesson, myPrepsMap]);

  // Load inspection for current lesson
  const fetchInspection = useCallback(async (eventId: string) => {
    setInspectionLoading(true);
    try {
      const res = await api.get(`/api/v1/preparations/lesson-inspection/${eventId}`);
      if (res.data?.success) {
        setInspectionData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inspection:', err);
      setInspectionData(null);
    } finally {
      setInspectionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentLesson && isSupervisor) {
      fetchInspection(currentLesson.id);
    } else {
      setInspectionData(null);
    }
  }, [currentLesson, isSupervisor, fetchInspection]);

  // Shift lesson
  const handleShiftLesson = (delta: number) => {
    const nextIdx = selectedLessonIndex + delta;
    if (nextIdx >= 0 && nextIdx < lessons.length) {
      setSelectedLessonIndex(nextIdx);
    }
  };

  // Open Preparation Modal (Photo 8)
  const handleOpenPrepModal = () => {
    if (!currentLesson) return;
    setPrepError(null);
    if (userPrepForCurrent) {
      setPrepObjective(userPrepForCurrent.mainObjective || '');
      setPrepVisualAid(
        userPrepForCurrent.visualAid || (userPrepForCurrent.attachments as any)?.visualAid || ''
      );
      setPrepElements(
        userPrepForCurrent.elements || (userPrepForCurrent.attachments as any)?.elements || ''
      );
      setPrepContent(userPrepForCurrent.content || '');
      setPrepExtraReferences(
        userPrepForCurrent.extraReferences ||
          (userPrepForCurrent.attachments as any)?.extraReferences ||
          ''
      );
      setPrepServantReflection(
        userPrepForCurrent.servantReflection ||
          (userPrepForCurrent.attachments as any)?.servantReflection ||
          ''
      );
    } else {
      setPrepObjective('');
      setPrepVisualAid('');
      setPrepElements('');
      setPrepContent('');
      setPrepExtraReferences('');
      setPrepServantReflection('');
    }
    setIsPrepModalOpen(true);
  };

  // Submit Preparation (Photo 8)
  const handleSubmitPrep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLesson) return;

    if (!prepObjective.trim() || !prepVisualAid.trim() || !prepContent.trim()) {
      setPrepError('يرجى ملء جميع الحقول الإلزامية: الهدف، وسيلة الإيضاح، ومحتوى الدرس');
      return;
    }

    setPrepSubmitting(true);
    setPrepError(null);

    try {
      if (userPrepForCurrent?.id) {
        await api.patch(`/api/v1/preparations/${userPrepForCurrent.id}`, {
          title: currentLesson.title,
          scriptureRef: currentParsedInfo.bibleVerse || undefined,
          mainObjective: prepObjective.trim(),
          visualAid: prepVisualAid.trim(),
          elements: prepElements.trim() || undefined,
          content: prepContent.trim(),
          extraReferences: prepExtraReferences.trim() || undefined,
          servantReflection: prepServantReflection.trim() || undefined,
        });
      } else {
        await api.post('/api/v1/preparations', {
          eventId: currentLesson.id,
          stageId: currentLesson.stageId || selectedStageId,
          lessonDate: currentLesson.startDate,
          title: currentLesson.title,
          scriptureRef: currentParsedInfo.bibleVerse || undefined,
          mainObjective: prepObjective.trim(),
          visualAid: prepVisualAid.trim(),
          elements: prepElements.trim() || undefined,
          content: prepContent.trim(),
          extraReferences: prepExtraReferences.trim() || undefined,
          servantReflection: prepServantReflection.trim() || undefined,
        });
      }

      setIsPrepModalOpen(false);
      setToastMessage('تم حفظ تحضير الدرس بنجاح!');
      setTimeout(() => setToastMessage(null), 3500);
      await fetchMyPreps();
      if (currentLesson) {
        await fetchInspection(currentLesson.id);
      }
    } catch (err: any) {
      setPrepError(err.response?.data?.error?.message || 'حدث خطأ أثناء حفظ التحضير');
    } finally {
      setPrepSubmitting(false);
    }
  };

  // Supervisor Review Action
  const handleReviewAction = async (status: 'REVIEWED' | 'DRAFT') => {
    if (!reviewModalPrep) return;
    setReviewSubmitting(true);
    try {
      await api.patch(`/api/v1/preparations/${reviewModalPrep.id}`, {
        status,
        reviewerNotes: reviewNotes.trim() || undefined,
      });
      setReviewModalPrep(null);
      setReviewNotes('');
      setToastMessage(status === 'REVIEWED' ? 'تم اعتماد التحضير بنجاح' : 'تم إرسال طلب التعديل');
      setTimeout(() => setToastMessage(null), 3500);
      if (currentLesson) {
        await fetchInspection(currentLesson.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'حدث خطأ أثناء المراجعة');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Open Create Lesson Modal
  const handleOpenCreateLessonModal = () => {
    setEditingLesson(null);
    setLessonModalTitle('');
    // Default date to upcoming Friday or today
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    setLessonModalDate(targetDate.toISOString().split('T')[0]);
    setLessonModalBibleVerse('');
    setLessonModalReferences('');
    setLessonModalOverview('');
    setLessonModalError(null);
    setIsLessonModalOpen(true);
  };

  // Open Edit Lesson Modal
  const handleOpenEditLessonModal = (lesson: LessonEvent) => {
    setEditingLesson(lesson);
    setLessonModalTitle(lesson.title || '');
    setLessonModalDate(
      lesson.startDate ? new Date(lesson.startDate).toISOString().split('T')[0] : ''
    );
    const parsed = parseLessonDescription(lesson.description);
    setLessonModalBibleVerse(parsed.bibleVerse || '');
    setLessonModalReferences(parsed.references || '');
    setLessonModalOverview(parsed.overview || '');
    setLessonModalError(null);
    setIsLessonModalOpen(true);
  };

  // Delete Lesson
  const handleDeleteLesson = async (lesson: LessonEvent) => {
    if (!confirm(`هل أنت متأكد من حذف درس "${lesson.title}" من المنهج؟`)) return;
    const targetPlanId = lesson.planId || currentPlanId;
    if (!targetPlanId) return;
    try {
      setLoading(true);
      await api.delete(`/api/v1/year-plans/${targetPlanId}/events/${lesson.id}`);
      setToastMessage('تم حذف الدرس بنجاح');
      setTimeout(() => setToastMessage(null), 3000);
      await fetchLessons();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'حدث خطأ أثناء حذف الدرس');
    } finally {
      setLoading(false);
    }
  };

  // Submit Lesson (Create or Edit)
  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonModalTitle.trim()) {
      setLessonModalError('يرجى كتابة اسم وموضوع الدرس');
      return;
    }
    if (!lessonModalDate) {
      setLessonModalError('يرجى تحديد تاريخ إلقاء الدرس بالخدمة');
      return;
    }
    if (!lessonModalReferences.trim()) {
      setLessonModalError('المراجع الكنسية إجبارية عند تدبير درس جديد للمنهج');
      return;
    }

    setLessonModalSubmitting(true);
    setLessonModalError(null);

    try {
      let planIdToUse = currentPlanId;

      // Auto-create YearPlan if one does not exist for this stage yet
      if (!planIdToUse) {
        const curYear = new Date().getFullYear();
        const stageObj = availableStages.find((s) => s.id === selectedStageId);
        const stageName = stageObj?.name || 'المرحلة';
        const newPlanRes = await api.post('/api/v1/year-plans', {
          title: `خطة منهج ${stageName} ${curYear}-${curYear + 1}`,
          academicYear: `${curYear}/${curYear + 1}`,
          scopeType: 'STAGE',
          stageId: selectedStageId,
          isPublished: true,
        });

        if (newPlanRes.data?.success && newPlanRes.data?.data?.id) {
          planIdToUse = newPlanRes.data.data.id;
          setCurrentPlanId(planIdToUse);
        } else {
          throw new Error('تعذر إنشاء خطة سنوية للمرحلة، يرجى المحاولة لاحقاً');
        }
      }

      if (editingLesson) {
        const targetPlanId = editingLesson.planId || planIdToUse;
        await api.patch(`/api/v1/year-plans/${targetPlanId}/events/${editingLesson.id}`, {
          title: lessonModalTitle.trim(),
          startDate: lessonModalDate,
          endDate: lessonModalDate,
          category: 'SPIRITUAL_LESSON',
          bibleVerse: lessonModalBibleVerse.trim(),
          references: lessonModalReferences.trim(),
          description: lessonModalOverview.trim(),
          requiresAllServants: true,
        });
        setToastMessage('تم تعديل بيانات الدرس في المنهج بنجاح');
      } else {
        await api.post(`/api/v1/year-plans/${planIdToUse}/events`, {
          title: lessonModalTitle.trim(),
          startDate: lessonModalDate,
          endDate: lessonModalDate,
          category: 'SPIRITUAL_LESSON',
          isLessonPlanCreation: true,
          requiresAllServants: true,
          bibleVerse: lessonModalBibleVerse.trim(),
          references: lessonModalReferences.trim(),
          description: lessonModalOverview.trim(),
          stageId: selectedStageId,
        });
        setToastMessage('تمت إضافة الدرس إلى منهج المرحلة بنجاح');
      }

      setTimeout(() => setToastMessage(null), 3000);
      setIsLessonModalOpen(false);
      await fetchLessons();
    } catch (err: any) {
      console.error('Failed to save lesson:', err);
      setLessonModalError(
        err.response?.data?.error?.message || err.message || 'حدث خطأ أثناء حفظ الدرس'
      );
    } finally {
      setLessonModalSubmitting(false);
    }
  };
  const lessonDateFormatted = useMemo(() => {
    if (!currentLesson?.startDate) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(currentLesson.startDate));
  }, [currentLesson]);

  // Inspection stats breakdown
  const preparedList = inspectionData?.preparedServants || [];
  const unpreparedList = inspectionData?.unpreparedServants || [];
  const reviewedCount = preparedList.filter((p: any) => p.preparation?.status === 'REVIEWED').length;
  const pendingCount = preparedList.filter((p: any) => p.preparation?.status !== 'REVIEWED').length;
  const unpreparedCount = unpreparedList.length;

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-accent" />
              <h1 className="text-h2 font-bold">منهج الدروس</h1>
            </div>
            <div className="flex items-center gap-2">
              {isSupervisor && (
                <button
                  id="btn-add-lesson-header"
                  type="button"
                  onClick={handleOpenCreateLessonModal}
                  className="h-8 px-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-button text-caption font-bold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة درس</span>
                </button>
              )}
              {availableStages.length > 1 && (
                <select
                  aria-label="اختيار المرحلة"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="h-9 px-2 text-caption bg-white/10 text-white rounded-button border border-white/20 focus:outline-none"
                >
                  {availableStages.map((s) => (
                    <option key={s.id} value={s.id} className="text-text-primary bg-bg-surface">
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </header>

          <main className="px-4 py-4 flex flex-col gap-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-text-secondary">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <span className="text-body-small">جاري تحميل منهج الدروس...</span>
              </div>
            ) : lessons.length === 0 ? (
              <div className="bg-bg-surface border border-border-default rounded-card p-8 text-center flex flex-col items-center shadow-card">
                <BookOpen className="w-12 h-12 text-text-secondary/40 mb-2" />
                <h3 className="text-body-default font-bold text-text-primary">
                  لا توجد دروس مسجلة في خطة هذه المرحلة
                </h3>
                <p className="text-caption text-text-secondary mt-1">
                  {isSupervisor
                    ? 'بصفتك أمين الخدمة، يمكنك البدء فوراً في إضافة دروس المنهج السنوي لهذه المرحلة.'
                    : 'يمكن لأمين المرحلة إضافة الدروس من قسم تدبير الخدمة.'}
                </p>
                {isSupervisor ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full justify-center">
                    <Button
                      id="btn-add-first-lesson"
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreateLessonModal}
                      className="gap-1.5 w-full sm:w-auto font-bold bg-brand-primary hover:bg-brand-primary/90 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول درس للمنهج</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/plan')}
                      className="gap-1.5 w-full sm:w-auto text-text-secondary border-border-default hover:bg-bg-muted"
                    >
                      الانتقال لتدبير الخدمة
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/plan')}
                    className="mt-4 gap-1.5"
                  >
                    الانتقال لتدبير الخدمة
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Date / Lesson Navigator (Photo 7: < الجمعة 9 أكتوبر >) */}
                <div className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card shadow-card px-2 h-12">
                  <button
                    id="prep-prev-lesson"
                    type="button"
                    disabled={selectedLessonIndex <= 0}
                    onClick={() => handleShiftLesson(-1)}
                    aria-label="الدرس السابق"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center text-center px-2 min-w-0">
                    <span className="text-caption font-bold text-brand-primary">
                      الدرس ({selectedLessonIndex + 1} من {lessons.length})
                    </span>
                    <span className="text-body-small font-semibold text-text-primary truncate">
                      {lessonDateFormatted}
                    </span>
                  </div>

                  <button
                    id="prep-next-lesson"
                    type="button"
                    disabled={selectedLessonIndex >= lessons.length - 1}
                    onClick={() => handleShiftLesson(1)}
                    aria-label="الدرس التالي"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Lesson Card (Photo 7) */}
                {currentLesson && (
                  <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
                    <div className="flex items-center justify-between pb-2 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-brand-accent bg-brand-accent-soft px-2.5 py-0.5 rounded-pill">
                          الدرس رقم {selectedLessonIndex + 1}
                        </span>
                        <span className="text-caption text-text-secondary">
                          {new Date(currentLesson.startDate).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSupervisor && (
                          <div className="flex items-center gap-1">
                            <button
                              id="btn-edit-lesson"
                              type="button"
                              onClick={() => handleOpenEditLessonModal(currentLesson)}
                              title="تعديل بيانات الدرس"
                              className="p-1.5 text-text-secondary hover:text-brand-primary hover:bg-bg-muted rounded-full transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              id="btn-delete-lesson"
                              type="button"
                              onClick={() => handleDeleteLesson(currentLesson)}
                              title="حذف الدرس"
                              className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-status-danger-soft rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {userPrepForCurrent ? (
                          <Badge
                            variant={
                              userPrepForCurrent.status === 'REVIEWED'
                                ? 'success'
                                : userPrepForCurrent.status === 'DRAFT' && userPrepForCurrent.reviewerNotes
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {userPrepForCurrent.status === 'REVIEWED'
                              ? 'معتمد'
                              : userPrepForCurrent.status === 'DRAFT' && userPrepForCurrent.reviewerNotes
                              ? 'مطلوب تعديل'
                              : 'تم التسليم'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">لم تحضّر بعد</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                        اسم الدرس:
                      </span>
                      <h2 className="text-h2 font-bold text-brand-primary">{currentLesson.title}</h2>
                    </div>

                    {currentParsedInfo.bibleVerse && (
                      <div className="p-2.5 rounded-lg bg-brand-primary-soft/50 border border-brand-primary/20">
                        <span className="text-caption font-bold text-brand-primary block mb-0.5">
                          الآية والشاهد:
                        </span>
                        <p className="text-body-small text-text-primary font-medium">
                          {currentParsedInfo.bibleVerse}
                        </p>
                      </div>
                    )}

                    {currentParsedInfo.references && (
                      <div>
                        <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                          المراجع الكنسية:
                        </span>
                        <p className="text-body-small text-text-primary bg-bg-muted/40 p-2.5 rounded-lg border border-border-default">
                          {currentParsedInfo.references}
                        </p>
                      </div>
                    )}

                    {currentParsedInfo.overview && (
                      <div>
                        <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                          ملاحظات ومقدمة الدرس:
                        </span>
                        <p className="text-body-small text-text-secondary bg-bg-muted/30 p-2.5 rounded-lg border border-border-default leading-relaxed">
                          {currentParsedInfo.overview}
                        </p>
                      </div>
                    )}

                    {/* Feedback notes from supervisor if requested changes */}
                    {userPrepForCurrent?.reviewerNotes && (
                      <div
                        className={cn(
                          'p-3 rounded-lg border text-caption text-right flex flex-col gap-1',
                          userPrepForCurrent.status === 'REVIEWED'
                            ? 'bg-status-success-soft border-status-success/30 text-status-success'
                            : 'bg-status-danger-soft border-status-danger/30 text-status-danger'
                        )}
                      >
                        <span className="font-bold">
                          {userPrepForCurrent.status === 'REVIEWED'
                            ? 'ملاحظات الاعتماد:'
                            : 'ملاحظات طلب التعديل من أمين الخدمة:'}
                        </span>
                        <p className="whitespace-pre-wrap">{userPrepForCurrent.reviewerNotes}</p>
                      </div>
                    )}

                    {/* Action Button: + إضافة تحضير / تعديل التحضير (Photo 7) */}
                    <div className="pt-2 border-t border-border-default">
                      <Button
                        id="prep-open-modal-btn"
                        variant={userPrepForCurrent ? 'secondary' : 'primary'}
                        fullWidth
                        onClick={handleOpenPrepModal}
                        className={cn(
                          'h-11 font-bold text-body-default gap-2',
                          !userPrepForCurrent && 'text-white bg-brand-primary hover:bg-brand-primary-dark'
                        )}
                      >
                        {userPrepForCurrent ? (
                          <>
                            <Edit3 className="w-5 h-5" />
                            <span>تعديل تحضيري للدرس</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 text-white" />
                            <span className="text-white font-bold">تحضير الدرس الآن</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </section>
                )}

                {/* 3 Summary Counters (Visible only from امين الخدمة Level 3+ and above) */}
                {isSupervisor && inspectionData && (
                  <section className="grid grid-cols-3 gap-2 text-center select-none">
                    {/* Card 1: معتمد / حضور كامل */}
                    <div
                      onClick={() => setInspectFilter('prepared')}
                      className={cn(
                        'bg-bg-surface border rounded-card p-3 shadow-card flex flex-col items-center justify-between cursor-pointer transition-all',
                        inspectFilter === 'prepared' ? 'border-status-success ring-1 ring-status-success' : 'border-border-default hover:border-status-success/50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-status-success-soft text-status-success flex items-center justify-center mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xl font-bold text-status-success">{reviewedCount}</span>
                      <span className="text-[11px] font-bold text-text-primary leading-tight mt-0.5">
                        حضور كامل (معتمد)
                      </span>
                    </div>

                    {/* Card 2: تم التسليم / قيد المراجعة */}
                    <div
                      onClick={() => setInspectFilter('prepared')}
                      className={cn(
                        'bg-bg-surface border rounded-card p-3 shadow-card flex flex-col items-center justify-between cursor-pointer transition-all',
                        inspectFilter === 'prepared' ? 'border-status-warning ring-1 ring-status-warning' : 'border-border-default hover:border-status-warning/50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-status-warning-soft text-status-warning flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xl font-bold text-status-warning">{pendingCount}</span>
                      <span className="text-[11px] font-bold text-text-primary leading-tight mt-0.5">
                        تم التسليم (قيد المراجعة)
                      </span>
                    </div>

                    {/* Card 3: لم يحضر / لم يتم */}
                    <div
                      onClick={() => setInspectFilter('unprepared')}
                      className={cn(
                        'bg-bg-surface border rounded-card p-3 shadow-card flex flex-col items-center justify-between cursor-pointer transition-all',
                        inspectFilter === 'unprepared' ? 'border-status-danger ring-1 ring-status-danger' : 'border-border-default hover:border-status-danger/50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-status-danger-soft text-status-danger flex items-center justify-center mb-1">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xl font-bold text-status-danger">{unpreparedCount}</span>
                      <span className="text-[11px] font-bold text-text-primary leading-tight mt-0.5">
                        لم يحضّر
                      </span>
                    </div>
                  </section>
                )}

                {/* Supervisor Lesson Inspection Roster (Level 3+) */}
                {isSupervisor && inspectionData && (
                  <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
                    <div className="flex items-center justify-between pb-2 border-b border-border-default">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-primary" />
                        <h3 className="text-body-default font-bold text-text-primary">
                          متابعة تحضيرات خدام المرحلة ({inspectionData.summary?.totalServants || 0})
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Chip
                          selected={inspectFilter === 'all'}
                          onClick={() => setInspectFilter('all')}
                          className="text-[11px] py-0.5 px-2"
                        >
                          الكل
                        </Chip>
                        <Chip
                          selected={inspectFilter === 'prepared'}
                          onClick={() => setInspectFilter('prepared')}
                          className="text-[11px] py-0.5 px-2"
                        >
                          حضّروا ({preparedList.length})
                        </Chip>
                        <Chip
                          selected={inspectFilter === 'unprepared'}
                          onClick={() => setInspectFilter('unprepared')}
                          className="text-[11px] py-0.5 px-2"
                        >
                          لم يحضّروا ({unpreparedList.length})
                        </Chip>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {inspectFilter !== 'unprepared' &&
                        preparedList.map((item: any) => {
                          const isReviewed = item.preparation?.status === 'REVIEWED';
                          const isCaller = item.servant?.id === user?.id;
                          return (
                            <div
                              key={item.servant?.id}
                              className="p-3 rounded-lg bg-bg-app border border-border-default flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-body-small font-bold text-text-primary truncate">
                                    {item.servant?.fullName}
                                  </h4>
                                  {isCaller && <Badge variant="neutral">أنت</Badge>}
                                </div>
                                <p className="text-caption text-text-secondary truncate">
                                  {item.servant?.role || 'خادم'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant={isReviewed ? 'success' : 'warning'}>
                                  {isReviewed ? 'معتمد' : 'قيد المراجعة'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReviewModalPrep(item.preparation);
                                    setReviewNotes(item.preparation?.reviewerNotes || '');
                                  }}
                                  className="h-8 text-caption px-2.5"
                                >
                                  معاينة
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                      {inspectFilter !== 'prepared' &&
                        unpreparedList.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg bg-status-danger-soft/30 border border-status-danger/20 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <h4 className="text-body-small font-bold text-text-primary truncate">
                                {item.fullName}
                              </h4>
                              <p className="text-caption text-status-danger font-medium">لم يقدم التحضير</p>
                            </div>
                            {item.phoneNumber && (
                              <a
                                href={`tel:${item.phoneNumber}`}
                                className="px-2.5 py-1 rounded-pill bg-bg-surface border border-border-default text-caption font-bold text-brand-primary flex items-center gap-1 hover:bg-bg-muted"
                              >
                                <Phone className="w-3 h-3" />
                                <span>تذكير</span>
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </div>

        {/* Modal: Lesson Preparation Authoring Form (Photo 8) */}
        {isPrepModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div
              dir="rtl"
              className="w-full max-w-[480px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[92vh] overflow-y-auto"
            >
              {/* Top Close (X) as drawn in Photo 8 */}
              <button
                type="button"
                onClick={() => setIsPrepModalOpen(false)}
                aria-label="إغلاق"
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-bg-muted text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h2 className="text-h2 font-bold text-brand-primary">تحضير الدرس</h2>
                <p className="text-caption text-text-secondary mt-0.5">
                  سجل التحضير الأسبوعي لخادم التربية الكنسية
                </p>
              </div>

              {/* Box 1: بيانات الدرس (اسم الدرس، الآية، المرجع) */}
              <div className="p-3 bg-bg-app rounded-lg border border-border-default flex flex-col gap-1.5 mb-4 text-right">
                <span className="text-[11px] font-bold text-brand-primary">بيانات الدرس المقرر:</span>
                <h3 className="text-body-default font-bold text-text-primary">
                  {currentLesson?.title}
                </h3>
                {currentParsedInfo.bibleVerse && (
                  <p className="text-caption text-text-secondary">
                    <strong className="text-text-primary">الآية:</strong> {currentParsedInfo.bibleVerse}
                  </p>
                )}
                {currentParsedInfo.references && (
                  <p className="text-caption text-text-secondary">
                    <strong className="text-text-primary">المرجع:</strong> {currentParsedInfo.references}
                  </p>
                )}
              </div>

              {prepError && (
                <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                  {prepError}
                </div>
              )}

              <form onSubmit={handleSubmitPrep} className="flex flex-col gap-3.5">
                {/* 1. الهدف (mainObjective) */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    الهدف من الدرس *
                  </label>
                  <Input
                    placeholder="مثال: أن يتعلم المخدوم أهمية التوبة والرجوع إلى الله..."
                    value={prepObjective}
                    onChange={(e) => setPrepObjective(e.target.value)}
                    required
                  />
                </div>

                {/* 2. وسيلة الإيضاح (visualAid) */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    وسيلة الإيضاح *
                  </label>
                  <Input
                    placeholder="مثال: عرض فيديو كرتوني / مجسم الخيمة / صور ملونة..."
                    value={prepVisualAid}
                    onChange={(e) => setPrepVisualAid(e.target.value)}
                    required
                  />
                </div>

                {/* 3. عناصر الموضوع (elements) - Requested in Sketch Photo 8 */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    عناصر الموضوع
                  </label>
                  <textarea
                    rows={3}
                    placeholder="1- مقدمة تشويقية&#10;2- القصة في الكتاب المقدس&#10;3- التطبيق العملي في حياتنا"
                    value={prepElements}
                    onChange={(e) => setPrepElements(e.target.value)}
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* 4. محتوى الدرس والتدريب الروحي (content) */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    المقدمة والشرح والتدريب الروحي *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="اكتب شرح عناصر الدرس والتدريب الروحي الأسبوعي للمخدومين..."
                    value={prepContent}
                    onChange={(e) => setPrepContent(e.target.value)}
                    required
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* 5. مراجع إضافية (اختياري) (extraReferences) - Photo 8 */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    مراجع إضافية (اختياري)
                  </label>
                  <Input
                    placeholder="تفسير القمص تادرس يعقوب / كتاب حياة الصلاة..."
                    value={prepExtraReferences}
                    onChange={(e) => setPrepExtraReferences(e.target.value)}
                  />
                </div>

                {/* 6. تأمل شخصي (servantReflection) - Photo 8 */}
                <div className="flex flex-col gap-1 text-right">
                  <label className="text-body-small font-bold text-text-primary">
                    تأمل شخصي للخادم
                  </label>
                  <textarea
                    rows={3}
                    placeholder="تأمل شخصي أو رسالة خاصة لمسها الخادم أثناء إعداد الدرس..."
                    value={prepServantReflection}
                    onChange={(e) => setPrepServantReflection(e.target.value)}
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-default">
                  <Button
                    id="prep-submit-btn"
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={prepSubmitting}
                    className="h-11 font-bold text-body-default"
                  >
                    {userPrepForCurrent ? 'حفظ التعديلات' : 'حفظ وإرسال التحضير'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPrepModalOpen(false)}
                    className="h-11 px-4"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Supervisor Review Preparation */}
        {reviewModalPrep && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div
              dir="rtl"
              className="w-full max-w-[480px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setReviewModalPrep(null)}
                aria-label="إغلاق"
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-bg-muted text-text-secondary hover:text-text-primary flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h2 className="text-h2 font-bold text-brand-primary">معاينة تحضير الخادم</h2>
                <p className="text-caption text-text-secondary mt-0.5">
                  خادم: {reviewModalPrep.author?.fullName}
                </p>
              </div>

              <div className="flex flex-col gap-3 text-body-small">
                <div>
                  <span className="text-caption font-bold text-text-secondary block">الهدف:</span>
                  <p className="p-2.5 rounded bg-bg-app border border-border-default">
                    {reviewModalPrep.mainObjective || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-caption font-bold text-text-secondary block">وسيلة الإيضاح:</span>
                  <p className="p-2.5 rounded bg-bg-app border border-border-default">
                    {reviewModalPrep.visualAid || '—'}
                  </p>
                </div>

                {reviewModalPrep.elements && (
                  <div>
                    <span className="text-caption font-bold text-text-secondary block">عناصر الموضوع:</span>
                    <p className="p-2.5 rounded bg-bg-app border border-border-default whitespace-pre-wrap">
                      {reviewModalPrep.elements}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-caption font-bold text-text-secondary block">محتوى الدرس:</span>
                  <p className="p-2.5 rounded bg-bg-app border border-border-default whitespace-pre-wrap">
                    {reviewModalPrep.content || '—'}
                  </p>
                </div>

                {reviewModalPrep.extraReferences && (
                  <div>
                    <span className="text-caption font-bold text-text-secondary block">مراجع إضافية:</span>
                    <p className="p-2.5 rounded bg-bg-app border border-border-default">
                      {reviewModalPrep.extraReferences}
                    </p>
                  </div>
                )}

                {reviewModalPrep.servantReflection && (
                  <div>
                    <span className="text-caption font-bold text-text-secondary block">تأمل شخصي:</span>
                    <p className="p-2.5 rounded bg-bg-app border border-border-default italic">
                      {reviewModalPrep.servantReflection}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-border-default flex flex-col gap-1.5">
                  <label className="text-caption font-bold text-text-primary">
                    ملاحظات وتوجيهات المشرف:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك للخادم أو التوجيهات الروحية والتعليمية..."
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="primary"
                    isLoading={reviewSubmitting}
                    onClick={() => handleReviewAction('REVIEWED')}
                    className="h-10 text-body-small font-bold gap-1 bg-status-success hover:bg-status-success/90"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد التحضير</span>
                  </Button>
                  <Button
                    variant="outline"
                    isLoading={reviewSubmitting}
                    onClick={() => handleReviewAction('DRAFT')}
                    className="h-10 text-body-small font-bold gap-1 text-status-danger border-status-danger/40 hover:bg-status-danger-soft"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>طلب تعديل</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lesson Authoring Modal (for Stage Secretary / Supervisor: level >= 3) */}
        {isLessonModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
              dir="rtl"
              className="bg-bg-surface border border-border-default rounded-card shadow-elevated w-full max-w-[480px] max-h-[92vh] overflow-y-auto flex flex-col text-right animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="bg-brand-primary text-white p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-accent" />
                  <div>
                    <h3 className="text-body-default font-bold">
                      {editingLesson ? 'تعديل بيانات الدرس' : 'إضافة درس جديد للمنهج'}
                    </h3>
                    <p className="text-caption text-white/70">
                      {availableStages.find((s) => s.id === selectedStageId)?.name || 'المرحلة الحالية'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitLesson} className="p-4 flex flex-col gap-3.5">
                {lessonModalError && (
                  <div className="p-3 rounded bg-status-danger-soft border border-status-danger/30 text-status-danger text-body-small flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{lessonModalError}</span>
                  </div>
                )}

                <div>
                  <label className="text-caption font-bold text-text-primary block mb-1">
                    اسم وموضوع الدرس <span className="text-status-danger">*</span>:
                  </label>
                  <Input
                    type="text"
                    required
                    value={lessonModalTitle}
                    onChange={(e) => setLessonModalTitle(e.target.value)}
                    placeholder="مثال: مثل الابن الضال وتوبة النفس"
                    className="w-full text-body-small"
                  />
                </div>

                <div>
                  <label className="text-caption font-bold text-text-primary block mb-1">
                    تاريخ إلقاء الدرس بالخدمة <span className="text-status-danger">*</span>:
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      required
                      value={lessonModalDate}
                      onChange={(e) => setLessonModalDate(e.target.value)}
                      className="w-full text-body-small"
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    يُحدد الموعد الأسبوعي الذي سيُلقى فيه الدرس لجميع مخدومي المرحلة
                  </span>
                </div>

                <div>
                  <label className="text-caption font-bold text-text-primary block mb-1">
                    الآية والشاهد المقترح <span className="text-status-danger">*</span>:
                  </label>
                  <Input
                    type="text"
                    required
                    value={lessonModalBibleVerse}
                    onChange={(e) => setLessonModalBibleVerse(e.target.value)}
                    placeholder="مثال: «قُومُوا نَنْطَلِقْ مِنْ ههُنَا» (يو 14: 31)"
                    className="w-full text-body-small"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-caption font-bold text-text-primary">
                      المراجع الكنسية المقررة <span className="text-status-danger">*</span>:
                    </label>
                    <span className="text-[11px] font-bold text-brand-primary bg-brand-primary-soft px-2 py-0.5 rounded">
                      إلزامي كنسياً
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={lessonModalReferences}
                    onChange={(e) => setLessonModalReferences(e.target.value)}
                    placeholder="مثال: تفسير أبونا تادرس يعقوب ملطي - إنجيل لوقا أصحاح 15"
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                  <span className="text-[11px] text-text-secondary mt-1 block">
                    المراجع الآبائية والأرثوذكسية التي يلتزم بها الخدام في تحضير الدرس
                  </span>
                </div>

                <div>
                  <label className="text-caption font-bold text-text-primary block mb-1">
                    مقدمة وملاحظات توجيهية للخادم (اختياري):
                  </label>
                  <textarea
                    rows={3}
                    value={lessonModalOverview}
                    onChange={(e) => setLessonModalOverview(e.target.value)}
                    placeholder="اكتب التوجيهات العامة والهدف التربوي والروحي المطلوب إيصاله للأولاد..."
                    className="w-full bg-bg-surface text-text-primary font-cairo text-body-small rounded-input border border-border-default p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border-default mt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={lessonModalSubmitting}
                    className="flex-1 h-10 text-body-small font-bold gap-1 bg-brand-primary hover:bg-brand-primary/90"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingLesson ? 'حفظ التعديلات' : 'إضافة الدرس للمنهج'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lessonModalSubmitting}
                    onClick={() => setIsLessonModalOpen(false)}
                    className="h-10 px-4 text-body-small font-semibold border-border-default hover:bg-bg-muted"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-button bg-status-success text-white text-body-small shadow-elevated flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        <TabBar activeTab="prep" />
      </div>
    </ProtectedRoute>
  );
}
