'use client';

import React, { useState, useEffect } from 'react';
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
  [EventCategory.LITURGY_FEAST]: 'قداس / عيد كنسي',
  [EventCategory.SPIRITUAL_LESSON]: 'درس روحي / موضوع',
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

const DEFAULT_LESSONS = [
  {
    id: 'l1',
    title: 'مقدمة في سر الإفخارستيا والتناول المقدس',
    date: 'الجمعة 3 أكتوبر 2026',
    assignedServant: 'مينا سمير',
    status: 'DONE',
    week: 'الأسبوع 1',
  },
  {
    id: 'l2',
    title: 'رحلة الخروج وعناية الله في البرية',
    date: 'الجمعة 10 أكتوبر 2026',
    assignedServant: 'بيتر عادل',
    status: 'UPCOMING',
    week: 'الأسبوع 2',
  },
  {
    id: 'l3',
    title: 'فضيلة المحبة والاتضاع في حياة القديسين',
    date: 'الجمعة 17 أكتوبر 2026',
    assignedServant: 'كيرلس ناصر',
    status: 'UPCOMING',
    week: 'الأسبوع 3',
  },
  {
    id: 'l4',
    title: 'تاريخ الكنيسة: مجمع نيقية وقانون الإيمان',
    date: 'الجمعة 24 أكتوبر 2026',
    assignedServant: 'يوسف مجدي',
    status: 'UPCOMING',
    week: 'الأسبوع 4',
  },
];

