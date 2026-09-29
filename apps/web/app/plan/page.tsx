'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CalendarCheck2,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
  FileText,
  Plus,
  X,
  MapPin,
  Users,
  AlertCircle,
  Check,
  CalendarDays,
  Church,
  Eye,
  Send,
  HelpCircle,
  Phone,
  Bookmark,
  CheckCircle,
  Clock3,
} from 'lucide-react';

enum EventCategory {
  LITURGY_FEAST = 'LITURGY_FEAST',
  SPIRITUAL_LESSON = 'SPIRITUAL_LESSON',
  SERVICE_MEETING = 'SERVICE_MEETING',
  SECRETARIES_COUNCIL = 'SECRETARIES_COUNCIL',
  TRIP_OR_OUTING = 'TRIP_OR_OUTING',
  CONFERENCE_RETREAT = 'CONFERENCE_RETREAT',
  COMMUNITY_ACTIVITY = 'COMMUNITY_ACTIVITY',
}

const EVENT_CATEGORY_ARABIC: Record<EventCategory, string> = {
  [EventCategory.LITURGY_FEAST]: 'قداس / مناسبة كنسية',
  [EventCategory.SPIRITUAL_LESSON]: 'درس روحي / موضوع دراسي',
  [EventCategory.SERVICE_MEETING]: 'اجتماع الخدمة الأسبوعي',
  [EventCategory.SECRETARIES_COUNCIL]: 'اجتماع مجلس الأمناء',
  [EventCategory.TRIP_OR_OUTING]: 'رحلة ترفيهية / روحية',
  [EventCategory.CONFERENCE_RETREAT]: 'مؤتمر روحي',
  [EventCategory.COMMUNITY_ACTIVITY]: 'نشاط اجتماعي / رياضي',
};

interface Volunteer {
  id: string;
  userId: string;
  roleInEvent: string | null;
  user?: {
    id: string;
    fullName: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startDate: string;
  endDate: string;
  location: string | null;
  maxVolunteers: number | null;
  volunteers: Volunteer[];
  bibleVerse?: string | null;
  references?: string | null;
  overview?: string | null;
}

interface YearPlan {
  id: string;
  title: string;
  academicYear: string;
  scopeType: string;
  isPublished: boolean;
  stage?: { id: string; name: string };
  sector?: { id: string; name: string };
  events?: CalendarEvent[];
}

interface LessonPreparationData {
  id: string;
  authorUserId: string;
  stageId: string;
  lessonDate: string;
  title: string;
  scriptureRef?: string | null;
  mainObjective?: string | null;
  visualAid?: string | null;
  content: string;
  extraReferences?: string | null;
  servantReflection?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  reviewerNotes?: string | null;
  createdAt: string;
  submittedAt?: string;
  author?: { id: string; fullName: string; phoneNumber?: string };
}

interface PreparedServantItem {
  servant: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    email?: string | null;
    role?: string;
  };
  preparation: LessonPreparationData;
}

interface UnpreparedServantItem {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  role?: string;
}

interface LessonInspectionData {
  lesson: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    category: string;
    stageId?: string;
    stageName?: string;
    bibleVerse?: string | null;
    references?: string | null;
    overview?: string | null;
  };
  summary: {
    totalServants: number;
    preparedCount: number;
    unpreparedCount: number;
    preparationRate: number;
  };
  preparedServants: PreparedServantItem[];
  unpreparedServants: UnpreparedServantItem[];
  callerPreparation?: LessonPreparationData | null;
}

