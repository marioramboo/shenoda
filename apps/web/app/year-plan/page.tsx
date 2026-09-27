'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import {
  CalendarCheck2,
  Calendar,
  Users,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  Send,
  Shield,
  ChevronLeft,
} from 'lucide-react';
import {
  EventCategory,
  EVENT_CATEGORY_ARABIC,
  EVENT_CATEGORY_COLORS,
} from '@shenoda/shared';

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

interface ServantPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    fullName: string;
  };
  stage?: {
    id: string;
    name: string;
  };
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
  servantPosts?: ServantPost[];
  _count?: {
    events: number;
    servantPosts: number;
  };
}

type SemesterTab = 'TERM_1' | 'TERM_2' | 'SUMMER';

export default function YearPlanPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<YearPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<YearPlan | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<SemesterTab>('TERM_1');

  // New Plan Modal (Level 3+)
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanYear, setNewPlanYear] = useState('2026-2027');
  const [newPlanScope, setNewPlanScope] = useState('STAGE');
  const [newPlanStageId, setNewPlanStageId] = useState('');
  const [createPlanLoading, setCreatePlanLoading] = useState(false);

  // New Servant Post Modal (FR-7.4)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [createPostLoading, setCreatePostLoading] = useState(false);

  // New Event Modal (Level 3+)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>(EventCategory.SPIRITUAL_LESSON);
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventMaxVolunteers, setEventMaxVolunteers] = useState<number | ''>(2);
  const [createEventLoading, setCreateEventLoading] = useState(false);

  // Volunteer action state
  const [volunteerActionLoading, setVolunteerActionLoading] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/year-plans');
      if (res.data?.success && res.data.data.length > 0) {
        setPlans(res.data.data);
        // Load details of first plan
        loadPlanDetail(res.data.data[0].id);
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
      if (res.data?.success) {
        setSelectedPlan(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load plan detail:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatePlanLoading(true);
      const stageToUse = newPlanStageId || user?.scopes.stages[0]?.id;
      const res = await api.post('/api/v1/year-plans', {
        title: newPlanTitle,
        academicYear: newPlanYear,
        scopeType: newPlanScope,
        stageId: newPlanScope === 'STAGE' ? stageToUse : undefined,
        isPublished: true,
      });

      if (res.data?.success) {
        setIsCreatePlanOpen(false);
        setNewPlanTitle('');
        await fetchPlans();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل في إنشاء الخطة');
    } finally {
      setCreatePlanLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setCreatePostLoading(true);
      const res = await api.post(`/api/v1/year-plans/${selectedPlan.id}/servant-posts`, {
        title: postTitle,
        content: postContent,
        stageId: user?.scopes.stages[0]?.id,
      });

      if (res.data?.success) {
        setIsCreatePostOpen(false);
        setPostTitle('');
        setPostContent('');
        await loadPlanDetail(selectedPlan.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل في نشر التنويه');
    } finally {
      setCreatePostLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setCreateEventLoading(true);
      const res = await api.post(`/api/v1/year-plans/${selectedPlan.id}/events`, {
        title: eventTitle,
        description: eventDesc || undefined,
        category: eventCategory,
        startDate: eventStartDate,
        endDate: eventEndDate || eventStartDate,
        location: eventLocation || undefined,
        maxVolunteers: eventMaxVolunteers ? Number(eventMaxVolunteers) : undefined,
      });

      if (res.data?.success) {
        setIsCreateEventOpen(false);
        setEventTitle('');
        setEventDesc('');
        setEventStartDate('');
        setEventEndDate('');
        setEventLocation('');
        await loadPlanDetail(selectedPlan.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل في إضافة الفعالية');
    } finally {
      setCreateEventLoading(false);
    }
  };

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

  const handleTabChange = (tab: string) => {
    if (tab === 'dashboard') router.push('/dashboard');
    else if (tab === 'members') router.push('/members');
    else if (tab === 'attendance') router.push('/attendance');
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-28">
        <div className="w-full max-w-[480px] flex flex-col gap-4">

          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center font-bold">
                <CalendarCheck2 className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="text-right">
                <h1 className="text-body-default font-bold text-text-primary">
                  تدبير السنة والمنهج
                </h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  الخطة السنوية والتقويم الكنسي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/calendar')}
                className="text-caption font-semibold gap-1 h-8 px-2.5"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                <span>النتيجة</span>
              </Button>

              {user && user.role.level >= 3 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatePlanOpen(true)}
                  className="text-caption font-semibold gap-1 h-8 px-2.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>خطة جديدة</span>
                </Button>
              )}
            </div>
          </header>

          {/* Plan Selector & Academic Year Badge */}
          {plans.length > 0 ? (
            <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-text-secondary">
                  الخطة السنوية النشطة:
                </span>
                <Badge variant="accent">
                  {selectedPlan?.academicYear || '2026-2027'}
                </Badge>
              </div>

              {plans.length > 1 && (
                <select
                  value={selectedPlan?.id || ''}
                  onChange={(e) => loadPlanDetail(e.target.value)}
                  className="h-10 px-3 rounded-button border border-border-default bg-bg-surface text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.stage?.name || 'عام'})
                    </option>
                  ))}
                </select>
              )}

              <h2 className="text-h2 font-bold text-brand-primary">
                {selectedPlan?.title}
              </h2>
            </div>
          ) : (
            <div className="p-8 bg-bg-surface border border-dashed border-border-default rounded-card text-center flex flex-col items-center gap-2 text-right">
              <CalendarCheck2 className="w-8 h-8 text-brand-primary/50" />
              <p className="text-body-default font-bold text-text-primary">
                لا توجد خطط سنوية منشورة حالياً
              </p>
              <p className="text-caption text-text-secondary">
                يمكن لأمناء الخدمة تدبير ونشر خطة المرحلة السنوية هنا.
              </p>
            </div>
          )}

          {/* Semester Tabs */}
          <div className="flex items-center bg-bg-surface border border-border-default rounded-pill p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedSemester('TERM_1')}
              className={`flex-1 py-1.5 text-caption font-semibold rounded-pill transition-all ${
                selectedSemester === 'TERM_1'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              الترم الأول
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('TERM_2')}
              className={`flex-1 py-1.5 text-caption font-semibold rounded-pill transition-all ${
                selectedSemester === 'TERM_2'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              الترم الثاني
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester('SUMMER')}
              className={`flex-1 py-1.5 text-caption font-semibold rounded-pill transition-all ${
                selectedSemester === 'SUMMER'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              أنشطة الصيف
            </button>
          </div>

          {/* Curriculum & Events Timeline */}
          <section className="flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-h2 font-bold text-text-primary">
                جدول الدروس والفعاليات
              </h3>
              {user && user.role.level >= 3 && selectedPlan && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateEventOpen(true)}
                  className="text-caption font-semibold h-7 px-2 gap-1 text-brand-primary border-brand-primary/40"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة درس / فعالية</span>
                </Button>
              )}
            </div>

            {selectedPlan?.events && selectedPlan.events.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedPlan.events.map((ev) => {
                  const isVolunteered = ev.volunteers.some((v) => v.userId === user?.id);
                  const isCapacityFull =
                    ev.maxVolunteers !== null &&
                    ev.volunteers.length >= ev.maxVolunteers &&
                    !isVolunteered;

                  return (
                    <div
                      key={ev.id}
                      className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 transition-all hover:border-brand-primary/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-bold text-brand-primary bg-brand-primary-soft px-2.5 py-0.5 rounded-pill border border-[#D5E1F0]">
                          {new Date(ev.startDate).toLocaleDateString('ar-EG', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>

                        <Badge
                          variant="neutral"
                          style={{
                            borderColor: EVENT_CATEGORY_COLORS[ev.category],
                            color: EVENT_CATEGORY_COLORS[ev.category],
                          }}
                        >
                          {EVENT_CATEGORY_ARABIC[ev.category] || ev.category}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-body-default font-bold text-text-primary leading-snug">
                          {ev.title}
                        </h4>
                        {ev.description && (
                          <p className="text-caption text-text-secondary mt-1 leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                      </div>

                      {ev.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                          <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                          <span>المكان: {ev.location}</span>
                        </div>
                      )}

                      {/* Volunteers & Action Row */}
                      <div className="pt-2 border-t border-border-default flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-text-secondary" />
                          <span className="text-[11px] text-text-secondary font-medium">
                            المتطوعين: {ev.volunteers.length}
                            {ev.maxVolunteers ? ` / ${ev.maxVolunteers}` : ''}
                          </span>
                        </div>

                        <Button
                          variant={isVolunteered ? 'outline' : 'primary'}
                          size="sm"
                          disabled={isCapacityFull || volunteerActionLoading === ev.id}
                          isLoading={volunteerActionLoading === ev.id}
                          onClick={() => handleVolunteerToggle(ev)}
                          className={`text-caption font-semibold h-7 px-3 ${
                            isVolunteered
                              ? 'text-status-danger border-[#F5C2BE] hover:bg-status-danger-soft'
                              : ''
                          }`}
                        >
                          {isVolunteered ? 'إلغاء التطوع' : isCapacityFull ? 'مكتمل' : 'تطوع بالخدمة'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-bg-surface border border-dashed border-border-default rounded-card text-center text-caption text-text-secondary">
                لا توجد دروس أو فعاليات مسجلة لهذا الفصل الدراسي.
              </div>
            )}
          </section>

          {/* Stage Servants Bulletin (FR-7.4) */}
          <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-accent" />
                <h3 className="text-h2 font-bold text-text-primary">
                  تحديثات وتنويهات خدام المرحلة
                </h3>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreatePostOpen(true)}
                className="text-caption font-semibold h-7 px-2 gap-1 text-brand-primary"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة تنويه</span>
              </Button>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              تنويهات وملاحظات داخلية خاصة بخدام المرحلة، معزولة تماماً ولا تعدل الخطة الكنسية الرسمية.
            </p>

            {selectedPlan?.servantPosts && selectedPlan.servantPosts.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {selectedPlan.servantPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 bg-bg-app rounded-lg border border-border-default flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body-small font-bold text-text-primary">
                        {post.title}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {new Date(post.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <p className="text-caption text-text-secondary leading-relaxed">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-brand-primary font-medium">
                      <span>الخادم: {post.author?.fullName || 'خادم'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-bg-app rounded-lg text-center text-caption text-text-secondary">
                لا توجد تنويهات خاصة بالمرحلة حالياً.
              </div>
            )}
          </section>

          {/* Modal: Create Year Plan (Level 3+) */}
          {isCreatePlanOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-[420px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setIsCreatePlanOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h3 className="text-h2 font-bold text-brand-primary">تدبير خطة سنوية جديدة</h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    إعداد المنهج الكنسي والفعاليات السنوية
                  </p>
                </div>

                <form onSubmit={handleCreatePlan} className="flex flex-col gap-3.5">
                  <Input
                    label="عنوان الخطة"
                    placeholder="مثال: تدبير خدمة إعدادي بنين 2026 / 2027"
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    required
                  />

                  <Input
                    label="السنة الدراسية"
                    placeholder="2026-2027"
                    value={newPlanYear}
                    onChange={(e) => setNewPlanYear(e.target.value)}
                    required
                  />

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={createPlanLoading}
                      className="flex-1 font-semibold"
                    >
                      نشر وتفعيل الخطة
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatePlanOpen(false)}
                      className="px-4"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Create Servant Post (FR-7.4) */}
          {isCreatePostOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-[420px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setIsCreatePostOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h3 className="text-h2 font-bold text-brand-primary">إضافة تنويه لخدام المرحلة</h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    تنويه معزول خاص بزملائك في مرحلة ({user?.scopes.stages[0]?.name})
                  </p>
                </div>

                <form onSubmit={handleCreatePost} className="flex flex-col gap-3.5">
                  <Input
                    label="عنوان التنويه"
                    placeholder="مثال: توزيع هدايا العيد"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-caption font-semibold text-text-primary">
                      تفاصيل التنويه
                    </label>
                    <textarea
                      rows={4}
                      placeholder="اكتب التنويه أو التعليمات الموجهة لخدام مرحلتك..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      required
                      className="p-3 rounded-button border border-border-default bg-bg-surface text-body-default text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={createPostLoading}
                      className="flex-1 font-semibold gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>نشر التنويه</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatePostOpen(false)}
                      className="px-4"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Create Event (Level 3+) */}
          {isCreateEventOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-[420px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h3 className="text-h2 font-bold text-brand-primary">إضافة فعالية / درس للخطة</h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    إدراج درس أو نشاط في تدبير السنة
                  </p>
                </div>

                <form onSubmit={handleCreateEvent} className="flex flex-col gap-3.5">
                  <Input
                    label="عنوان الفعالية / موضوع الدرس"
                    placeholder="مثال: مثل الابن الضال"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-caption font-semibold text-text-primary">
                      التصنيف
                    </label>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as EventCategory)}
                      className="h-11 px-3 rounded-button border border-border-default bg-bg-surface text-body-default text-text-primary focus:outline-none focus:border-brand-primary"
                    >
                      {Object.values(EventCategory).map((cat) => (
                        <option key={cat} value={cat}>
                          {EVENT_CATEGORY_ARABIC[cat]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="تاريخ ووقت البدء"
                    type="datetime-local"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    required
                  />

                  <Input
                    label="المكان (اختياري)"
                    placeholder="مثال: قاعة الكنيسة الكبرى"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                  />

                  <Input
                    label="الحد الأقصى للمتطوعين"
                    type="number"
                    min={1}
                    value={eventMaxVolunteers}
                    onChange={(e) => setEventMaxVolunteers(e.target.value ? Number(e.target.value) : '')}
                  />

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={createEventLoading}
                      className="flex-1 font-semibold"
                    >
                      إضافة الفعالية
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateEventOpen(false)}
                      className="px-4"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* TabBar */}
        <TabBar activeTab="plan" onTabChange={handleTabChange} />
      </div>
    </ProtectedRoute>
  );
}