export default function StagePlanPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
  const [activeSection, setActiveSection] = useState<'all' | 'lessons' | 'events'>('all');

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<YearPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<YearPlan | null>(null);

  // Add Event / التدبير Modal State (Level 3+)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>(EventCategory.SPIRITUAL_LESSON);
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventMaxVolunteers, setEventMaxVolunteers] = useState<number | ''>(2);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [volunteerActionLoading, setVolunteerActionLoading] = useState<string | null>(null);

  const canManagePlan = Boolean(user && user.role && user.role.level >= 3);

  // Fetch Year Plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/year-plans');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setPlans(res.data.data);
        // Load details of the first plan (stage plan)
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

  // Handle Create Event / إضافة تدبير
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    let planId = selectedPlan?.id;

    // If no plan exists yet, create one automatically for this stage
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
      });

      if (res.data?.success) {
        setIsAddEventOpen(false);
        setEventTitle('');
        setEventDesc('');
        setEventStartDate('');
        setEventEndDate('');
        setEventLocation('');
        setEventMaxVolunteers(2);
        setActionMessage({ type: 'success', text: 'تمت إضافة التدبير للخطة بنجاح!' });
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

  // Handle Volunteer Toggle
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

  const planEvents = selectedPlan?.events || [];

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-28">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Top Bar */}
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
                <h1 className="text-h2 font-bold text-text-primary">خطة ومنهج المرحلة</h1>
                <p className="text-caption text-text-secondary">
                  الخطة السنوية وتوزيع الدروس والأنشطة (FR-5.1)
                </p>
              </div>
            </div>

            <Badge variant="accent">
              {user?.scopes.stages[0]?.name || 'إعدادي بنين'}
            </Badge>
          </header>

          {/* Action Message Feedback */}
          {actionMessage && (
            <div
              className={cn(
                'p-3.5 rounded-card flex items-center gap-2 text-body-small border',
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

          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <Chip
              selected={selectedTerm === 'term1'}
              onClick={() => setSelectedTerm('term1')}
            >
              الترم الأول (خريف 2026)
            </Chip>
            <Chip
              selected={selectedTerm === 'term2'}
              onClick={() => setSelectedTerm('term2')}
            >
              الترم الثاني (ربيع 2027)
            </Chip>
          </div>

          {/* Theme Banner */}
          <section className="bg-brand-primary text-text-inverse rounded-card p-5 shadow-card flex flex-col gap-2.5 text-right relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-brand-accent/15 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-caption font-bold px-2 py-0.5 bg-brand-accent text-white rounded-pill">
                  شعار المرحلة لهذا العام
                </span>
                <Sparkles className="w-4 h-4 text-brand-accent" />
              </div>
              <h2 className="text-h2 font-bold text-white leading-tight">
                «أَمَّا أَنَا وَبَيْتِي فَنَعْبُدُ الرَّبَّ» (يش 24: 15)
              </h2>
              <p className="text-body-small text-brand-primary-soft leading-relaxed">
                الهدف السنوي: تعميق روح الانتماء للكنسية وبناء أسس روحية متينة لكل مخدوم في المرحلة.
              </p>
            </div>
          </section>

          {/* Supervisor Action Bar: إضافة تدبير للخطة */}
          {canManagePlan && (
            <div className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex items-center justify-between">
              <div>
                <h3 className="text-body-small font-bold text-text-primary">
                  إدارة تدابير وفعاليات الخطة
                </h3>
                <p className="text-[11px] text-text-secondary">
                  بصفتك أمين الخدمة، يمكنك جدولة الدروس والأنشطة
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddEventOpen(true)}
                className="gap-1.5 font-bold h-9 px-3 text-caption"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تدبير</span>
              </Button>
            </div>
          )}

          {/* Section Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={cn(
                'flex-1 py-1.5 rounded-pill text-caption font-semibold transition-all border text-center',
                activeSection === 'all'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-bg-surface text-text-secondary border-border-default hover:text-text-primary'
              )}
            >
              الكل ({DEFAULT_LESSONS.length + planEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('events')}
              className={cn(
                'flex-1 py-1.5 rounded-pill text-caption font-semibold transition-all border text-center',
                activeSection === 'events'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-bg-surface text-text-secondary border-border-default hover:text-text-primary'
              )}
            >
              التدابير والأنشطة ({planEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('lessons')}
              className={cn(
                'flex-1 py-1.5 rounded-pill text-caption font-semibold transition-all border text-center',
                activeSection === 'lessons'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-bg-surface text-text-secondary border-border-default hover:text-text-primary'
              )}
            >
              منهج الدروس ({DEFAULT_LESSONS.length})
            </button>
          </div>

          {/* 1. Real Plan Events / التدابير */}
          {(activeSection === 'all' || activeSection === 'events') && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h2 font-bold text-text-primary flex items-center gap-2">
                  <CalendarCheck2 className="w-5 h-5 text-brand-primary" />
                  <span>تدابير وأنشطة الخطة السنوية</span>
                </h2>
                <span className="text-caption text-text-secondary">
                  {planEvents.length} تدبير مسجل
                </span>
              </div>

              {loading ? (
                <div className="text-center py-6 text-text-secondary">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full mb-1.5" />
                  <p className="text-caption">جارٍ تحميل تدابير الخطة...</p>
                </div>
              ) : planEvents.length === 0 ? (
                <div className="p-5 bg-bg-surface border border-dashed border-border-default rounded-card text-center flex flex-col items-center gap-2">
                  <Calendar className="w-8 h-8 text-text-tertiary" />
                  <p className="text-body-small text-text-secondary">
                    لا توجد تدابير أو فعاليات مضافة بعد في هذه الخطة
                  </p>
                  {canManagePlan && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddEventOpen(true)}
                      className="font-semibold text-caption mt-1"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      <span>إضافة أول تدبير للخطة</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {planEvents.map((evt) => {
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
                        className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col gap-2.5 hover:border-brand-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-brand-primary-soft text-brand-primary">
                            {EVENT_CATEGORY_ARABIC[evt.category] || evt.category}
                          </span>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3 text-text-secondary" />
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
                              الخدام المتطوعين: {evt.volunteers.length}
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

          {/* 2. Curriculum Lessons List */}
          {(activeSection === 'all' || activeSection === 'lessons') && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h2 font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-primary" />
                  <span>جدول الدروس والمنهج</span>
                </h2>
                <span className="text-caption text-text-secondary">
                  {DEFAULT_LESSONS.length} دروس مجدولة
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {DEFAULT_LESSONS.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold text-brand-primary">
                        {lesson.week}
                      </span>
                      {lesson.status === 'DONE' ? (
                        <Badge variant="success" withDot>
                          تم إلقاؤه
                        </Badge>
                      ) : (
                        <Badge variant="neutral" withDot>
                          قادم
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-body-default font-bold text-text-primary">
                      {lesson.title}
                    </h3>

                    <div className="flex items-center justify-between text-caption text-text-secondary pt-2 border-t border-border-default mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                        {lesson.date}
                      </span>
                      <span className="font-medium text-text-primary">
                        الخادم المسئول: {lesson.assignedServant}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Modal: إضافة تدبير للخطة السنوية */}
        {isAddEventOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-md p-5 shadow-elevated text-right space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div>
                  <h3 className="text-h2 font-bold text-text-primary">
                    إضافة تدبير جديد للخطة
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    جدولة درس روحي، قداس، رحلة، مؤتمر أو نشاط للمرحلة
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
                    عنوان التدبير / الدرس *
                  </label>
                  <Input
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="مثال: مؤتمر العقيدة والشباب أو درس الإفخارستيا..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    نوع وتصنيف التدبير *
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as EventCategory)}
                    className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {Object.values(EventCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {EVENT_CATEGORY_ARABIC[cat] || cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      تاريخ البدء *
                    </label>
                    <Input
                      type="date"
                      required
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-caption font-semibold text-text-secondary block mb-1">
                      تاريخ الانتهاء
                    </label>
                    <Input
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    مكان التدبير / القاعة (اختياري)
                  </label>
                  <Input
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="مثال: كنيسة مارمرقس، أو بيت المؤتمرات بالكنج..."
                  />
                </div>

                {/* Max Volunteers */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    عدد الخدام المتطوعين المطلوبين (اختياري)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={eventMaxVolunteers}
                    onChange={(e) => setEventMaxVolunteers(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="2"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    وصف التدبير والأهداف (اختياري)
                  </label>
                  <textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    rows={2}
                    placeholder="اكتب أهداف التدبير أو الملاحظات الخاصة بالخدام..."
                    className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border-default">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={createEventLoading}
                    className="h-[40px] font-semibold text-caption"
                  >
                    حفظ وإضافة التدبير
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    disabled={createEventLoading}
                    onClick={() => setIsAddEventOpen(false)}
                    className="h-[40px] text-text-secondary hover:text-text-primary text-caption"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="plan" />
      </div>
    </ProtectedRoute>
  );
}