export default function StagePlanPage() {
  const { user } = useAuth();
  const router = useRouter();

  // 3 Primary Plan Sections requested by user:
  // 1. meetings: تدبير اجتماع خدام
  // 2. service: تدبير الخدمة
  // 3. lessons: تحضير الدروس
  const [activePlanTab, setActivePlanTab] = useState<'meetings' | 'service' | 'lessons'>('lessons');

  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<YearPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<YearPlan | null>(null);

  // Modals
  // 1. Add Event (General / Meeting / Service)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [addEventType, setAddEventType] = useState<'meeting' | 'service' | 'lesson'>('lesson');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>(EventCategory.SPIRITUAL_LESSON);
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventMaxVolunteers, setEventMaxVolunteers] = useState<number | ''>(2);
  // Specific fields for Lesson Plan
  const [lessonBibleVerse, setLessonBibleVerse] = useState('');
  const [lessonReferences, setLessonReferences] = useState('');
  const [createEventLoading, setCreateEventLoading] = useState(false);

  // 2. Lesson Inspection Modal (For Stage Secretary)
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingEvent, setInspectingEvent] = useState<CalendarEvent | null>(null);
  const [inspectionData, setInspectionData] = useState<LessonInspectionData | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [activeInspectTab, setActiveInspectTab] = useState<'prepared' | 'unprepared'>('prepared');

  // 3. Servant Preparation Submission Modal (For Servant)
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  const [targetLessonEvent, setTargetLessonEvent] = useState<CalendarEvent | null>(null);
  const [prepObjective, setPrepObjective] = useState('');
  const [prepVisualAid, setPrepVisualAid] = useState('');
  const [prepMainContent, setPrepMainContent] = useState('');
  const [prepExtraReferences, setPrepExtraReferences] = useState('');
  const [prepServantReflection, setPrepServantReflection] = useState('');
  const [prepSubmitting, setPrepSubmitting] = useState(false);

  // 4. View Preparation Details & Supervisor Review Modal
  const [viewPrepModalOpen, setViewPrepModalOpen] = useState(false);
  const [selectedPrepDetail, setSelectedPrepDetail] = useState<LessonPreparationData | null>(null);
  const [reviewerNotesInput, setReviewerNotesInput] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // Feedback message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [volunteerActionLoading, setVolunteerActionLoading] = useState<string | null>(null);

  const canManagePlan = Boolean(user && user.role && user.role.level >= 3);
  const isSupervisor = Boolean(user && user.role && user.role.level >= 3);

  // Fetch Year Plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/year-plans');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setPlans(res.data.data);
        await loadPlanDetail(res.data.data[0].id);
      } else {
        setPlans([]);
        setSelectedPlan(null);
      }
    } catch (err) {
      console.error('Failed to load year plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanDetail = async (planId: string) => {
    try {
      const res = await api.get(`/api/v1/year-plans/${planId}`);
      if (res.data?.success && res.data.data) {
        setSelectedPlan(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load plan detail:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Filter events into the 3 distinct parts
  const allEvents = selectedPlan?.events || [];

  // 1. تدبير اجتماع خدام: SERVICE_MEETING & SECRETARIES_COUNCIL
  const meetingEvents = useMemo(() => {
    return allEvents.filter(
      (e) =>
        e.category === EventCategory.SERVICE_MEETING ||
        e.category === EventCategory.SECRETARIES_COUNCIL
    );
  }, [allEvents]);

  // 2. تدبير الخدمة: LITURGY_FEAST, TRIP_OR_OUTING, CONFERENCE_RETREAT, COMMUNITY_ACTIVITY
  const serviceEvents = useMemo(() => {
    return allEvents.filter(
      (e) =>
        e.category === EventCategory.LITURGY_FEAST ||
        e.category === EventCategory.TRIP_OR_OUTING ||
        e.category === EventCategory.CONFERENCE_RETREAT ||
        e.category === EventCategory.COMMUNITY_ACTIVITY
    );
  }, [allEvents]);

  // 3. تحضير الدروس: SPIRITUAL_LESSON
  const lessonEvents = useMemo(() => {
    return allEvents.filter((e) => e.category === EventCategory.SPIRITUAL_LESSON);
  }, [allEvents]);

  // Open Add Event Modal for a specific tab
  const handleOpenAddEvent = (type: 'meeting' | 'service' | 'lesson') => {
    setAddEventType(type);
    setEventTitle('');
    setEventDesc('');
    setEventLocation('');
    setEventStartDate('');
    setEventEndDate('');
    setEventMaxVolunteers(2);
    setLessonBibleVerse('');
    setLessonReferences('');

    if (type === 'meeting') {
      setEventCategory(EventCategory.SERVICE_MEETING);
      setEventLocation('قاعة كنيسة أنبا شنودة');
    } else if (type === 'service') {
      setEventCategory(EventCategory.TRIP_OR_OUTING);
    } else {
      setEventCategory(EventCategory.SPIRITUAL_LESSON);
    }

    setIsAddEventOpen(true);
  };

  // Submit Add Event / تدبير
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    let planId = selectedPlan?.id;

    // Auto-create plan if none exists
    if (!planId) {
      try {
        setCreateEventLoading(true);
        const stageId = user?.scopes?.stages?.[0]?.id;
        const createPlanRes = await api.post('/api/v1/year-plans', {
          title: `خطة خدمة ${user?.scopes?.stages?.[0]?.name || 'المرحلة'} لعام 2026 / 2027`,
          academicYear: '2026-2027',
          scopeType: 'STAGE',
          stageId,
          isPublished: true,
        });
        if (createPlanRes.data?.success) {
          planId = createPlanRes.data.data.id;
          await fetchPlans();
        }
      } catch (err: any) {
        console.error('Failed to auto-create plan:', err);
        setActionMessage({
          type: 'error',
          text: err.response?.data?.error?.message || 'فشل في إنشاء خطة المرحلة',
        });
        setCreateEventLoading(false);
        return;
      }
    }

    if (!planId) return;

    // Validation for Lesson in التدبير: المراجع إجباري
    if (addEventType === 'lesson') {
      if (!lessonReferences.trim()) {
        setActionMessage({
          type: 'error',
          text: 'المراجع الكنسية إجبارية عند تدبير درس جديد للمنهج',
        });
        return;
      }
    }

    try {
      setCreateEventLoading(true);
      const res = await api.post(`/api/v1/year-plans/${planId}/events`, {
        title: eventTitle.trim(),
        description: eventDesc.trim() || undefined,
        category: eventCategory,
        startDate: eventStartDate,
        endDate: eventEndDate || eventStartDate,
        location: eventLocation.trim() || undefined,
        maxVolunteers: eventMaxVolunteers ? Number(eventMaxVolunteers) : undefined,
        bibleVerse: addEventType === 'lesson' ? lessonBibleVerse.trim() : undefined,
        references: addEventType === 'lesson' ? lessonReferences.trim() : undefined,
        isLessonPlanCreation: addEventType === 'lesson',
      });

      if (res.data?.success) {
        setIsAddEventOpen(false);
        setActionMessage({ type: 'success', text: 'تمت إضافة التدبير بنجاح إلى الخطة!' });
        await loadPlanDetail(planId);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'فشل في إضافة التدبير للخطة',
      });
    } finally {
      setCreateEventLoading(false);
    }
  };

  // Inspect Lesson (Stage Secretary: مين حضّر ومين ما حضّرش)
  const handleInspectLesson = async (evt: CalendarEvent) => {
    setInspectingEvent(evt);
    setInspectModalOpen(true);
    setInspectionLoading(true);
    setActiveInspectTab('prepared');

    try {
      const res = await api.get(`/api/v1/preparations/lesson-inspection/${evt.id}`);
      if (res.data?.success) {
        setInspectionData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load lesson inspection:', err);
    } finally {
      setInspectionLoading(false);
    }
  };

  // Open Servant Preparation Form for a Lesson
  const handleOpenPrepModal = (evt: CalendarEvent) => {
    setTargetLessonEvent(evt);
    setPrepObjective('');
    setPrepVisualAid('');
    setPrepMainContent('');
    setPrepExtraReferences('');
    setPrepServantReflection('');
    setPrepModalOpen(true);
  };

  // Submit Servant Preparation
  const handleSubmitPrep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonEvent) return;

    if (!prepObjective.trim() || !prepVisualAid.trim() || !prepMainContent.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية: الهدف، وسيلة الإيضاح، و(المقدمة والدرس والتدريب الروحي)');
      return;
    }

    try {
      setPrepSubmitting(true);
      const res = await api.post('/api/v1/preparations', {
        eventId: targetLessonEvent.id,
        mainObjective: prepObjective.trim(),
        visualAid: prepVisualAid.trim(),
        content: prepMainContent.trim(),
        extraReferences: prepExtraReferences.trim() || undefined,
        servantReflection: prepServantReflection.trim() || undefined,
      });

      if (res.data?.success) {
        setPrepModalOpen(false);
        setActionMessage({
          type: 'success',
          text: 'تم تقديم تحضير الدرس بنجاح، وتم تسجيل تاريخ التحضير تلقائياً!',
        });
        setTimeout(() => setActionMessage(null), 4000);
        // Refresh inspection if open
        if (inspectingEvent?.id === targetLessonEvent.id) {
          await handleInspectLesson(targetLessonEvent);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل في إرسال التحضير');
    } finally {
      setPrepSubmitting(false);
    }
  };

  // Open View Preparation Details
  const handleViewPrepDetail = (prep: LessonPreparationData) => {
    setSelectedPrepDetail(prep);
    setReviewerNotesInput(prep.reviewerNotes || '');
    setViewPrepModalOpen(true);
  };

  // Review Preparation (Approve / Reject) with 3 buttons
  const handleReviewPrep = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedPrepDetail) return;

    try {
      setReviewActionLoading(true);
      const newStatus = action === 'APPROVE' ? 'REVIEWED' : 'DRAFT';
      const res = await api.patch(`/api/v1/preparations/${selectedPrepDetail.id}`, {
        status: newStatus,
        reviewerNotes: reviewerNotesInput.trim() || undefined,
      });

      if (res.data?.success) {
        setSelectedPrepDetail(res.data.data);
        setViewPrepModalOpen(false);
        setActionMessage({
          type: 'success',
          text: action === 'APPROVE' ? 'تمت الموافقة على التحضير واعتماده!' : 'تم طلب تعديل التحضير مع توجيه الملاحظات.',
        });
        setTimeout(() => setActionMessage(null), 4000);

        // Refresh lesson inspection list
        if (inspectingEvent) {
          await handleInspectLesson(inspectingEvent);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل في تحديث حالة التحضير');
    } finally {
      setReviewActionLoading(false);
    }
  };

  // Volunteer Toggle
  const handleVolunteerToggle = async (event: CalendarEvent) => {
    if (!user) return;
    const isVolunteered = event.volunteers.some((v) => v.userId === user.id);

    try {
      setVolunteerActionLoading(event.id);
      if (isVolunteered) {
        await api.delete(`/api/v1/events/${event.id}/volunteer`);
      } else {
        await api.post(`/api/v1/events/${event.id}/volunteer`, {
          roleInEvent: 'تطوع بالخدمة',
        });
      }
      if (selectedPlan) {
        await loadPlanDetail(selectedPlan.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'حدث خطأ أثناء تسجيل التطوع');
    } finally {
      setVolunteerActionLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-28">
        <div className="w-full max-w-[500px] flex flex-col gap-4">
          {/* Top Bar Header */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-button flex items-center justify-center text-text-secondary hover:bg-bg-muted transition-colors"
                title="العودة للوحة التحكم"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-h2 font-bold text-text-primary">خطة وتدبير المرحلة</h1>
                <p className="text-caption text-text-secondary">
                  تدبير اجتماعات الخدام، الخدمة العامة، وتحضير المنهج
                </p>
              </div>
            </div>

            <Badge variant="accent">
              {user?.scopes.stages[0]?.name || 'إعدادي بنين'}
            </Badge>
          </header>

          {/* Action Feedback Message */}
          {actionMessage && (
            <div
              className={cn(
                'p-3.5 rounded-card flex items-center gap-2 text-body-small border animate-in fade-in duration-200',
                actionMessage.type === 'success'
                  ? 'bg-status-success-soft text-status-success border-status-success/30'
                  : 'bg-status-danger-soft text-status-danger border-status-danger/30'
              )}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="font-semibold">{actionMessage.text}</span>
            </div>
          )}

          {/* Coptic Theme Banner */}
          <section className="bg-gradient-to-br from-brand-primary via-[#24426b] to-[#15273f] text-text-inverse rounded-card p-4 shadow-card flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-brand-accent/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-bold px-2 py-0.5 bg-brand-accent text-brand-primary rounded-pill">
                  شعار الخدمة لعام 2026 / 2027
                </span>
                <Sparkles className="w-4 h-4 text-brand-accent" />
              </div>
              <h2 className="text-body-default font-bold text-white leading-tight">
                «أَمَّا أَنَا وَبَيْتِي فَنَعْبُدُ الرَّبَّ» (يش 24: 15)
              </h2>
            </div>
          </section>

          {/* The 3 Primary Plan Tabs Requested by User */}
          <div className="bg-bg-surface border border-border-default rounded-card p-1.5 shadow-card flex items-center gap-1">
            {/* 1. تدبير اجتماع خدام */}
            <button
              type="button"
              onClick={() => setActivePlanTab('meetings')}
              className={cn(
                'flex-1 py-2 px-1.5 rounded-button text-caption font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center',
                activePlanTab === 'meetings'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted'
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>اجتماع خدام</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', activePlanTab === 'meetings' ? 'bg-white/20 text-white' : 'bg-bg-muted text-text-secondary')}>
                {meetingEvents.length}
              </span>
            </button>

            {/* 2. تدبير الخدمة */}
            <button
              type="button"
              onClick={() => setActivePlanTab('service')}
              className={cn(
                'flex-1 py-2 px-1.5 rounded-button text-caption font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center',
                activePlanTab === 'service'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted'
              )}
            >
              <Church className="w-4 h-4 shrink-0" />
              <span>تدبير الخدمة</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', activePlanTab === 'service' ? 'bg-white/20 text-white' : 'bg-bg-muted text-text-secondary')}>
                {serviceEvents.length}
              </span>
            </button>

            {/* 3. تحضير الدروس */}
            <button
              type="button"
              onClick={() => setActivePlanTab('lessons')}
              className={cn(
                'flex-1 py-2 px-1.5 rounded-button text-caption font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center',
                activePlanTab === 'lessons'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted'
              )}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>تحضير الدروس</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', activePlanTab === 'lessons' ? 'bg-white/20 text-white' : 'bg-bg-muted text-text-secondary')}>
                {lessonEvents.length}
              </span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: تدبير اجتماع خدام */}
          {/* ======================================================== */}
          {activePlanTab === 'meetings' && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-body-default font-bold text-text-primary flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-brand-primary" />
                    <span>جدول واجتماعات الخدام الدورية</span>
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    مواعيد اجتماع الخدمة الأسبوعي ومجلس أمناء المرحلة
                  </p>
                </div>

                {canManagePlan && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAddEvent('meeting')}
                    className="gap-1 font-bold h-8 px-2.5 text-caption"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة اجتماع</span>
                  </Button>
                )}
              </div>

              {meetingEvents.length === 0 ? (
                <div className="p-6 bg-bg-surface border border-dashed border-border-default rounded-card text-center flex flex-col items-center gap-2">
                  <CalendarDays className="w-8 h-8 text-text-tertiary" />
                  <p className="text-body-small text-text-secondary">
                    لا توجد مواعيد اجتماعات خدام مسجلة حتى الآن
                  </p>
                  {canManagePlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddEvent('meeting')}
                      className="font-semibold text-caption mt-1"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      <span>جدولة أول اجتماع خدام</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {meetingEvents.map((evt) => {
                    const formattedDate = new Date(evt.startDate).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={evt.id}
                        className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card text-right flex flex-col gap-2 hover:border-brand-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="accent">
                            {EVENT_CATEGORY_ARABIC[evt.category]}
                          </Badge>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formattedDate}
                          </span>
                        </div>

                        <h3 className="text-body-default font-bold text-text-primary">
                          {evt.title}
                        </h3>

                        {evt.description && (
                          <p className="text-caption text-text-secondary leading-relaxed">
                            {evt.description}
                          </p>
                        )}

                        {evt.location && (
                          <div className="flex items-center gap-1.5 text-caption text-text-secondary bg-bg-muted/60 px-2.5 py-1.5 rounded-card">
                            <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ======================================================== */}
          {/* TAB 2: تدبير الخدمة */}
          {/* ======================================================== */}
          {activePlanTab === 'service' && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-body-default font-bold text-text-primary flex items-center gap-1.5">
                    <Church className="w-4 h-4 text-brand-primary" />
                    <span>فعاليات وأنشطة الخدمة العامة</span>
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    القداسات الإلهية، الرحلات، المؤتمرات، الأنشطة واليوم الرياضي
                  </p>
                </div>

                {canManagePlan && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAddEvent('service')}
                    className="gap-1 font-bold h-8 px-2.5 text-caption"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة فعالية</span>
                  </Button>
                )}
              </div>

              {serviceEvents.length === 0 ? (
                <div className="p-6 bg-bg-surface border border-dashed border-border-default rounded-card text-center flex flex-col items-center gap-2">
                  <Calendar className="w-8 h-8 text-text-tertiary" />
                  <p className="text-body-small text-text-secondary">
                    لا توجد فعاليات خدمة أو رحلات مسجلة بعد
                  </p>
                  {canManagePlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddEvent('service')}
                      className="font-semibold text-caption mt-1"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      <span>إضافة أول نشاط للخدمة</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {serviceEvents.map((evt) => {
                    const isVolunteered = evt.volunteers.some((v) => v.userId === user?.id);
                    const formattedDate = new Date(evt.startDate).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={evt.id}
                        className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card text-right flex flex-col gap-2.5 hover:border-brand-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-brand-primary-soft text-brand-primary">
                            {EVENT_CATEGORY_ARABIC[evt.category] || evt.category}
                          </span>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formattedDate}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-body-default font-bold text-text-primary">
                            {evt.title}
                          </h3>
                          {evt.description && (
                            <p className="text-caption text-text-secondary mt-1 leading-relaxed">
                              {evt.description}
                            </p>
                          )}
                        </div>

                        {evt.location && (
                          <div className="flex items-center gap-1.5 text-caption text-text-secondary bg-bg-muted/60 px-2.5 py-1.5 rounded-card">
                            <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border-default mt-0.5">
                          <div className="flex items-center gap-1.5 text-caption text-text-secondary">
                            <Users className="w-3.5 h-3.5 text-text-secondary" />
                            <span>
                              المتطوعين: {evt.volunteers.length}
                              {evt.maxVolunteers ? ` / ${evt.maxVolunteers}` : ''}
                            </span>
                          </div>

                          <Button
                            variant={isVolunteered ? 'outline' : 'primary'}
                            size="sm"
                            isLoading={volunteerActionLoading === evt.id}
                            onClick={() => handleVolunteerToggle(evt)}
                            className={cn(
                              'h-7 px-2.5 text-caption font-semibold gap-1',
                              isVolunteered && 'text-status-success border-status-success/40 bg-status-success-soft'
                            )}
                          >
                            {isVolunteered ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>متطوع بالخدمة</span>
                              </>
                            ) : (
                              <span>تطوع بالخدمة</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ======================================================== */}
          {/* TAB 3: تحضير الدروس */}
          {/* ======================================================== */}
          {activePlanTab === 'lessons' && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-body-default font-bold text-text-primary flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-brand-primary" />
                    <span>جدول الدروس وتحضيرات الخدام</span>
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    البيانات الأساسية بالتدبير وتحضيرات الخدام ومتابعتها
                  </p>
                </div>

                {canManagePlan && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAddEvent('lesson')}
                    className="gap-1 font-bold h-8 px-2.5 text-caption"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة درس للمنهج</span>
                  </Button>
                )}
              </div>

              {lessonEvents.length === 0 ? (
                <div className="p-6 bg-bg-surface border border-dashed border-border-default rounded-card text-center flex flex-col items-center gap-2">
                  <BookOpen className="w-8 h-8 text-text-tertiary" />
                  <p className="text-body-small text-text-secondary">
                    لم يقم أمين الخدمة بإضافة دروس للمنهج حتى الآن
                  </p>
                  {canManagePlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddEvent('lesson')}
                      className="font-semibold text-caption mt-1"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      <span>إضافة أول درس بالمنهج</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {lessonEvents.map((evt, idx) => {
                    const formattedDate = new Date(evt.startDate).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={evt.id}
                        className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col gap-3 hover:border-brand-primary/40 transition-all"
                      >
                        {/* Header: Lesson order & Delivery Date in التدبير */}
                        <div className="flex items-center justify-between">
                          <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            الدرس {idx + 1}
                          </span>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-brand-primary" />
                            تاريخ الإلقاء: {formattedDate}
                          </span>
                        </div>

                        {/* Title in التدبير */}
                        <div>
                          <h3 className="text-body-default font-bold text-text-primary leading-tight">
                            {evt.title}
                          </h3>
                        </div>

                        {/* Bible Verse in التدبير */}
                        {evt.bibleVerse && (
                          <div className="bg-brand-primary-soft/40 border border-brand-primary/20 rounded-card p-2 text-caption text-brand-primary flex items-start gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold ml-1">الآية المقررة:</span>
                              <span className="font-medium">{evt.bibleVerse}</span>
                            </div>
                          </div>
                        )}

                        {/* Mandatory References in التدبير */}
                        {evt.references && (
                          <div className="bg-bg-muted/70 border border-border-default rounded-card p-2 text-caption text-text-secondary flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-brand-accent shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-text-primary ml-1">المراجع الكنسية المقررة:</span>
                              <span>{evt.references}</span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Supervisor vs Servant */}
                        <div className="pt-2 border-t border-border-default flex items-center gap-2">
                          {isSupervisor ? (
                            /* أمين الخدمة يخش على الدرس يشوف مين المحضر ومين مش محضر */
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleInspectLesson(evt)}
                              className="w-full h-8 text-caption font-bold gap-1.5 shadow-sm"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>متابعة تحضيرات الخدام (مين حضّر ومين ما حضّرش)</span>
                            </Button>
                          ) : (
                            /* Servant: Add or View Preparation */
                            <div className="w-full flex items-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenPrepModal(evt)}
                                className="flex-1 h-8 text-caption font-bold gap-1.5 bg-status-success hover:bg-status-success/90"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة تحضيري لهذا الدرس</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInspectLesson(evt)}
                                className="h-8 px-2.5 text-caption font-semibold"
                                title="عرض كشف التحضيرات للمرحلة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ======================================================== */}
          {/* MODAL 1: إضافة تدبير (درس روحي / اجتماع خدام / فعالية) */}
          {/* ======================================================== */}
          {isAddEventOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-md p-5 shadow-elevated text-right space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-border-default">
                  <div>
                    <h3 className="text-h2 font-bold text-text-primary">
                      {addEventType === 'lesson'
                        ? 'تدبير درس روحي جديد للمنهج'
                        : addEventType === 'meeting'
                        ? 'تدبير اجتماع خدام جديد'
                        : 'تدبير فعالية خدمة جديدة'}
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      {addEventType === 'lesson'
                        ? 'تحديد اسم الدرس وتاريخ الإلقاء والآية والمراجع الإجبارية'
                        : 'جدولة الموعد والمكان والمتطوعين بالخطة'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddEventOpen(false)}
                    className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateEvent} className="space-y-3.5">
                  {/* Title */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      {addEventType === 'lesson' ? 'اسم الدرس *' : 'عنوان التدبير / الفعالية *'}
                    </label>
                    <Input
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder={
                        addEventType === 'lesson'
                          ? 'مثال: مثل الابن الضال أو سر التناول المقدس...'
                          : 'مثال: اجتماع الخدمة الشهري أو رحلة الأديرة...'
                      }
                    />
                  </div>

                  {/* Date: تاريخ الإلقاء في التدبير */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      {addEventType === 'lesson' ? 'تاريخ الإلقاء (موعد إلقاء الدرس بالخدمة) *' : 'تاريخ وموعد البدء *'}
                    </label>
                    <Input
                      type="date"
                      required
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                    />
                  </div>

                  {/* Specific Fields for Lesson in التدبير */}
                  {addEventType === 'lesson' && (
                    <>
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          الآية الذهبية والشاهد الكنسي *
                        </label>
                        <Input
                          required
                          value={lessonBibleVerse}
                          onChange={(e) => setLessonBibleVerse(e.target.value)}
                          placeholder="مثال: «أَنَا هُوَ الطَّرِيقُ وَالْحَقُّ وَالْحَيَاةُ» (يو 14: 6)"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-caption font-semibold text-text-secondary block">
                            المراجع الكنسية المقررة *
                          </label>
                          <span className="text-[11px] font-bold text-status-danger bg-status-danger-soft px-1.5 py-0.2 rounded">
                            إجباري في التدبير
                          </span>
                        </div>
                        <textarea
                          required
                          rows={2}
                          value={lessonReferences}
                          onChange={(e) => setLessonReferences(e.target.value)}
                          placeholder="مثال: تفسير القمص تادرس يعقوب ملطي، سنكسار يوم 8 بشنس، كتاب خدمة الشماس..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Specific Fields for Meetings & Service Events */}
                  {addEventType !== 'lesson' && (
                    <>
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          مكان الانعقاد
                        </label>
                        <Input
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          placeholder="مثال: قاعة الكنيسة أو بيت مارمرقس..."
                        />
                      </div>

                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          عدد الخدام المطلوب تطوعهم
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={eventMaxVolunteers}
                          onChange={(e) =>
                            setEventMaxVolunteers(e.target.value ? Number(e.target.value) : '')
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* Description / Overview */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      محاور وملاحظات عامة (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder="أي توجيهات أو محاور إضافية..."
                      className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddEventOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={createEventLoading}
                    >
                      حفظ التدبير ونشره
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 2: فحص الدرس لأمين الخدمة (مين حضّر ومين ما حضّرش) */}
          {/* ======================================================== */}
          {inspectModalOpen && inspectingEvent && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
              <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-lg p-5 shadow-elevated text-right space-y-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border-default">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="accent">متابعة الدرس</Badge>
                      <h3 className="text-h2 font-bold text-text-primary">
                        {inspectingEvent.title}
                      </h3>
                    </div>
                    <p className="text-caption text-text-secondary mt-0.5">
                      كشف خدام المرحلة: المحضرين وغير المحضرين
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectModalOpen(false)}
                    className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Lesson Info Box from التدبير */}
                <div className="bg-bg-muted/60 border border-border-default rounded-card p-3 space-y-1.5 text-caption">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">تاريخ الإلقاء:</span>
                    <span className="text-text-secondary font-medium">
                      {new Date(inspectingEvent.startDate).toLocaleDateString('ar-EG', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {inspectingEvent.bibleVerse && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-text-primary shrink-0">الآية المقررة:</span>
                      <span className="text-brand-primary font-medium text-left">
                        {inspectingEvent.bibleVerse}
                      </span>
                    </div>
                  )}
                  {inspectingEvent.references && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-text-primary shrink-0">المراجع المقررة:</span>
                      <span className="text-text-secondary text-left">
                        {inspectingEvent.references}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress & Stat Cards */}
                {inspectionData && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-bg-muted/80 border border-border-default rounded-card p-2.5 text-center">
                      <span className="text-caption text-text-secondary block">خدام المرحلة</span>
                      <span className="text-h2 font-bold text-text-primary">
                        {inspectionData.summary.totalServants}
                      </span>
                    </div>
                    <div className="bg-status-success-soft/60 border border-status-success/30 rounded-card p-2.5 text-center">
                      <span className="text-caption text-status-success block">المحضرين</span>
                      <span className="text-h2 font-bold text-status-success">
                        {inspectionData.summary.preparedCount}
                      </span>
                    </div>
                    <div className="bg-status-warning-soft/60 border border-status-warning/30 rounded-card p-2.5 text-center">
                      <span className="text-caption text-status-warning block">غير المحضرين</span>
                      <span className="text-h2 font-bold text-status-warning">
                        {inspectionData.summary.unpreparedCount}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tabs: المحضرين vs غير المحضرين */}
                <div className="flex items-center gap-2 border-b border-border-default pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveInspectTab('prepared')}
                    className={cn(
                      'flex-1 py-1.5 text-caption font-bold border-b-2 transition-all text-center',
                      activeInspectTab === 'prepared'
                        ? 'border-status-success text-status-success'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    )}
                  >
                    الخدام المحضرين ({inspectionData?.preparedServants.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInspectTab('unprepared')}
                    className={cn(
                      'flex-1 py-1.5 text-caption font-bold border-b-2 transition-all text-center',
                      activeInspectTab === 'unprepared'
                        ? 'border-status-danger text-status-danger'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    )}
                  >
                    الخدام غير المحضرين ({inspectionData?.unpreparedServants.length || 0})
                  </button>
                </div>

                {/* Content */}
                {inspectionLoading ? (
                  <div className="text-center py-8 text-text-secondary">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full mb-1.5" />
                    <p className="text-caption">جارٍ فحص تحضيرات الخدام...</p>
                  </div>
                ) : activeInspectTab === 'prepared' ? (
                  /* List of Prepared Servants */
                  inspectionData?.preparedServants.length === 0 ? (
                    <div className="p-5 text-center text-text-secondary bg-bg-muted/40 rounded-card">
                      <Clock3 className="w-7 h-7 text-text-tertiary mx-auto mb-1.5" />
                      <p className="text-body-small">لم يقم أي خادم برفع تحضيره لهذا الدرس بعد</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {inspectionData?.preparedServants.map((item) => {
                        const prep = item.preparation;
                        const formattedSubmitTime = prep.createdAt
                          ? new Date(prep.createdAt).toLocaleString('ar-EG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'مسجل تلقائياً';

                        return (
                          <div
                            key={prep.id}
                            className="bg-bg-muted/50 border border-border-default rounded-card p-3 flex items-center justify-between gap-2"
                          >
                            <div className="text-right">
                              <h4 className="text-body-small font-bold text-text-primary">
                                {item.servant.fullName}
                              </h4>
                              <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-status-success" />
                                <span>تاريخ التحضير: {formattedSubmitTime}</span>
                              </p>
                              {prep.status === 'REVIEWED' ? (
                                <span className="inline-block mt-1 text-[10px] font-bold text-status-success bg-status-success-soft px-1.5 py-0.2 rounded">
                                  مُعتمد ومقبول
                                </span>
                              ) : prep.status === 'DRAFT' ? (
                                <span className="inline-block mt-1 text-[10px] font-bold text-status-danger bg-status-danger-soft px-1.5 py-0.2 rounded">
                                  مطلوب إعادة تعديل
                                </span>
                              ) : (
                                <span className="inline-block mt-1 text-[10px] font-bold text-status-warning bg-status-warning-soft px-1.5 py-0.2 rounded">
                                  قيد مراجعة الأمين
                                </span>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPrepDetail(prep)}
                              className="h-7 px-2.5 text-caption font-bold gap-1 text-brand-primary"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة ومراجعة</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* List of Unprepared Servants */
                  inspectionData?.unpreparedServants.length === 0 ? (
                    <div className="p-5 text-center text-status-success bg-status-success-soft/30 border border-status-success/30 rounded-card">
                      <CheckCircle className="w-7 h-7 text-status-success mx-auto mb-1.5" />
                      <p className="text-body-small font-bold">
                        رائع! جميع خدام المرحلة قاموا برفع تحضيرهم بالكامل.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {inspectionData?.unpreparedServants.map((s) => (
                        <div
                          key={s.id}
                          className="bg-bg-muted/50 border border-border-default rounded-card p-3 flex items-center justify-between gap-2"
                        >
                          <div className="text-right">
                            <h4 className="text-body-small font-bold text-text-primary">
                              {s.fullName}
                            </h4>
                            <p className="text-[11px] text-status-danger font-medium mt-0.5">
                              لم يتم رفع التحضير حتى الآن
                            </p>
                          </div>

                          {s.phoneNumber && (
                            <a
                              href={`tel:${s.phoneNumber}`}
                              className="inline-flex items-center gap-1 text-caption text-brand-primary bg-brand-primary-soft px-2.5 py-1 rounded-card hover:bg-brand-primary/20 transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              <span>تذكير</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                <div className="pt-2 border-t border-border-default flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectModalOpen(false)}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 3: نموذج تحضير الدرس للخادم (Servant Form) */}
          {/* ======================================================== */}
          {prepModalOpen && targetLessonEvent && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
              <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-lg p-5 shadow-elevated text-right space-y-4 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border-default">
                  <div>
                    <h3 className="text-h2 font-bold text-text-primary">
                      تحضير: {targetLessonEvent.title}
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      رفع التحضير الأسبوعي لأمين الخدمة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrepModalOpen(false)}
                    className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Readonly info from التدبير as required by user */}
                <div className="bg-brand-primary-soft/30 border border-brand-primary/20 rounded-card p-3 space-y-1 text-caption">
                  <p className="text-brand-primary font-bold">بيانات الدرس المقررة من التدبير:</p>
                  <p className="text-text-secondary">
                    <span className="font-semibold text-text-primary">تاريخ الإلقاء:</span>{' '}
                    {new Date(targetLessonEvent.startDate).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {targetLessonEvent.bibleVerse && (
                    <p className="text-text-secondary">
                      <span className="font-semibold text-text-primary">الآية المقررة:</span>{' '}
                      {targetLessonEvent.bibleVerse}
                    </p>
                  )}
                  {targetLessonEvent.references && (
                    <p className="text-text-secondary">
                      <span className="font-semibold text-text-primary">المراجع المقررة:</span>{' '}
                      {targetLessonEvent.references}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmitPrep} className="space-y-3.5">
                  {/* Auto submission date notice */}
                  <div className="bg-bg-muted/70 p-2 rounded-card text-[11px] text-text-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-status-success shrink-0" />
                    <span>تاريخ التحضير: يُسجل تلقائياً فور الإرسال (Auto once submitted)</span>
                  </div>

                  {/* 1. الهدف (في التحضير - إجباري) */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      الهدف من الدرس *
                    </label>
                    <Input
                      required
                      value={prepObjective}
                      onChange={(e) => setPrepObjective(e.target.value)}
                      placeholder="مثال: غرس الثقة في محبة الله وقبول المراهقين لفضيلة التوبة..."
                    />
                  </div>

                  {/* 2. وسيلة الإيضاح (في التحضير - إجباري) */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      وسيلة الإيضاح *
                    </label>
                    <Input
                      required
                      value={prepVisualAid}
                      onChange={(e) => setPrepVisualAid(e.target.value)}
                      placeholder="مثال: مجسم خيمة الاجتماع، عرض تقديمي مصور، مقطع فيديو توضيحي..."
                    />
                  </div>

                  {/* 3. المقدمة + الدرس + التدريب الروحي (في خانة واحدة - إجباري) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-caption font-semibold text-text-secondary block">
                        (المقدمة + الدرس + التدريب الروحي) *
                      </label>
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-soft px-1.5 py-0.2 rounded">
                        في خانة واحدة إجباري
                      </span>
                    </div>
                    <textarea
                      required
                      rows={5}
                      value={prepMainContent}
                      onChange={(e) => setPrepMainContent(e.target.value)}
                      placeholder="اكتب هنا:&#10;1. المقدمة ونقطة الانطلاق الشائقة&#10;2. صلب الدرس والأفكار الروحية والقصص&#10;3. التدريب الروحي والتطبيق العملي للمخدومين..."
                      className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-y font-sans leading-relaxed"
                    />
                  </div>

                  {/* 4. مراجع زيادة (في التحضير - اختياري) */}
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      مراجع إضافية (اختياري)
                    </label>
                    <Input
                      value={prepExtraReferences}
                      onChange={(e) => setPrepExtraReferences(e.target.value)}
                      placeholder="أي مراجع أو كتب أو تفاسير إضافية استعنت بها..."
                    />
                  </div>

                  {/* 5. تأمل الخادم (خانة لوحدها - اختياري) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-caption font-semibold text-text-secondary block">
                        تأمل الخادم (اختياري)
                      </label>
                      <span className="text-[10px] text-text-secondary">
                        خانة منفصلة لوقفتك الروحية الخاصة
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={prepServantReflection}
                      onChange={(e) => setPrepServantReflection(e.target.value)}
                      placeholder="تأملك الخاص ومشاعرك ووقفتك مع الله قبل أن تعلّم أولادك..."
                      className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrepModalOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={prepSubmitting}
                      className="gap-1 font-bold bg-status-success hover:bg-status-success/90"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال التحضير</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 4: معاينة التحضير ومراجعة الأمين بـ 3 أزرار */}
          {/* ======================================================== */}
          {viewPrepModalOpen && selectedPrepDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
              <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-lg p-5 shadow-elevated text-right space-y-4 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border-default">
                  <div>
                    <h3 className="text-h2 font-bold text-text-primary">
                      تحضير الخادم: {selectedPrepDetail.author?.fullName || 'خادم'}
                    </h3>
                    <p className="text-caption text-text-secondary mt-0.5">
                      تاريخ التحضير: {new Date(selectedPrepDetail.createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewPrepModalOpen(false)}
                    className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-3 text-body-small">
                  {/* Objective */}
                  {selectedPrepDetail.mainObjective && (
                    <div className="bg-bg-muted/50 p-2.5 rounded-card">
                      <span className="text-caption font-bold text-text-primary block mb-0.5">
                        الهدف من الدرس:
                      </span>
                      <p className="text-text-secondary">{selectedPrepDetail.mainObjective}</p>
                    </div>
                  )}

                  {/* Visual Aid */}
                  {selectedPrepDetail.visualAid && (
                    <div className="bg-bg-muted/50 p-2.5 rounded-card">
                      <span className="text-caption font-bold text-text-primary block mb-0.5">
                        وسيلة الإيضاح:
                      </span>
                      <p className="text-text-secondary">{selectedPrepDetail.visualAid}</p>
                    </div>
                  )}

                  {/* Content (المقدمة، الدرس، التدريب الروحي) */}
                  <div className="bg-bg-muted/50 p-3 rounded-card">
                    <span className="text-caption font-bold text-text-primary block mb-1">
                      (المقدمة + الدرس + التدريب الروحي):
                    </span>
                    <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedPrepDetail.content}
                    </p>
                  </div>

                  {/* Servant Reflection */}
                  {selectedPrepDetail.servantReflection && (
                    <div className="bg-brand-primary-soft/30 border border-brand-primary/20 p-2.5 rounded-card">
                      <span className="text-caption font-bold text-brand-primary block mb-0.5">
                        تأمل الخادم:
                      </span>
                      <p className="text-text-secondary italic leading-relaxed">
                        {selectedPrepDetail.servantReflection}
                      </p>
                    </div>
                  )}

                  {/* Extra References */}
                  {selectedPrepDetail.extraReferences && (
                    <div className="bg-bg-muted/50 p-2.5 rounded-card text-caption">
                      <span className="font-bold text-text-primary ml-1">مراجع إضافية:</span>
                      <span className="text-text-secondary">{selectedPrepDetail.extraReferences}</span>
                    </div>
                  )}

                  {/* Supervisor Review Feedback Input */}
                  {isSupervisor && (
                    <div className="pt-2 border-t border-border-default">
                      <label className="text-caption font-semibold text-text-secondary block mb-1">
                        ملاحظات وتوجيهات أمين الخدمة للتحضير
                      </label>
                      <textarea
                        rows={2}
                        value={reviewerNotesInput}
                        onChange={(e) => setReviewerNotesInput(e.target.value)}
                        placeholder="اكتب ملاحظاتك التشجيعية أو نقاط التعديل المطلوبة..."
                        className="w-full bg-bg-muted border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* The 3 Buttons Requested by User:
                    1. موافقة على التحضير
                    2. رفض / طلب تعديل التحضير
                    3. زر الإلغاء
                */}
                <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewPrepModalOpen(false)}
                    className="text-caption font-semibold"
                  >
                    إلغاء
                  </Button>

                  {isSupervisor && (
                    <div className="flex items-center gap-2">
                      {/* زر الرفض / طلب التعديل */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={reviewActionLoading}
                        onClick={() => handleReviewPrep('REJECT')}
                        className="text-caption font-bold text-status-danger border-status-danger/40 hover:bg-status-danger-soft"
                      >
                        طلب تعديل / رفض
                      </Button>

                      {/* زر الموافقة والاعتماد */}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={reviewActionLoading}
                        onClick={() => handleReviewPrep('APPROVE')}
                        className="text-caption font-bold bg-status-success hover:bg-status-success/90"
                      >
                        <Check className="w-3.5 h-3.5 ml-1" />
                        <span>موافقة على التحضير</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global TabBar */}
        <TabBar activeTab="plan" />
      </div>
    </ProtectedRoute>
  );
}
